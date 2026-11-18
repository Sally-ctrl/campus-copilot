import { model } from "./ai.js";

// You tell a quiz what it covers ("lectures 7-9" or "FSM and VHDL"),
// and this finds the matching materials of that course.

const KINDS = {
  lecture: /lecture|lec\b|^l$/i,
  tutorial: /tutorial|tut\b/i,
  practice: /practice|assignment|sheet/i,
  lab: /lab/i,
};

// "lectures 7-9", "lec 7, 8 and 10", "7 to 9" -> {kinds, numbers}
export function parseNumbers(text) {
  const numbers = new Set();
  for (const m of text.matchAll(/(\d+)\s*(?:-|–|to)\s*(\d+)/gi)) {
    for (let n = +m[1]; n <= +m[2] && n - m[1] < 30; n++) numbers.add(n);
  }
  const rest = text.replace(/(\d+)\s*(?:-|–|to)\s*(\d+)/gi, " ");
  for (const m of rest.matchAll(/\d+/g)) numbers.add(+m[0]);
  const kinds = Object.keys(KINDS).filter((k) => KINDS[k].test(text));
  return { numbers: [...numbers], kinds: kinds.length ? kinds : ["lecture"] };
}

function numberOf(title) {
  return Number(title.match(/(?:lecture|lec|tutorial|tut|assignment|sheet|lab)\s*#?\s*(\d+)/i)?.[1]) || null;
}

function kindOf(it) {
  const s = `${it.title} ${it.type}`;
  return Object.keys(KINDS).find((k) => KINDS[k].test(s)) ?? "other";
}

// Returns the course materials this quiz covers. Numbers are matched instantly;
// topics ("FSM and VHDL") are matched by meaning with Nano on your laptop.
export async function findCoverage(text, materials) {
  const { numbers, kinds } = parseNumbers(text);
  if (numbers.length) {
    return materials.filter(
      (it) => numbers.includes(numberOf(it.title)) && kinds.includes(kindOf(it)) && !/solution/i.test(it.title)
    );
  }

  const list = materials.slice(0, 80);
  const lines = list.map((it, i) => {
    const hint = (it.summary ?? "").replace(/\s+/g, " ").replace(/^SUMMARY\s*-?\s*/i, "").slice(0, 100);
    return `${i} | ${it.title} | ${it.type ?? ""}${hint ? " | " + hint : ""}`;
  });
  const prompt = `A quiz covers these topics: "${text}".
Which of these course materials cover them? Reply with ONLY a JSON array of numbers (up to 15). Skip solutions.
${lines.join("\n")}`;
  const result = await model.generateContent(prompt);
  const nums = (result.response.text().match(/\[[^\]]*\]/)?.[0] ?? "[]").match(/\d+/g) ?? [];
  return [...new Set(nums.map(Number))].filter((n) => n < list.length).map((n) => list[n]);
}

// Readiness = share of the covered materials you ticked as studied.
// (Opening a file doesn't count: opening isn't studying.) Practice questions get a share later.
// Time check: study minutes left vs. time until the quiz.
export function readiness(deadline, covered, { minutesPerDay = 120 } = {}) {
  if (!covered.length) return null;
  const studied = covered.filter((it) => it.done).length / covered.length;
  const score = Math.round(100 * studied);

  const minutesLeft = covered.filter((it) => !it.done).reduce((n, it) => n + (it.minutes ?? 45), 0);
  const days = Math.max(0, Math.round((new Date(deadline.date) - new Date(new Date().toISOString().slice(0, 10))) / 86400000));
  const available = Math.max(1, days) * minutesPerDay;
  const status =
    minutesLeft === 0 ? "done" : minutesLeft <= available * 0.5 ? "on-track" : minutesLeft <= available ? "tight" : "behind";

  return {
    score,
    minutesLeft,
    status,
    notOpened: covered.filter((it) => !it.opened && !it.done),
  };
}
