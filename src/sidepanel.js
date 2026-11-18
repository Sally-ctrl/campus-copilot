import { initDeviceModel } from "./ai.js";
import { extractItems, detectCourse } from "./tasks.js";

const $ = (id) => document.getElementById(id);
let items = [];
let group = "";
let courseFilter = "ALL";

// ---------- storage (local for now; Firestore comes with sign-in) ----------
async function load() {
  const data = await chrome.storage.local.get(["items", "group"]);
  items = data.items ?? [];
  group = data.group ?? "";
  $("groupInput").value = group;
  render();
}
const save = () => chrome.storage.local.set({ items });

$("groupInput").addEventListener("change", async (e) => {
  group = e.target.value.trim().toUpperCase();
  e.target.value = group;
  await chrome.storage.local.set({ group });
});

$("clearBtn").addEventListener("click", async () => {
  items = [];
  await save();
  render();
});

// ---------- reading pages ----------
function readPage() {
  return { text: document.body.innerText, title: document.title, url: location.href };
}

async function readTab(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: readPage });
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
  await new Promise((r) => setTimeout(r, 1000)); // let the page finish rendering
  try {
    return await readTab(tab.id);
  } finally {
    chrome.tabs.remove(tab.id);
  }
}

// ---------- merge new items without duplicates ----------
const keyOf = (x) => `${x.course}|${x.title}|${x.date}`.toLowerCase();

function merge(found) {
  let added = 0;
  for (const it of found) {
    if (!items.some((x) => keyOf(x) === keyOf(it))) {
      items.push({ ...it, id: crypto.randomUUID(), done: false });
      added++;
    }
  }
  return added;
}

async function scanPage(page, label = "") {
  const course = detectCourse(page.text);
  const { items: found, source } = await extractItems(page.text, {
    course,
    group,
    onChunk: (i, n) => ($("progress").textContent = `${label}Reading ${course ?? "page"} (part ${i}/${n})...`),
  });
  if (source) setStatus(source);
  return merge(found);
}

// ---------- buttons ----------
function startNano() {
  // Needs a user click; starts the Nano download if it isn't on this machine yet.
  initDeviceModel((p) => {
    $("progress").textContent = `Downloading on-device model: ${Math.round(p * 100)}%`;
  });
}

async function busy(fn) {
  const btns = [$("readBtn"), $("syncBtn")];
  btns.forEach((b) => (b.disabled = true));
  try {
    await fn();
  } catch (err) {
    console.error(err);
    $("progress").textContent = "Error: " + err.message;
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

$("readBtn").addEventListener("click", () =>
  busy(async () => {
    startNano();
    const page = await readTab((await activeTab()).id);
    const added = await scanPage(page);
    await save();
    render();
    $("progress").textContent = `Done. ${added} new item(s).`;
  })
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
      const page = await readUrlInBackground(links[i]);
      added += await scanPage(page, `Course ${i + 1}/${links.length}: `);
      await save();
      render();
    }
    $("progress").textContent = `Synced ${links.length} course(s). ${added} new item(s).`;
  })
);

// ---------- UI ----------
function setStatus(source) {
  const onDevice = String(source).includes("device");
  $("status").textContent = onDevice ? "On-device" : "Cloud";
  $("status").className = "badge " + (onDevice ? "device" : "cloud");
}

const today = () => new Date().toISOString().slice(0, 10);

function daysUntil(date) {
  return Math.round((new Date(date) - new Date(today())) / 86400000);
}

function whenLabel(it) {
  if (!it.date) return "";
  const d = daysUntil(it.date);
  const rel = d === 0 ? "today" : d === 1 ? "tomorrow" : d > 1 ? `in ${d} days` : `${-d} days ago`;
  return `${it.date}${it.time ? " " + it.time : ""} · ${rel}`;
}

function renderList(el, list, { deadline = false } = {}) {
  el.innerHTML = "";
  for (const it of list) {
    const li = document.createElement("li");
    if (deadline) li.classList.add("deadline");
    if (deadline && it.date && daysUntil(it.date) <= 2 && daysUntil(it.date) >= 0) li.classList.add("soon");
    if (it.done) li.classList.add("done");

    const box = document.createElement("input");
    box.type = "checkbox";
    box.style.width = "auto";
    box.checked = it.done;
    box.addEventListener("change", async () => {
      it.done = box.checked;
      await save();
      render();
    });

    const body = document.createElement("div");
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = it.title;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = [it.course, it.type, it.details].filter(Boolean).join(" · ");
    const when = document.createElement("div");
    when.className = "when";
    when.textContent = whenLabel(it);
    body.append(title, meta, when);

    li.append(box, body);
    el.append(li);
  }
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

function render() {
  renderChips();
  const t = today();
  const visible = items.filter((x) => courseFilter === "ALL" || x.course === courseFilter);
  const byDate = (a, b) =>
    (a.date ?? "9999").localeCompare(b.date ?? "9999") || (a.time ?? "").localeCompare(b.time ?? "");

  const isPast = (x) => x.done || (x.date && x.date < t);

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
