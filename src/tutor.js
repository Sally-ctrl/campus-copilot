import { model, cloudModel } from "./ai.js";
import { readPdf } from "./summary.js";

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

// Ask the tutor: answers from your saved summaries, on your laptop.
export async function askTutor(question, contextItems, history = []) {
  const notes = contextItems
    .filter((x) => x.summary)
    .map((x) => `=== ${x.title} ===\n${x.summary}`)
    .join("\n\n")
    .slice(0, 6000);
  const past = history
    .slice(-2)
    .map((h) => `Student: ${h.q}\nTutor: ${h.a}`)
    .join("\n");

  const prompt = `You are a friendly, clear university tutor. Explain simply, with a short example if it helps.
Use the course notes below. If the notes don't cover it, say so and give a general explanation.
Keep it under 150 words. Plain text, "- " bullets allowed, no markdown symbols.

COURSE NOTES:
${notes || "(no summaries yet)"}

${past ? "EARLIER IN THIS CONVERSATION:\n" + past + "\n" : ""}
Student: ${question}
Tutor:`;
  const result = await model.generateContent(prompt);
  return { answer: result.response.text().trim(), source: result.response.inferenceSource ?? null };
}
