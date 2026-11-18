import { model } from "./ai.js";

// Nano's input limit is ~9k tokens, so long pages are split into chunks.
const CHUNK_CHARS = 5000;
const MAX_CHUNKS = 8;

function buildPrompt(chunk, course, group) {
  const today = new Date().toISOString().slice(0, 10);
  return `Today is ${today}. This text is from a university course page${course ? ` for course ${course}` : ""}.
List the items in it as a JSON array. Each item:
{"title": string,
 "kind": "deadline" or "coursework",
 "type": "quiz" | "exam" | "assignment" | "project" | "lecture" | "tutorial" | "lab" | "other",
 "date": "YYYY-MM-DD" or null,
 "time": "HH:MM" (24h) or null,
 "details": short string or null}

Rules:
- "deadline" = a graded event with a date: quiz, midterm, final exam, graded assignment or project submission.
- "coursework" = course material: lectures, tutorials, practice assignments, labs, slides, files. Use its week/posting date if shown.
- Practice assignments and tutorial sheets are coursework, not deadlines.
- If a date has no year, pick the year that makes it closest to today.
${group ? `- The student is in tutorial group ${group}. If times or halls differ per group, use ONLY the slot for ${group} and put the hall in "details".` : ""}
- Reply with ONLY the JSON array. If nothing, reply [].

TEXT:
${chunk}`;
}

// Extracts items from one page's text. Returns { items, source }.
export async function extractItems(pageText, { course, group, onChunk } = {}) {
  const chunks = [];
  for (let i = 0; i < pageText.length && chunks.length < MAX_CHUNKS; i += CHUNK_CHARS) {
    chunks.push(pageText.slice(i, i + CHUNK_CHARS));
  }

  const items = [];
  let source = null;
  for (let i = 0; i < chunks.length; i++) {
    onChunk?.(i + 1, chunks.length);
    const result = await model.generateContent(buildPrompt(chunks[i], course, group));
    source = result.response.inferenceSource ?? source;
    for (const it of parseJsonArray(result.response.text())) {
      items.push({ ...it, course: course ?? it.course ?? null });
    }
  }
  return { items, source };
}

// GUC course pages show the code like "(|CSEN605|)".
export function detectCourse(text) {
  const m = text.match(/\(\|\s*([A-Z]{2,5}\s?\d{3})\s*\|\)/);
  return m ? m[1].replace(/\s/g, "") : null;
}

// Models sometimes wrap JSON in ```json fences or add extra words.
function parseJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr) ? arr.filter((x) => x && x.title) : [];
  } catch {
    return [];
  }
}
