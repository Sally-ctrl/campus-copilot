// Opened once from the side panel to ask Chrome for microphone access.
navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    stream.getTracks().forEach((t) => t.stop());
    document.getElementById("msg").textContent = "Done! Go back to the side panel and tap the mic again.";
    setTimeout(() => window.close(), 1500);
  })
  .catch(() => {
    document.getElementById("msg").textContent =
      "Microphone was blocked. Click the icon in the address bar to allow it, then reload this page.";
  });
