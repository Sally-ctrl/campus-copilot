import { fastModel, cloudModel } from "./ai.js";

// Nano's input limit is ~9k tokens; announcements are usually short.
const MAX_CHARS = 6000;
const NANO_MAX_CHARS = 1500; // above this, Nano starts missing things

function buildPrompt(text, course, group) {
  const today = new Date().toISOString().slice(0, 10);
  return `Today is ${today}. These are announcements from university course ${course ?? ""}.
List ONLY graded events that the text clearly gives a date for: quizzes, midterms, finals, exams,
project or assignment SUBMISSIONS/deadlines.

Do NOT list: activity weeks, holidays, breaks, schedule or room changes, office hours, lecture or
tutorial times, registration, compensation slots, calendars, or anything without a clear date.
When unsure, leave it out.

Reply with ONLY a JSON array. Each item:
{"title": the event's own name from the text (e.g. "Quiz 2", "Project Milestone 2"),
 "type": "quiz" | "exam" | "assignment" | "project" | "other",
 "date": "YYYY-MM-DD", "time": "HH:MM" (24h, start time) or null, "details": short string or null,
 "evidence": the exact sentence from the text that gives this event's date (copy it word for word)}
- Read EVERY sentence. An event can be mentioned only in passing, in the middle of a paragraph
  about something else (e.g. "the last week starts on <date> and coincides with Quiz 4").
  That still counts: use that date.
- If an event was postponed or moved, list it ONCE with the NEW date only.
- If a date has no year, pick the year that makes it closest to today.
${group ? `- The student is in tutorial group ${group}. If times or halls differ per group, use ONLY the slot for ${group} and put the hall in "details".` : ""}
- If nothing qualifies, reply [].

ANNOUNCEMENTS:
${text.slice(0, MAX_CHARS)}`;
}

// AI step: announcements text -> deadline items. Returns { items, source }.
// Every item must quote the announcement; items whose quote isn't really in the text are dropped.
// At most 2 AI calls at a time: more makes Nano slow and Gemini rate-limit us.
let running = 0;
const waiting = [];
async function limited(fn) {
  if (running >= 2) await new Promise((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

export function extractDeadlines(text, opts = {}) {
  return limited(() => extract(text, opts));
}

async function extract(text, { course, group } = {}) {
  if (!text.trim()) return { items: [], source: null };
  const prompt = buildPrompt(text, course, group);
  const parse = (result) =>
    parseJsonArray(result.response.text())
      .map((it) => fixDate({ ...it, kind: "deadline", course }))
      .filter((it) => it.date && !GENERIC_TITLE.test(it.title.trim()) && quotedFrom(it.evidence, text))
      .map(fixYear);

  let source = null;
  let items = [];
  // Long, messy announcements go straight to the cloud; short ones stay private on Nano.
  const model = text.length > NANO_MAX_CHARS ? cloudModel : fastModel;
  try {
    const result = await model.generateContent(prompt);
    source = model === cloudModel ? "in_cloud" : result.response.inferenceSource ?? null;
    items = parse(result);
  } catch (err) {
    console.warn(`${course}: first try failed`, err.message);
  }
  // Nano is small: on long, messy announcements it can miss everything.
  // If the text clearly talks about graded work but nothing came back, ask the cloud model.
  // Also retry if everything found is already over: announcements are about what's coming.
  const allPast = items.length && items.every((it) => it.date < new Date().toISOString().slice(0, 10));
  if ((!items.length || allPast) && LOOKS_GRADED.test(text) && model !== cloudModel) {
    console.info(`${course}: nothing found${source ? ` (${source})` : ""}, retrying in the cloud`);
    try {
      items = parse(await cloudModel.generateContent(prompt));
      source = "in_cloud";
    } catch (err) {
      throw new Error("Gemini is busy right now, sync again in a minute");
    }
  }
  return { items, source };
}

const LOOKS_GRADED = /\b(quiz|exam|midterm|final|assignment|milestone|deadline|due|submi)/i;

// "Assignment" or "Quiz" alone is too vague to be a real deadline.
const GENERIC_TITLE = /^(assignment|quiz|exam|project|deadline|event|other)s?$/i;

// True if most words of the quote really appear in the announcement text.
function quotedFrom(evidence, text) {
  const words = (s) => (s ?? "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  const quote = words(evidence);
  if (quote.length < 2) return false;
  const source = new Set(words(text));
  return quote.filter((w) => source.has(w)).length / quote.length >= 0.7;
}

// Small models sometimes get the year wrong ("2025-11-25" in November 2026).
// If the date is months in the past but the same day this/next year is near, use that.
function fixYear(it) {
  const DAY = 86400000;
  const now = new Date(new Date().toISOString().slice(0, 10));
  const d = new Date(it.date);
  if (now - d < 60 * DAY) return it;
  for (const y of [now.getFullYear(), now.getFullYear() + 1]) {
    const c = new Date(`${y}${it.date.slice(4)}`);
    if (Math.abs(c - now) < 120 * DAY) {
      it.date = `${y}${it.date.slice(4)}`;
      return it;
    }
  }
  return it;
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
