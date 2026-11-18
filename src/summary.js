import { cloudModel } from "./ai.js";

// Downloads a lecture PDF (using your CMS login in Chrome) and asks
// Gemini in the cloud for a short summary + likely quiz topics.
export async function summarizePdf(url, { course, title, onStep } = {}) {
  onStep?.("Downloading PDF...");
  const res = await withTimeout(fetch(url, { credentials: "include" }), 30000, "PDF download");
  if (!res.ok) throw new Error(`Couldn't download the PDF (${res.status}).`);
  const blob = await res.blob();
  if (blob.size > 15 * 1024 * 1024) throw new Error("PDF is too big (over 15 MB).");

  const prompt = `This is "${title}" from university course ${course ?? ""}.
Write for a student revising for a quiz. Plain text, no markdown symbols except "- " bullets.

SUMMARY
- 5 to 7 bullets with the main ideas, short and clear.

LIKELY QUIZ TOPICS
- 3 to 5 bullets: what a quiz on this lecture would most likely ask.`;

  onStep?.(`Asking Gemini (${Math.round(blob.size / 1024)} KB)...`);
  const result = await withTimeout(cloudModel.generateContent([
    prompt,
    { inlineData: { mimeType: "application/pdf", data: await toBase64(blob) } },
  ]), 90000, "Gemini");
  return result.response.text().trim();
}

// Blob -> base64 string (without the "data:...;base64," prefix).
function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// Gives up after `ms` so the button never spins forever.
function withTimeout(promise, ms, what) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${what} took too long (over ${ms / 1000}s).`)), ms)
    ),
  ]);
}
