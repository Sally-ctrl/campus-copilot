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
