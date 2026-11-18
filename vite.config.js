import { defineConfig } from "vite";

// Bundles everything (including Firebase) into dist/ so the extension
// never loads remote code (Chrome extensions don't allow that).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: { sidepanel: "sidepanel.html", permission: "permission.html" },
    },
  },
});
