import { initDeviceModel } from "./ai.js";
import { extractTasks } from "./tasks.js";

const $ = (id) => document.getElementById(id);
let tasks = [];

// ---------- storage (local for now; Firestore comes with sign-in) ----------
async function loadTasks() {
  const data = await chrome.storage.local.get("tasks");
  tasks = data.tasks ?? [];
  render();
}
async function saveTasks() {
  await chrome.storage.local.set({ tasks });
}

// ---------- read the current tab ----------
async function getPageText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText,
  });
  return result ?? "";
}

// ---------- main button ----------
$("readBtn").addEventListener("click", async () => {
  // First click also starts the Nano download if needed (needs a user click).
  initDeviceModel((p) => {
    $("progress").textContent = `Downloading on-device model: ${Math.round(p * 100)}%`;
  });

  const btn = $("readBtn");
  btn.disabled = true;
  btn.textContent = "Reading page...";
  try {
    const text = await getPageText();
    const { tasks: found, source } = await extractTasks(text);
    setStatus(source);

    // Add only new tasks (same title + due date = duplicate).
    for (const t of found) {
      if (!tasks.some((x) => x.title === t.title && x.due === t.due)) {
        tasks.push({ ...t, id: crypto.randomUUID(), done: false });
      }
    }
    await saveTasks();
    render();
    $("progress").textContent = `Found ${found.length} item(s).`;
  } catch (err) {
    console.error(err);
    $("progress").textContent = "Error: " + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Find tasks on this page";
  }
});

// ---------- UI ----------
function setStatus(source) {
  const el = $("status");
  const onDevice = String(source).toLowerCase().includes("device");
  el.textContent = onDevice ? "On-device" : "Cloud";
  el.className = "badge " + (onDevice ? "device" : "cloud");
}

function render() {
  const list = $("taskList");
  list.innerHTML = "";
  $("empty").style.display = tasks.length ? "none" : "block";

  const sorted = [...tasks].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  for (const t of sorted) {
    const li = document.createElement("li");
    if (t.done) li.className = "done";

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = t.done;
    box.addEventListener("change", async () => {
      t.done = box.checked;
      await saveTasks();
      render();
    });

    const body = document.createElement("div");
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.title;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = [t.course, t.type, t.due ? "due " + t.due : null].filter(Boolean).join(" · ");
    body.append(title, meta);

    li.append(box, body);
    list.append(li);
  }
}

loadTasks();
