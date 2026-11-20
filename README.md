# DueHunter

*Hunts the deadlines hidden in your CMS, then gets you ready for them.*

A Chrome extension that reads your university portal and turns announcements into a to-do list.
It uses **Firebase AI Logic hybrid inference**: requests run on-device with Gemini Nano when available (private, free, offline) and fall back to Gemini in the cloud otherwise.

## Trying it (judges)

Follow **Setup** below (about 5 minutes; you need your own Firebase project with Firebase AI Logic enabled). Then:

1. Open the [demo portal](https://sally-ctrl.github.io/campus-copilot/) and the DueHunter side panel.
2. In **Settings**, set your tutorial group to `T14`, then click **Sync all courses**.

Things to try:
- **DMA201:** Quiz 4 is hidden mid-paragraph. Open "Where it says this" under it.
- **DSD301 Quiz 2:** type `lectures 7-9` in "What's on it?" to see readiness.
- **Tutor tab:** pick Quiz 2, then click **Quiz me (TA style)**.
- **Mic:** say "remind me to study discrete on Thursday" (English or Arabic).

The demo portal is fictional and public, so no login is needed. Its dates move with today.
If Gemini Nano isn't available on your machine, everything still works through the cloud fallback.

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
