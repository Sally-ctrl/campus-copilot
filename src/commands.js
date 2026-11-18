import { model, cloudModel } from "./ai.js";

// Turns a typed or spoken command into an action on your list.
// Typed English -> Nano on your laptop. Voice or Arabic -> Gemini in the cloud.

const MAX_CATALOG = 80;

function buildPrompt(catalog, typed) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const lines = catalog.map(
    (it, i) => `${i} | ${it.course ?? ""} | ${it.title} | ${it.kind} | ${it.date ?? "no date"} | ${it.done ? "done" : "open"}`
  );
  return `You control a student's to-do list. Today is ${weekday} ${today}.
${typed ? `The student typed: "${typed}"` : "The student's spoken command is in the attached audio. It may be English, Egyptian Arabic or Franco-Arabic."}

The list (number | course | title | kind | date | status):
${lines.join("\n")}

Reply with ONLY one JSON object:
{"action": "done" | "undo" | "add" | "answer",
 "ids": [numbers from the list, for done/undo],
 "title": string (for add), "date": "YYYY-MM-DD" or null (for add), "time": "HH:MM" or null, "course": string or null,
 "heard": what the student said, in English,
 "reply": one short friendly sentence in English confirming or answering}

- "I finished / done with X" -> done. "I didn't finish X / undo X" -> undo.
- "remind me to X (on day)" -> add, turning words like "Sunday" or "tomorrow" into a date after today.
- Questions like "what's due this week?" -> answer, using the dates in the list.`;
}

export async function runCommand(items, { text, audioBase64 }) {
  const catalog = items.filter((x) => !x.done || text?.match(/undo|didn/i)).slice(0, MAX_CATALOG);
  const prompt = buildPrompt(catalog, text);

  let result, source;
  const arabicScript = /[؀-ۿ]/.test(text ?? "");
  if (audioBase64 || arabicScript) {
    const parts = [prompt];
    if (audioBase64) parts.push({ inlineData: { mimeType: "audio/wav", data: audioBase64 } });
    result = await cloudModel.generateContent(parts);
    source = "in_cloud";
  } else {
    result = await model.generateContent(prompt);
    source = result.response.inferenceSource ?? "on_device";
  }

  const raw = result.response.text();
  let intent;
  try {
    intent = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    throw new Error("Didn't understand that. Try rephrasing.");
  }
  intent.targets = (intent.ids ?? []).map(Number).filter((n) => n < catalog.length).map((n) => catalog[n]);
  return { intent, source };
}
