import { model } from "./ai.js";

// Instant search: every word you type must appear somewhere in the item.
export function keywordSearch(items, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return items
    .map((it) => {
      const hay = [it.title, it.course, it.type, it.details, it.summary].filter(Boolean).join(" ").toLowerCase();
      if (!words.every((w) => hay.includes(w))) return null;
      // Title matches rank higher than summary matches.
      const score = words.reduce((n, w) => n + (it.title.toLowerCase().includes(w) ? 3 : 1), 0);
      return { it, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}

// Smart search: Gemini Nano (on your laptop) picks the items that MEAN the same
// thing as the query, even without the same words. Falls back to cloud only if Nano isn't available.
const MAX_CATALOG = 120;

export async function smartSearch(items, query) {
  const catalog = items.slice(0, MAX_CATALOG);
  const lines = catalog.map((it, i) => {
    const hint = (it.summary ?? "").replace(/\s+/g, " ").replace(/^SUMMARY\s*-?\s*/i, "").slice(0, 80);
    return `${i} | ${it.course ?? ""} | ${it.title} | ${it.type ?? ""}${hint ? " | " + hint : ""}`;
  });

  const prompt = `A student is searching their course materials for: "${query}"
Below is a numbered list (number | course | title | type | short summary).
Reply with ONLY a JSON array of up to 5 numbers, the most relevant first. Match by meaning, not only exact words.
If nothing is relevant, reply [].

${lines.join("\n")}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const nums = (text.match(/\[[^\]]*\]/)?.[0] ?? "[]").match(/\d+/g) ?? [];
  const picked = [...new Set(nums.map(Number))].filter((n) => n < catalog.length).map((n) => catalog[n]);
  return { results: picked, source: result.response.inferenceSource ?? null };
}
