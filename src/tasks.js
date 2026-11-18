import { model, nanoAvailable } from "./ai.js";

// Nano's input limit is ~9k tokens, so keep page text short.
const MAX_CHARS = 6000;

export async function extractTasks(pageText) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}.
Read this university portal page and list every task, deadline, quiz, exam or assignment.
Reply with ONLY a JSON array. Each item:
{"title": string, "course": string or null, "due": "YYYY-MM-DD" or null, "type": "assignment" | "quiz" | "exam" | "lecture" | "other"}
If there are none, reply [].

PAGE:
${pageText.slice(0, MAX_CHARS)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const source =
    result.response.inferenceSource ??
    ((await nanoAvailable()) ? "on_device" : "in_cloud");

  return { tasks: parseJsonArray(text), source };
}

// Models sometimes wrap JSON in ```json fences or add extra words.
function parseJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
