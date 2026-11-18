import { model, cloudModel } from "./ai.js";
import { readPdf, openPdf, slideImage } from "./summary.js";

// ---------------------------------------------------------------------------
// Mock quiz (cloud): written from the lectures it covers, in the style of the
// course's own practice assignments / sample quizzes.
// Grading (laptop): multiple choice is checked in code; written answers by Nano.
// Ask the tutor (laptop): Nano answers from your saved summaries.
// ---------------------------------------------------------------------------

const MAX_TEXT_PER_ITEM = 12000;
const MAX_DIAGRAMS_TOTAL = 6;
const STYLE_CHARS = 5000;

// Practice assignments / sample quizzes / past exams show how this TA asks questions.
export function styleExamples(items, course) {
  return items
    .filter(
      (x) =>
        x.course === course &&
        (x.link || x.localFile) &&
        /practice|assignment|sample quiz|quiz|midterm|final|exam|sheet/i.test(`${x.title} ${x.type}`) &&
        !/solution|answer/i.test(`${x.title} ${x.type}`)
    )
    .slice(0, 2);
}

export async function makeMockQuiz({ course, targets, style, count = 8, sourceOf, onStep }) {
  const parts = [];
  let diagramsLeft = MAX_DIAGRAMS_TOTAL;
  const material = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    onStep?.(`Reading ${t.title} (${i + 1}/${targets.length}) on your laptop...`);
    const { text, diagrams } = await readPdf(await sourceOf(t));
    material.push(`=== ${t.title} ===\n${text.slice(0, MAX_TEXT_PER_ITEM)}`);
    for (const d of diagrams.slice(0, diagramsLeft)) {
      parts.push(`${t.title}, slide ${d.page} (diagram):`, { inlineData: { mimeType: "image/jpeg", data: d.jpeg } });
      diagramsLeft--;
    }
  }

  const styleText = [];
  for (const s of style) {
    onStep?.(`Reading ${s.title} to copy the TA's style...`);
    try {
      const { text } = await readPdf(await sourceOf(s));
      styleText.push(`=== ${s.title} ===\n${text.slice(0, STYLE_CHARS)}`);
    } catch {
      // a style example failing is fine; we just skip it
    }
  }

  const prompt = `You are a TA for university course ${course}. Write a mock quiz of ${count} NEW questions on the lecture material below.
${styleText.length ? "Match the STYLE of the course's own practice questions shown under STYLE EXAMPLES (wording, notation, kind of tasks, difficulty). Do not copy them." : ""}
Mix: about 60% multiple choice (4 options), 40% short written answers. Mix easy, medium and hard.
Use the diagrams where useful (e.g. "In the state diagram of slide 8...").

Reply with ONLY a JSON array. Each question:
{"q": string, "type": "mcq" | "short", "options": [4 strings] or null,
 "answer": the correct option text (mcq) or a model answer (short),
 "explain": one or two sentences why,
 "source": where it comes from, like "Lecture 9, slide 8",
 "difficulty": "easy" | "medium" | "hard"}

LECTURE MATERIAL:
${material.join("\n\n")}

${styleText.length ? "STYLE EXAMPLES:\n" + styleText.join("\n\n") : ""}`;

  const result = await cloudModel.generateContent([prompt, ...parts], {
    onModel: (name) => onStep?.(`Writing your quiz with ${name}...`),
  });
  const text = result.response.text();
  const arr = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
  return arr
    .filter((x) => x?.q && x?.answer)
    .map((x) => ({ ...x, type: x.options?.length ? "mcq" : "short" }));
}

// Written answers are graded on your laptop by Nano (falls back to cloud if Nano isn't there).
export async function gradeShort(question, studentAnswer) {
  const prompt = `Grade a student's answer.
Question: ${question.q}
Model answer: ${question.answer}
Student answer: ${studentAnswer}
Be fair: accept answers that mean the same thing in other words.
Reply with ONLY JSON: {"correct": true or false, "feedback": one short sentence}`;
  const result = await model.generateContent(prompt);
  const t = result.response.text();
  try {
    const out = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
    return { ...out, source: result.response.inferenceSource ?? null };
  } catch {
    return { correct: false, feedback: "Couldn't grade that one automatically; compare with the model answer.", source: null };
  }
}

