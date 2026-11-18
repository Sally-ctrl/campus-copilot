// Records from the microphone and returns a small WAV file (base64),
// a format Gemini accepts. Chrome records WebM, so we convert it.

let recorder = null;
let chunks = [];

// The side panel can't show Chrome's "allow microphone" prompt,
// so the first time we open a small tab that asks for it.
export async function ensureMicPermission() {
  const status = await navigator.permissions.query({ name: "microphone" }).catch(() => null);
  if (status?.state === "granted") return true;
  chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
  return false;
}

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start();
}

export function isRecording() {
  return recorder?.state === "recording";
}

export async function stopRecording() {
  if (!recorder) return null;
  const done = new Promise((r) => (recorder.onstop = r));
  recorder.stop();
  await done;
  recorder.stream.getTracks().forEach((t) => t.stop());
  recorder = null;
  return toWavBase64(new Blob(chunks, { type: "audio/webm" }));
}

// WebM -> 16 kHz mono 16-bit WAV -> base64.
async function toWavBase64(blob) {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close();

  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const samples = (await offline.startRendering()).getChannelData(0);

  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));

  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
