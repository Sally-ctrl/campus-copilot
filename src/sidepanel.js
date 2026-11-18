import { initDeviceModel } from "./ai.js";
import { extractDeadlines } from "./tasks.js";
import { readCmsPage } from "./cms.js";
import { summarizePdf } from "./summary.js";
import { keywordSearch, smartSearch } from "./search.js";
import { runCommand } from "./commands.js";
import { findCoverage, readiness } from "./coverage.js";
import { ensureMicPermission, startRecording, stopRecording, isRecording } from "./voice.js";

const $ = (id) => document.getElementById(id);
let items = [];
let group = "";
let courseFilter = "ALL";

// ---------- storage (local for now; Firestore comes with sign-in) ----------
async function load() {
  const data = await chrome.storage.local.get(["items", "group", "studyPerDay"]);
  items = data.items ?? [];
  // Old "busy" failures weren't the lecture's fault: let them be retried.
  for (const x of items) {
    if (x.summaryError && /429|busy|high demand|overloaded|quota|rate|All cloud models failed/i.test(x.summaryError)) {
      delete x.summaryError;
    }
  }
  group = data.group ?? "";
  $("groupInput").value = group;
  studyPerDay = data.studyPerDay ?? 120;
  $("perDayInput").value = studyPerDay;
  render();
}
const save = () => chrome.storage.local.set({ items });

$("groupInput").addEventListener("change", async (e) => {
  group = e.target.value.trim().toUpperCase();
  e.target.value = group;
  await chrome.storage.local.set({ group });
});

$("perDayInput").addEventListener("change", async (e) => {
  studyPerDay = Math.max(15, Number(e.target.value) || 120);
  e.target.value = studyPerDay;
  await chrome.storage.local.set({ studyPerDay });
  render();
});

$("clearBtn").addEventListener("click", async () => {
  items = [];
  await save();
  render();
});

// ---------- reading CMS tabs ----------
async function readTab(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: readCmsPage });
  return result;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Opens a URL in a hidden tab, waits for it to load, reads it, closes it.
async function readUrlInBackground(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  await new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
  try {
    return await readTab(tab.id);
  } finally {
    chrome.tabs.remove(tab.id);
  }
}

// ---------- merging ----------
// Materials are matched by their CMS id; deadlines by course + title + date.
const keyOf = (x) =>
  x.cmsId ? `cms:${x.cmsId}` : `${x.course}|${x.title}|${x.date}`.toLowerCase();

function merge(found) {
  let added = 0;
  for (const it of found) {
    const old = items.find((x) => keyOf(x) === keyOf(it));
    if (old) {
      Object.assign(old, { ...it, id: old.id, done: old.done }); // refresh, keep "done"
    } else {
      items.push({ ...it, id: crypto.randomUUID(), done: false });
      added++;
    }
  }
  return added;
}

// One course page: materials straight from the HTML, deadlines via AI.
async function scanCourse(page, label = "") {
  if (!page.materials.length && !page.announcements.length) {
    throw new Error("This doesn't look like a CMS course page.");
  }
  const course = page.code;
  const materials = page.materials.map((m) => ({ ...m, kind: "coursework", course }));

  $("progress").textContent = `${label}Reading ${course} announcements...`;
  const { items: deadlines, source } = await extractDeadlines(page.announcements.join("\n\n"), {
    course,
    group,
  });
  if (source) setStatus(source);

  // Each deadline links back to its course page so it can be checked in one click.
  const linked = deadlines.map((d) => ({ ...d, link: page.url }));
  return merge([...materials, ...linked]);
}

// ---------- buttons ----------
function startNano() {
  // Needs a user click; starts the Nano download if it isn't on this machine yet.
  initDeviceModel((p) => {
    $("progress").textContent = `Downloading on-device model: ${Math.round(p * 100)}%`;
  });
}

// ---------- only work on the CMS ----------
// The extension only has permission for cms.guc.edu.eg, so on any other site
// Chrome doesn't even tell us the URL. Buttons are enabled only on the CMS.
const CMS_HOST = "cms.guc.edu.eg";
let working = false;

async function onCms() {
  const tab = await activeTab();
  try {
    return new URL(tab?.url ?? "").hostname === CMS_HOST;
  } catch {
    return false;
  }
}

