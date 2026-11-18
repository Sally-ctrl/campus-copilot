# Campus Copilot

A Chrome extension that reads your university portal and turns announcements into a to-do list.
It uses **Firebase AI Logic hybrid inference**: requests run on-device with Gemini Nano when available (private, free, offline) and fall back to Gemini in the cloud otherwise.

## Setup

1. `npm install`
2. Copy `src/config.example.js` to `src/config.js` and add your Firebase web config.
3. `npm run build` (or `npm run dev` to rebuild on save)
4. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the `dist/` folder.
5. Click the extension icon to open the side panel.

### App Check (debug)
On first run, the side panel console prints an App Check debug token.
Register it in Firebase console > Security > App Check > Apps > Manage debug tokens.

## Where Firebase AI Logic is used
- `src/ai.js`: initializes Firebase, App Check and the hybrid model (`InferenceMode.PREFER_ON_DEVICE`)
- `src/tasks.js`: calls `model.generateContent()` to extract tasks from the page

## License
Apache 2.0
