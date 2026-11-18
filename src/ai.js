import { initializeApp } from "firebase/app";
import { initializeAppCheck, CustomProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";
import { firebaseConfig } from "./config.js";

// --- App Check (debug mode for development) ---
// Prints a debug token in the console on first run.
// Register it in Firebase console > Security > App Check > Apps > Manage debug tokens.
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

const app = initializeApp(firebaseConfig);

initializeAppCheck(app, {
  // Never called in debug mode; a real provider is added before release.
  provider: new CustomProvider({
    getToken: () => Promise.reject(new Error("No production App Check provider yet")),
  }),
  isTokenAutoRefreshEnabled: true,
});

// --- Firebase AI Logic: hybrid model ---
// Uses Gemini Nano on-device when available, otherwise falls back to the cloud.
const ai = getAI(app, { backend: new GoogleAIBackend() });

export const model = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: { model: "gemini-4-hydrogen" },
});

// Cloud-only model for heavy jobs (PDF summaries, study plans).
// Big files and long outputs are too much for Nano, so these always go to the cloud.
// Tried in order: fast model first; if it's busy, slow or unavailable, the next one is used.
const CLOUD_MODELS = ["gemini-3.5-flash-lite", "gemini-4-hydrogen"];
const PER_MODEL_TIMEOUT = 40000;

const cloudModels = CLOUD_MODELS.map((name) => ({
  name,
  model: getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams: { model: name } }),
}));

export const cloudModel = {
  async generateContent(request, { onModel } = {}) {
    let lastErr;
    for (const { name, model } of cloudModels) {
      onModel?.(name);
      try {
        const result = await withTimeout(model.generateContent(request), PER_MODEL_TIMEOUT, name);
        result.modelName = name;
        return result;
      } catch (err) {
        lastErr = err;
        // Fall back only on "busy / slow / not found / rate limit" errors.
        if (!/\b(500|503|429|404)\b|high demand|overloaded|not found|too long/i.test(err.message)) throw err;
        console.warn(`${name} failed, trying next model:`, err.message);
      }
    }
    throw lastErr;
  },
};

export function withTimeout(promise, ms, what) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${what} took too long (over ${ms / 1000}s).`)), ms)
    ),
  ]);
}

// Must be called from a user action (button click) before the first prompt.
let deviceInitStarted = false;
export function initDeviceModel(onProgress) {
  if (deviceInitStarted) return;
  deviceInitStarted = true;
  model.initializeDeviceModel?.(onProgress);
}

// Is Nano ready on this machine? Used to show where a request ran.
export async function nanoAvailable() {
  try {
    return typeof LanguageModel !== "undefined" &&
      (await LanguageModel.availability()) === "available";
  } catch {
    return false;
  }
}