async function updateButtons() {
  const ok = await onCms();
  $("readBtn").disabled = working || !ok;
  $("syncBtn").disabled = working || !ok;
  $("cmsHint").style.display = ok ? "none" : "block";
}

chrome.tabs.onActivated.addListener(updateButtons);
chrome.tabs.onUpdated.addListener((_, info) => info.status === "complete" && updateButtons());

async function busy(fn) {
  working = true;
  await updateButtons();
  try {
    await fn();
  } catch (err) {
    console.error(err);
    $("progress").textContent = "Error: " + err.message;
  } finally {
    working = false;
    await updateButtons();
  }
}

$("readBtn").addEventListener("click", () =>
  busy(async () => {
    startNano();
    const page = await readTab((await activeTab()).id);
    const added = await scanCourse(page);
    await save();
    render();
    $("progress").textContent = `Done. ${added} new item(s) from ${page.code}.`;
  }).then(prepareSummaries)
);

$("syncBtn").addEventListener("click", () =>
  busy(async () => {
    startNano();
    const tab = await activeTab();
    // Collect every "View Course" link on the current page.
    const [{ result: links }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => [...new Set(
        [...document.querySelectorAll("a[href*='CourseViewStn']")].map((a) => a.href)
      )],
    });
    if (!links.length) {
      $("progress").textContent = "No courses found here. Open your CMS Courses list first.";
      return;
    }
    let added = 0;
    for (let i = 0; i < links.length; i++) {
      $("progress").textContent = `Course ${i + 1}/${links.length}: opening...`;
      const page = await readUrlInBackground(links[i]);
      added += await scanCourse(page, `Course ${i + 1}/${links.length}: `);
      await save();
      render();
    }
    $("progress").textContent = `Synced ${links.length} course(s). ${added} new item(s).`;
  }).then(prepareSummaries)
);

// ---------- UI ----------
function setStatus(source) {
  const onDevice = String(source).includes("device");
  $("status").textContent = onDevice ? "On-device" : "Cloud";
  $("status").className = "badge " + (onDevice ? "device" : "cloud");
}

const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (date) => Math.round((new Date(date) - new Date(today())) / 86400000);

function whenLabel(it) {
  if (!it.date) return "";
  if (it.kind === "coursework") return `Week of ${it.date}`;
  const d = daysUntil(it.date);
  const rel = d === 0 ? "today" : d === 1 ? "tomorrow" : d > 1 ? `in ${d} days` : `${-d} days ago`;
  return `${it.date}${it.time ? " " + it.time : ""} · ${rel}`;
}

// Deadlines are past after their date; coursework after its week ends.
function isPast(x) {
  if (x.done) return true;
  if (!x.date) return false;
  return x.kind === "coursework" ? daysUntil(x.date) < -6 : daysUntil(x.date) < 0;
}

function renderList(el, list, { deadline = false } = {}) {
  el.innerHTML = "";
  for (const it of list) {
    const li = document.createElement("li");
    if (deadline || it.kind === "deadline") li.classList.add("deadline");
    if (deadline && it.date && daysUntil(it.date) <= 2 && daysUntil(it.date) >= 0) li.classList.add("soon");
    if (it.done) li.classList.add("done");

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = it.done;
    box.addEventListener("change", async () => {
      it.done = box.checked;
      await save();
      render();
    });

    const body = document.createElement("div");
    body.className = "body";
    const title = document.createElement(it.link ? "a" : "div");
    title.className = "title";
    title.textContent = it.title;
    if (it.link) {
      title.href = it.link;
      title.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: it.link });
      });
    }
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = [it.course, it.type, it.details].filter(Boolean).join(" · ");
    if (it.kind === "coursework" && !it.opened && !it.done) {
      const tag = document.createElement("span");
      tag.className = "new";
      tag.textContent = "NEW";
      meta.prepend(tag);
    }
    if (it.difficulty || it.minutes) {
      const lvl = document.createElement("span");
      lvl.className = "level " + (it.difficulty ?? "").toLowerCase();
      lvl.textContent = [it.difficulty, it.minutes ? `~${it.minutes} min` : null].filter(Boolean).join(" · ");
      meta.append(" ", lvl);
    }
    const when = document.createElement("div");
    when.className = "when";
    when.textContent = whenLabel(it);
    body.append(title, meta, when);
    if (isPdf(it)) body.append(summaryBlock(it));
    if (it.kind === "deadline" && it.type !== "reminder" && !it.done) body.append(readinessBlock(it));

    li.append(box, body);
    el.append(li);
  }
}

