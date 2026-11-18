import { model } from "./ai.js";

// Nano's input limit is ~9k tokens; announcements are usually short.
const MAX_CHARS = 6000;

function buildPrompt(text, course, group) {
  const today = new Date().toISOString().slice(0, 10);
  return `Today is ${today}. These are announcements from university course ${course ?? ""}.
List ONLY graded events with a date: quizzes, midterms, finals, exams, project or assignment submissions.
Ignore office hours, materials, lectures and general info.
Reply with ONLY a JSON array. Each item:
{"title": string, "type": "quiz" | "exam" | "assignment" | "project" | "other",
 "date": "YYYY-MM-DD" or null, "time": "HH:MM" (24h, start time) or null, "details": short string or null}
- If a date has no year, pick the year that makes it closest to today.
${group ? `- The student is in tutorial group ${group}. If times or halls differ per group, use ONLY the slot for ${group} and put the hall in "details".` : ""}
- If nothing qualifies, reply [].

ANNOUNCEMENTS:
${text.slice(0, MAX_CHARS)}`;
}

// AI step: announcements text -> deadline items. Returns { items, source }.
export async function extractDeadlines(text, { course, group } = {}) {
  if (!text.trim()) return { items: [], source: null };
  const result = await model.generateContent(buildPrompt(text, course, group));
  const items = parseJsonArray(result.response.text()).map((it) =>
    fixDate({ ...it, kind: "deadline", course })
  );
  return { items, source: result.response.inferenceSource ?? null };
}

// Models sometimes write "2026-11-7" instead of "2026-11-07".
function fixDate(it) {
  const m = String(it.date ?? "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  it.date = m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
  return it;
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
