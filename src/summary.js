import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { model, cloudModel, withTimeout, nanoAvailable } from "./ai.js";

// pdf.js reads the PDF on your laptop (no AI, no upload).
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const NANO_MAX_CHARS = 5000;    // short, text-only lectures stay on Nano
const CLOUD_MAX_CHARS = 60000;
const MAX_DIAGRAMS = 12;        // cap on slide images sent to the cloud
const IMAGE_WIDTH = 900;        // px; enough to read a circuit or FSM

// 1) Download the PDF with your CMS login.
// 2) On the laptop: pull out the text, and turn diagram slides into small images.
// 3) Summarize: Nano if it's short and has no diagrams, otherwise Gemini in the cloud.
// `source` is a CMS link, or { blob } for a PDF you uploaded yourself.
// Downloads (or loads) a PDF and reads it on your laptop: slide text + diagram slides as images.
// Used by summaries and by the tutor. `source` is a CMS link or { blob } for an upload.
export async function readPdf(source, onStep) {
  let data;
  if (typeof source === "string") {
    onStep?.("Downloading PDF...");
    const res = await withTimeout(fetch(source, { credentials: "include" }), 30000, "PDF download");
    if (!res.ok) throw new Error(`Couldn't download the PDF (${res.status}).`);
    data = new Uint8Array(await res.arrayBuffer());
  } else {
    data = new Uint8Array(await source.blob.arrayBuffer());
  }
  onStep?.("Reading slides on your laptop...");
  const { slides, diagrams } = await readSlides(data, onStep);
  return { text: slides.join("\n"), diagrams };
}

export async function summarizePdf(source, { course, title, onStep } = {}) {
  const { text, diagrams } = await readPdf(source, onStep);

  const prompt = `This is "${title}" from university course ${course ?? ""}: the slide text, plus images of the slides that contain diagrams.
Write for a student revising for a quiz. Plain text: no markdown, no backticks, only "- " bullets.

Start with exactly these two lines:
DIFFICULTY: Easy, Medium or Hard (for a typical student in this course)
STUDY TIME: estimated minutes to study this lecture well, as a number (e.g. 45)
Use the diagrams too (circuits, state machines, timing diagrams, tables) and mention them where they matter.

SUMMARY
- 5 to 7 bullets with the main ideas, short and clear.

LIKELY QUIZ TOPICS
- 3 to 5 bullets: what a quiz on this lecture would most likely ask.

SLIDE TEXT:
${text.slice(0, CLOUD_MAX_CHARS)}`;

  // Short, text-only lecture and Nano is ready: stay fully on-device.
  if (!diagrams.length && text.length <= NANO_MAX_CHARS && (await nanoAvailable())) {
    onStep?.("Summarizing on your laptop (Nano)...");
    const result = await model.generateContent(prompt);
    return { ...parseSummary(result.response.text()), source: "on_device" };
  }

  // Otherwise: text + diagram images to the cloud.
  const parts = [prompt];
  for (const d of diagrams) {
    parts.push(`Slide ${d.page} (diagram):`);
    parts.push({ inlineData: { mimeType: "image/jpeg", data: d.jpeg } });
  }
  const kb = Math.round((text.length + diagrams.reduce((n, d) => n + d.jpeg.length, 0)) / 1024);
  const result = await cloudModel.generateContent(parts, {
    onModel: (name) =>
      onStep?.(`Asking ${name} (${diagrams.length} diagram${diagrams.length === 1 ? "" : "s"}, ${kb} KB)...`),
  });
  return { ...parseSummary(result.response.text()), source: "in_cloud" };
}

// Reads every slide's text, then picks the slides that look most like diagrams
// and renders only those to JPEGs.
async function readSlides(data, onStep) {
  // isEvalSupported: false because Chrome extensions block eval().
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const slides = [];
  const scored = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
    if (line) slides.push(`Slide ${i}: ${line}`);
    scored.push({ page: i, score: await diagramScore(page, line.length) });
  }

  const picked = scored
    .filter((s) => s.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_DIAGRAMS)
    .sort((a, b) => a.page - b.page);

  const diagrams = [];
  for (const { page: n } of picked) {
    onStep?.(`Preparing diagram slides (${diagrams.length + 1}/${picked.length})...`);
    diagrams.push({ page: n, jpeg: await renderJpeg(await pdf.getPage(n)) });
  }
  return { slides, diagrams };
}

// Higher = more diagram-like: lots of drawn lines/shapes, big pictures, little text.
// Small images (logos) don't count.
async function diagramScore(page, textLength) {
  const { width, height } = page.getViewport({ scale: 1 });
  const pageArea = width * height;
  const ops = await page.getOperatorList();
  let paths = 0;
  let bigImages = 0;
  let lastTransform = null;

  ops.fnArray.forEach((fn, k) => {
    if (fn === pdfjs.OPS.transform) lastTransform = ops.argsArray[k];
    else if (fn === pdfjs.OPS.constructPath) paths++;
    else if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
      const [a, , , d] = lastTransform ?? [0, 0, 0, 0];
      if (Math.abs(a * d) > 0.15 * pageArea) bigImages++;
    }
  });

  return paths + 40 * bigImages - textLength / 25;
}

// Slide -> small JPEG (base64, no "data:" prefix).
async function renderJpeg(page) {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: IMAGE_WIDTH / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
}

// Pulls the DIFFICULTY and STUDY TIME lines out of the answer.
function parseSummary(text) {
  const difficulty = text.match(/DIFFICULTY:\s*(Easy|Medium|Hard)/i)?.[1] ?? null;
  const minutes = Number(text.match(/STUDY TIME:\D*(\d+)/i)?.[1]) || null;
  const summary = text
    .replace(/^.*DIFFICULTY:.*$/im, "")
    .replace(/^.*STUDY TIME:.*$/im, "")
    .replace(/`/g, "")
    .trim();
  return {
    summary,
    difficulty: difficulty && difficulty[0].toUpperCase() + difficulty.slice(1).toLowerCase(),
    minutes,
  };
}