// ---------- readiness ----------
// You type what the quiz covers; we find those materials and score how ready you are.
const editingCoverage = new Set();
const coverageDrafts = new Map();

function readinessBlock(dl) {
  const wrap = document.createElement("div");
  wrap.className = "ready";
  const covered = (dl.coverage ?? []).map((id) => items.find((x) => x.id === id)).filter(Boolean);

  if (!covered.length || editingCoverage.has(dl.id)) {
    const input = document.createElement("input");
    input.placeholder = 'What\'s on it? e.g. "lectures 7-9" or "FSM and VHDL"';
    // Keep what you typed if the list refreshes in the background.
    input.value = coverageDrafts.get(dl.id) ?? dl.coverageText ?? "";
    input.addEventListener("input", () => coverageDrafts.set(dl.id, input.value));
    const note = document.createElement("div");
    note.className = "meta";
    input.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter" || !input.value.trim()) return;
      startNano();
      note.textContent = "Finding those materials...";
      const materials = items.filter((x) => x.kind === "coursework" && x.course === dl.course);
      try {
        const found = await findCoverage(input.value.trim(), materials);
        if (!found.length) {
          note.textContent = "Couldn't find matching materials in " + dl.course + ". Try lecture numbers.";
          return;
        }
        dl.coverage = found.map((x) => x.id);
        dl.coverageText = input.value.trim();
        editingCoverage.delete(dl.id);
        coverageDrafts.delete(dl.id);
        await save();
        render();
      } catch (err) {
        note.textContent = "Error: " + err.message;
      }
    });
    wrap.append(input, note);
    return wrap;
  }

  const r = readiness(dl, covered, { minutesPerDay: minutesPerDay() });
  const bar = document.createElement("div");
  bar.className = "bar";
  const fill = document.createElement("div");
  fill.className = "fill " + r.status;
  fill.style.width = r.score + "%";
  bar.append(fill);

  const line = document.createElement("div");
  line.className = "meta";
  const label = { done: "✅ All studied", "on-track": "🟢 On track", tight: "🟡 Tight", behind: "🔴 Behind" }[r.status];
  const h = Math.floor(r.minutesLeft / 60), m = r.minutesLeft % 60;
  line.textContent = `${r.score}% ready · ${h ? h + "h " : ""}${m}m left to study · ${label}`;

  const cov = document.createElement("div");
  cov.className = "meta";
  cov.textContent = "Covers: " + covered.map((x) => x.title).join(", ");
  const edit = document.createElement("a");
  edit.href = "#";
  edit.textContent = " (edit)";
  edit.addEventListener("click", (e) => {
    e.preventDefault();
    editingCoverage.add(dl.id);
    render();
  });
  cov.append(edit);

  wrap.append(bar, line, cov);
  if (r.notOpened.length) {
    const warn = document.createElement("div");
    warn.className = "meta warn";
    warn.textContent = "Not opened yet: " + r.notOpened.map((x) => x.title).join(", ");
    wrap.append(warn);
  }
  return wrap;
}

let studyPerDay = 120;
const minutesPerDay = () => studyPerDay;

// ---------- summaries ----------
// One shared function for the button and the background job, so the same
// PDF is never summarized twice at the same time.
const pending = new Map();

function getSummary(it, onStep) {
  if (it.summary) return Promise.resolve(it.summary);
  if (pending.has(it.id)) return pending.get(it.id);
  const job = (async () => {
    try {
      const { summary, difficulty, minutes, source } = await summarizePdf(it.link, {
        course: it.course,
        title: it.title,
        onStep,
      });
      it.summary = summary;
      it.difficulty = difficulty;
      it.minutes = minutes;
      delete it.summaryError;
      setStatus(source);
      await save();
      return summary;
    } catch (err) {
      console.error(err);
      it.summaryError = err.message;
      await save();
      throw err;
    } finally {
      pending.delete(it.id);
    }
  })();
  pending.set(it.id, job);
  return job;
}

