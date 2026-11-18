// Your uploaded PDFs are stored on your laptop, in the extension's own
// IndexedDB (chrome.storage is too small for files).
const DB = "campus-copilot-files";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const req = fn(tx.objectStore("files"));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const saveFile = (id, blob) => run("readwrite", (s) => s.put(blob, id));
export const getFile = (id) => run("readonly", (s) => s.get(id));
export const clearFiles = () => run("readwrite", (s) => s.clear());