// ---------------------------------------------------------------------------
// Tutor chat: finds the most relevant slides on your laptop, answers from them,
// and returns which slides it used so we can show them as pictures.
// Text questions -> Nano (laptop). Questions with a photo -> cloud (reads images better).
// ---------------------------------------------------------------------------

const STOP = new Set("the and for are was what how why when which with from that this does into about can you your have has explain show tell give me is of to in on a an it be do".split(" "));
const words = (s) => (s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w));

const docCache = new Map(); // item id -> { pdf, pages }

export async function loadDocs(targets, sourceOf, onStep) {
  const docs = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (!docCache.has(t.id)) {
      onStep?.(`Opening ${t.title} on your laptop (${i + 1}/${targets.length})...`);
      docCache.set(t.id, await openPdf(await sourceOf(t)));
    }
    docs.push({ item: t, ...docCache.get(t.id) });
  }
  return docs;
}

// Simple keyword match: which slides share the most words with the question?
function topSlides(docs, question, k = 4) {
  const q = words(question);
  const scored = [];
  docs.forEach((d, f) => {
    for (const p of d.pages) {
      if (!p.text) continue;
      const pw = words(p.text);
      const set = new Set(pw);
      const hits = q.filter((w) => set.has(w)).length;
      if (hits) scored.push({ f, n: p.n, score: hits + hits / Math.sqrt(pw.length + 1) });
    }
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}

export async function chatTutor({ question, photo, docs, history = [] }) {
  const hits = topSlides(docs, question || "diagram");
  const context = hits
    .map((h) => `[F${h.f + 1} p${h.n}] (${docs[h.f].item.title}, slide ${h.n}): ${docs[h.f].pages[h.n - 1].text}`)
    .join("\n")
    .slice(0, photo ? 12000 : 4500);
  const files = docs.map((d, i) => `F${i + 1} = ${d.item.title}`).join(", ");
  const past = history.slice(-2).map((h) => `Student: ${h.q}\nTutor: ${h.a}`).join("\n");

  const prompt = `You are a friendly, clear university tutor. Explain simply, with a short example if it helps. Under 150 words.
Use the SLIDES below (files: ${files}). ${photo ? "The student also sent a photo (attached): read it carefully, and if it's their work, say what is right and what is wrong." : ""}
If the slides don't cover it, say so and give a general explanation.
Reply with ONLY JSON: {"answer": plain text (no markdown, "- " bullets ok), "refs": ["F1 p8", ...] the slides you used or that show the relevant diagram (max 3)}

SLIDES:
${context || "(no matching slides found)"}
${past ? "\nEARLIER IN THIS CHAT:\n" + past : ""}
Student: ${question || "(see the photo)"}`;

  let result, source;
  if (photo) {
    const parts = [prompt, { inlineData: { mimeType: "image/jpeg", data: photo } }];
    // Also show the cloud the top 2 matching slides as pictures (diagrams matter).
    for (const h of hits.slice(0, 2)) {
      const img = await slideImage(docs[h.f].pdf, h.n);
      parts.push(`Slide F${h.f + 1} p${h.n}:`, { inlineData: { mimeType: "image/jpeg", data: img.split(",")[1] } });
    }
    result = await cloudModel.generateContent(parts);
    source = "in_cloud";
  } else {
    result = await model.generateContent(prompt);
    source = result.response.inferenceSource ?? "on_device";
  }

  const raw = result.response.text();
  let answer = raw.trim();
  let refs = [];
  try {
    const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    answer = j.answer ?? answer;
    refs = (j.refs ?? []).map((r) => String(r).match(/F(\d+)\s*p(\d+)/i)).filter(Boolean).map((m) => ({ f: +m[1] - 1, n: +m[2] }));
  } catch {
    // not JSON: show the text as-is, and fall back to the best-matching slide
  }
  if (!refs.length && hits.length) refs = [{ f: hits[0].f, n: hits[0].n }];
  refs = refs.filter((r) => docs[r.f] && r.n >= 1 && r.n <= docs[r.f].pages.length).slice(0, 3);
  return { answer, refs, source };
}

export { slideImage };