const isPdf = (it) => it.link && /\.pdf($|\?)/i.test(it.link);

// After a scan/sync: quietly prepare summaries for this week's lecture PDFs.
// Gentle on the free tier: one at a time, a pause between them, and if Google
// says "busy / too many requests" we stop and leave the rest for later
// (they stay as plain "Summarize", not "failed").
const BG_GAP_MS = 20000;
const BG_MAX = 4;
const RATE_LIMITED = /429|busy|high demand|overloaded|quota|rate/i;
let preparing = false;

async function prepareSummaries() {
  if (preparing) return;
  preparing = true;
  const todo = items
    .filter((x) => x.kind === "coursework" && !isPast(x) && isPdf(x) && !x.summary && !x.summaryError)
    .slice(0, BG_MAX);
  let done = 0;
  try {
    for (let i = 0; i < todo.length; i++) {
      if (i > 0) {
        $("progress").textContent = `Next summary in ${BG_GAP_MS / 1000}s (${done}/${todo.length} ready)...`;
        await new Promise((r) => setTimeout(r, BG_GAP_MS));
      }
      $("progress").textContent = `Preparing summaries in the background (${i + 1}/${todo.length})...`;
      render();
      try {
        await getSummary(todo[i]);
        done++;
      } catch (err) {
        if (RATE_LIMITED.test(err.message)) {
          delete todo[i].summaryError; // not the lecture's fault; try again later
          await save();
          $("progress").textContent = `Paused: Gemini is busy. ${done} summary(ies) ready; the rest will be prepared next time.`;
          return;
        }
      }
    }
    if (todo.length) $("progress").textContent = `${done} summary(ies) ready.`;
  } finally {
    preparing = false;
    render();
  }
}

// "Summarize" button + the saved summary (saved, so it works offline later).
const openSummaries = new Set();

function summaryBlock(it) {
  const wrap = document.createElement("div");
  const btn = document.createElement("button");
  btn.className = "small";
  btn.textContent = it.summary
    ? (openSummaries.has(it.id) ? "Hide summary" : "Show summary")
    : it.summaryError ? "Retry summary" : "Summarize";
  if (it.summaryError && !it.summary) btn.title = it.summaryError;
  wrap.append(btn);

  if (it.summary && openSummaries.has(it.id)) {
    const box = document.createElement("div");
    box.className = "summary";
    box.textContent = it.summary;
    wrap.append(box);
  }

  if (!it.summary && pending.has(it.id)) {
    btn.disabled = true;
    btn.textContent = "Preparing...";
  }

  btn.addEventListener("click", async () => {
    if (it.summary) {
      openSummaries.has(it.id) ? openSummaries.delete(it.id) : openSummaries.add(it.id);
      return render();
    }
    btn.disabled = true;
    try {
      await getSummary(it, (msg) => (btn.textContent = msg));
      openSummaries.add(it.id);
    } catch (err) {
      btn.textContent = "Failed: " + err.message;
      btn.disabled = false;
      return;
    }
    render();
  });
  return wrap;
}

function renderChips() {
  const courses = [...new Set(items.map((x) => x.course).filter(Boolean))].sort();
  const el = $("courseFilter");
  el.innerHTML = "";
  for (const c of ["ALL", ...courses]) {
    const chip = document.createElement("button");
    chip.className = "chip" + (c === courseFilter ? " active" : "");
    chip.textContent = c === "ALL" ? "All" : c;
    chip.addEventListener("click", () => {
      courseFilter = c;
      render();
    });
    el.append(chip);
  }
}

// ---------- commands (typed + voice) ----------
async function handleCommand(input) {
  const reply = $("cmdReply");
  reply.textContent = input.audioBase64 ? "Understanding your voice (cloud)..." : "Thinking on your laptop...";
  try {
    const { intent, source } = await runCommand(items, input);
    setStatus(source);
    const where = String(source).includes("device") ? "on your laptop" : "cloud";

    if ((intent.action === "done" || intent.action === "undo") && intent.targets.length) {
      for (const t of intent.targets) t.done = intent.action === "done";
    } else if (intent.action === "add" && intent.title) {
      items.push({
        id: crypto.randomUUID(),
        kind: "deadline",
        type: "reminder",
        title: intent.title,
        course: intent.course ?? null,
        date: intent.date ?? null,
        time: intent.time ?? null,
        done: false,
      });
    }
    await save();
    render();
    const heard = input.audioBase64 && intent.heard ? `Heard: "${intent.heard}". ` : "";
    reply.textContent = `${heard}${intent.reply ?? "Done."} (${where})`;
  } catch (err) {
    console.error(err);
    reply.textContent = "Sorry: " + err.message;
  }
}

$("cmdInput").addEventListener("keydown", async (e) => {
  const text = e.target.value.trim();
  if (e.key !== "Enter" || !text) return;
  startNano();
  e.target.value = "";
  await handleCommand({ text });
});

// Tap to start, tap again to stop (stops by itself after 10 seconds).
let autoStop = null;
$("micBtn").addEventListener("click", async () => {
  const btn = $("micBtn");
  if (isRecording()) {
    clearTimeout(autoStop);
    btn.classList.remove("live");
    const audioBase64 = await stopRecording();
    if (audioBase64) await handleCommand({ audioBase64 });
    return;
  }
  if (!(await ensureMicPermission())) {
    $("cmdReply").textContent = "Allow the microphone in the tab that just opened, then tap the mic again.";
    return;
  }
  try {
    await startRecording();
    btn.classList.add("live");
    $("cmdReply").textContent = "Listening... tap the mic again when you're done.";
    autoStop = setTimeout(() => isRecording() && btn.click(), 10000);
  } catch (err) {
    $("cmdReply").textContent = "Couldn't use the microphone: " + err.message;
  }
});

// ---------- search ----------
let query = "";
let smartResults = null; // set after pressing Enter

$("searchInput").addEventListener("input", (e) => {
  query = e.target.value.trim();
  smartResults = null;
  render();
});

$("searchInput").addEventListener("keydown", async (e) => {
  if (e.key !== "Enter" || !query) return;
  startNano();
  $("searchTitle").textContent = "Thinking on your laptop...";
  try {
    const { results, source } = await smartSearch(filtered(), query);
    smartResults = { results, source };
    if (source) setStatus(source);
  } catch (err) {
    console.error(err);
    smartResults = { results: [], error: err.message };
  }
  render();
});

const filtered = () => items.filter((x) => courseFilter === "ALL" || x.course === courseFilter);

function renderSearch() {
  const searching = query.length > 0;
  $("searchSection").style.display = searching ? "block" : "none";
  $("mainLists").style.display = searching ? "none" : "block";
  if (!searching) return;

  let list, title;
  if (smartResults) {
    list = smartResults.results;
    const where = String(smartResults.source ?? "").includes("cloud") ? "cloud" : "on your laptop";
    title = `Smart matches (${where})`;
    $("searchEmpty").textContent = smartResults.error
      ? "Smart search failed: " + smartResults.error
      : list.length ? "" : "No close matches.";
  } else {
    list = keywordSearch(filtered(), query);
    title = `Matches (${list.length})`;
    $("searchEmpty").textContent = list.length ? "" : "No exact matches. Press Enter for smart search.";
  }
  $("searchTitle").textContent = title;
  renderList($("searchList"), list, {});
}

function render() {
  renderChips();
  renderSearch();
  const visible = filtered();
  const byDate = (a, b) =>
    (a.date ?? "9999").localeCompare(b.date ?? "9999") || (a.time ?? "").localeCompare(b.time ?? "");

  const deadlines = visible.filter((x) => x.kind === "deadline" && !isPast(x)).sort(byDate);
  const next = visible.filter((x) => x.kind !== "deadline" && !isPast(x)).sort(byDate);
  const past = visible.filter(isPast).sort((a, b) => byDate(b, a));

  renderList($("deadlineList"), deadlines, { deadline: true });
  renderList($("nextList"), next);
  renderList($("pastList"), past);

  $("countDeadlines").textContent = `(${deadlines.length})`;
  $("countNext").textContent = `(${next.length})`;
  $("countPast").textContent = `(${past.length})`;
  $("empty").style.display = items.length ? "none" : "block";
}

load();
updateButtons();
