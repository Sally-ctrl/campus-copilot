import { makeMockQuiz, gradeShort, styleExamples, loadDocs, chatTutor, slideImage } from "./tutor.js";

// The Tutor tab: pick a quiz or lecture, then "Quiz me" or "Ask".
// `app` gives access to the list and helpers in sidepanel.js.
export function initTutor(app) {
  const $ = (id) => document.getElementById(id);
  const isPdf = (x) => x.localFile || (x.link && /\.pdf($|\?)/i.test(x.link));
  const today = () => new Date().toISOString().slice(0, 10);

  let session = null; // { holder, questions, i, correct, answered, wrong: [] }

  // ---------- several saved chats ----------
  // Each chat: { id, title, target, history: [{ q, a, photo, refs }] }. Kept in chrome.storage.
  let chats = [];
  let current = null;
  const saveChats = () => chrome.storage.local.set({ tutorChats: chats, tutorCurrent: current?.id ?? null });

  function newChat() {
    current = { id: crypto.randomUUID(), title: "New chat", target: $("tutorTarget").value || "", history: [] };
    chats.unshift(current);
    showChat();
    saveChats();
  }

  function fillChatPicker() {
    $("chatPicker").innerHTML = chats
      .map((c) => `<option value="${c.id}">${esc(c.title)}${c.history.length ? ` (${c.history.length})` : ""}</option>`)
      .join("");
    if (current) $("chatPicker").value = current.id;
  }

  // Redraws the log from the saved messages (slide pictures only show for new answers).
  function showChat() {
    fillChatPicker();
    const log = $("chatLog");
    log.innerHTML = "";
    for (const m of current.history) {
      log.append(el("div", "bubble you", m.q + (m.photo ? "  📷" : "")));
      const bot = el("div", "bubble tutor", m.a);
      if (m.refs) bot.append(el("div", "meta", m.refs));
      log.append(bot);
    }
    if (current.target && [...$("tutorTarget").options].some((o) => o.value === current.target)) {
      $("tutorTarget").value = current.target;
      $("tutorTarget").dispatchEvent(new Event("change"));
    }
    $("chatHint").textContent = current.history.length
      ? "Continuing this chat. Start a new one for a different topic."
      : "Uses the slides of what you picked above. Paste or attach a photo of your work to get it checked.";
  }

  chrome.storage.local.get(["tutorChats", "tutorCurrent"]).then((d) => {
    chats = d.tutorChats ?? [];
    current = chats.find((c) => c.id === d.tutorCurrent) ?? chats[0];
    if (current) showChat();
    else newChat();
  });

  $("newChatBtn").onclick = () => {
    if (current && !current.history.length) return showChat(); // already on an empty chat
    newChat();
  };
  $("delChatBtn").onclick = () => {
    if (current.history.length && !confirmDelete()) return;
    chats = chats.filter((c) => c.id !== current.id);
    current = chats[0];
    if (current) { showChat(); saveChats(); } else newChat();
  };
  // Two clicks to delete, no browser dialog (dialogs block the side panel).
  let armed = 0;
  function confirmDelete() {
    if (Date.now() - armed < 3000) return true;
    armed = Date.now();
    $("chatHint").textContent = "Click 🗑 again to delete this chat.";
    return false;
  }
  $("chatPicker").onchange = () => {
    current = chats.find((c) => c.id === $("chatPicker").value);
    showChat();
    saveChats();
  };

  // ---------- what to study ----------
  function fillPicker() {
    const sel = $("tutorTarget");
    const keep = sel.value;
    const items = app.items();
    const quizzes = items.filter((x) => x.kind === "deadline" && x.coverage?.length && (!x.date || x.date >= today()));
    const lectures = items.filter((x) => isPdf(x) && !/solution|answer/i.test(`${x.title} ${x.type}`))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 80);
    sel.innerHTML =
      `<option value="">Choose a quiz or a lecture...</option>` +
      (quizzes.length ? `<optgroup label="Upcoming quizzes">${quizzes.map((q) => `<option value="${q.id}">${esc(q.title)} · ${q.course ?? ""}</option>`).join("")}</optgroup>` : "") +
      `<optgroup label="Lectures & files">${lectures.map((l) => `<option value="${l.id}">${esc(l.title)} · ${l.course ?? ""}</option>`).join("")}</optgroup>`;
    if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
  }

  function selected() {
    const holder = app.items().find((x) => x.id === $("tutorTarget").value);
    if (!holder) return null;
    const targets = holder.kind === "deadline"
      ? (holder.coverage ?? []).map((id) => app.items().find((x) => x.id === id)).filter((x) => x && isPdf(x) && !/solution/i.test(x.title))
      : [holder];
    return { holder, targets, course: holder.course };
  }

  $("tutorTarget").addEventListener("change", () => {
    session = null;
    showSaved();
  });

  function showSaved() {
    const s = selected();
    $("quizArea").innerHTML = "";
    if (!s) return ($("tutorInfo").textContent = "");
    const p = s.holder.practice;
    $("tutorInfo").textContent =
      `${s.targets.length} file(s) · ` +
      (p ? `last mock quiz: ${p.correct}/${p.total}` : "no mock quiz yet") +
      (s.holder.mockQuiz ? " · saved quiz available offline" : "");
    $("retakeBtn").style.display = s.holder.mockQuiz ? "inline-block" : "none";
  }

  // ---------- Quiz me ----------
  $("quizBtn").addEventListener("click", () => startQuiz(false));
  $("retakeBtn").addEventListener("click", () => startQuiz(true));

  async function startQuiz(retake) {
    const s = selected();
    if (!s) return ($("tutorInfo").textContent = "Choose a quiz or a lecture first.");
    if (!s.targets.length) return ($("tutorInfo").textContent = "This quiz has no PDF files in its checklist yet.");
    app.startNano();

    let questions = retake ? s.holder.mockQuiz?.questions : null;
    if (!questions) {
      $("quizBtn").disabled = true;
      try {
        questions = await makeMockQuiz({
          course: s.course,
          targets: s.targets.slice(0, 4),
          style: styleExamples(app.items(), s.course),
          sourceOf: app.sourceOf,
          onStep: (m) => ($("tutorInfo").textContent = m),
        });
        s.holder.mockQuiz = { questions, createdAt: today() };
        app.setStatus("in_cloud");
        await app.save();
      } catch (err) {
        console.error(err);
        $("tutorInfo").textContent = "Couldn't make the quiz: " + err.message;
        return;
      } finally {
        $("quizBtn").disabled = false;
      }
    }
    session = { holder: s.holder, targets: s.targets, questions, i: 0, correct: 0, wrong: [] };
    $("tutorInfo").textContent = retake ? "Saved quiz (works offline)." : "Your quiz is ready.";
    showQuestion();
  }

  function showQuestion() {
    const area = $("quizArea");
    area.innerHTML = "";
    const q = session.questions[session.i];
    if (!q) return showResult();

    const head = el("div", "meta", `Question ${session.i + 1}/${session.questions.length}`);
    const lvl = el("span", "level " + (q.difficulty ?? ""), cap(q.difficulty ?? ""));
    head.append(" ", lvl);
    const text = el("div", "qtext", q.q);
    area.append(head, text);

    const feedback = el("div", "feedback", "");
    const next = el("button", "small", "Next →");
    next.style.display = "none";
    next.onclick = () => {
      session.i++;
      showQuestion();
    };

    const finish = (ok, msg) => {
      if (ok) session.correct++;
      else session.wrong.push(q);
      feedback.className = "feedback " + (ok ? "ok" : "bad");
      feedback.textContent = `${ok ? "✅ Correct." : "❌ Not quite."} ${msg ?? ""}`;
      const why = el("div", "meta", `${q.explain ?? ""}  Source: ${q.source ?? "?"}`);
      feedback.append(why);
      next.style.display = "inline-block";
    };

    if (q.type === "mcq") {
      const opts = el("div", "opts", "");
      for (const o of q.options) {
        const b = el("button", "opt", o);
        b.onclick = () => {
          if (next.style.display !== "none") return;
          const ok = norm(o) === norm(q.answer);
          b.classList.add(ok ? "ok" : "bad");
          [...opts.children].find((c) => norm(c.textContent) === norm(q.answer))?.classList.add("ok");
          finish(ok);
        };
        opts.append(b);
      }
      area.append(opts);
    } else {
      const box = document.createElement("textarea");
      box.rows = 3;
      box.placeholder = "Your answer...";
      const check = el("button", "small", "Check (on your laptop)");
      check.onclick = async () => {
        if (!box.value.trim()) return (feedback.textContent = "Write an answer first.");
        check.disabled = true;
        check.textContent = "Grading on your laptop...";
        const g = await gradeShort(q, box.value.trim());
        if (g.source) app.setStatus(g.source);
        check.style.display = "none";
        finish(!!g.correct, `${g.feedback ?? ""} Model answer: ${q.answer}`);
      };
      area.append(box, check);
    }
    area.append(feedback, next);
  }

  async function showResult() {
    const area = $("quizArea");
    const total = session.questions.length;
    session.holder.practice = { correct: session.correct, total, at: today() };
    await app.save();
    app.render();
    area.innerHTML = "";
    area.append(el("div", "qtext", `Score: ${session.correct}/${total}`));
    if (session.wrong.length) {
      area.append(el("div", "meta", "Re-read these:"));
      const ul = el("ul", "checklist", "");
      for (const q of session.wrong) {
        const li = el("li", "", "");
        const a = el("a", "title", q.source ?? q.q.slice(0, 60));
        a.href = "#";
        a.onclick = (e) => {
          e.preventDefault();
          const file = session.targets.find((t) => (q.source ?? "").toLowerCase().includes(t.title.toLowerCase())) ?? session.targets[0];
          app.openItem(file);
        };
        li.append(a);
        ul.append(li);
      }
      area.append(ul);
    } else {
      area.append(el("div", "meta", "Perfect. You're ready for this one."));
    }
    showSavedInfoOnly();
  }

  function showSavedInfoOnly() {
    const s = selected();
    if (s) $("retakeBtn").style.display = s.holder.mockQuiz ? "inline-block" : "none";
  }

  // ---------- Chat with the tutor ----------
  let photo = null; // base64 JPEG (no prefix)

  // Photos are shrunk on your laptop before anything is sent.
  async function setPhoto(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.8);
    photo = url.split(",")[1];
    $("photoThumb").src = url;
    $("photoPreview").style.display = "flex";
  }
  function clearPhoto() {
    photo = null;
    $("photoPreview").style.display = "none";
    $("photoFile").value = "";
  }

  $("attachBtn").onclick = () => $("photoFile").click();
  $("photoFile").onchange = (e) => setPhoto(e.target.files[0]);
  $("photoRemove").onclick = clearPhoto;
  $("askInput").addEventListener("paste", (e) => {
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      setPhoto(file);
    }
  });
  $("askInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  $("sendBtn").onclick = send;

  async function send() {
    const q = $("askInput").value.trim();
    if (!q && !photo) return;
    // Nothing picked? Find the 2 lectures that best match the question (titles + summaries).
    let s = selected();
    if (!s || !s.targets.length) {
      const guess = guessFiles(q);
      if (!guess.length) {
        $("chatHint").textContent = "I couldn't tell which lecture that's about. Pick one at the top, or mention its topic.";
        return;
      }
      s = { targets: guess };
      $("chatHint").textContent = "Using: " + guess.map((g) => `${g.title} (${g.course ?? ""})`).join(", ") + ". Pick at the top to choose yourself.";
    }
    app.startNano();
    const sentPhoto = photo;
    $("askInput").value = "";
    clearPhoto();

    const log = $("chatLog");
    const you = el("div", "bubble you", q);
    if (sentPhoto) {
      const im = document.createElement("img");
      im.src = "data:image/jpeg;base64," + sentPhoto;
      im.className = "chat-img";
      you.append(im);
    }
    const bot = el("div", "bubble tutor", sentPhoto ? "Looking at your photo (cloud)..." : "Thinking on your laptop...");
    log.append(you, bot);
    bot.scrollIntoView({ block: "nearest" });

    try {
      const docs = await loadDocs(s.targets.slice(0, 4), app.sourceOf, (m) => (bot.textContent = m));
      bot.textContent = sentPhoto ? "Looking at your photo (cloud)..." : "Thinking on your laptop...";
      const chat = current; // the reply belongs to the chat it was asked in
      const { answer, refs, source } = await chatTutor({ question: q, photo: sentPhoto, docs, history: chat.history });
      const used = refs.map((r) => `${docs[r.f].item.title} · slide ${r.n}`).join(", ");
      chat.history.push({ q: q || "(photo)", a: answer, photo: !!sentPhoto, refs: used ? `Slides: ${used}` : null });
      if (chat.title === "New chat") chat.title = (q || "Photo check").slice(0, 40);
      if (!chat.target) chat.target = $("tutorTarget").value || "";
      fillChatPicker();
      saveChats();
      if (source) app.setStatus(source);

      bot.textContent = answer;
      // Show the real slides it used.
      if (refs.length) {
        const strip = el("div", "slides", "");
        for (const r of refs) {
          const d = docs[r.f];
          const fig = el("figure", "slide", "");
          const im = document.createElement("img");
          im.alt = `${d.item.title}, slide ${r.n}`;
          im.src = await slideImage(d.pdf, r.n, 600);
          im.onclick = () => fig.classList.toggle("big");
          fig.append(im, el("figcaption", "meta", `${d.item.title} · slide ${r.n}`));
          strip.append(fig);
        }
        bot.append(strip);
      }
      const where = String(source).includes("cloud") ? "cloud" : "on your laptop";
      bot.append(el("div", "meta", `(${where})`));
      bot.scrollIntoView({ block: "nearest" });
    } catch (err) {
      console.error(err);
      bot.textContent = "Sorry: " + err.message;
    }
  }

  function guessFiles(question) {
    const qw = (question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !/^(the|and|what|how|why|difference|between|explain|show|does|this|that|with|about)$/.test(w));
    if (!qw.length) return [];
    return app.items()
      .filter((x) => isPdf(x) && !/solution|answer/i.test(`${x.title} ${x.type}`))
      .map((x) => {
        const hay = `${x.title} ${x.course} ${x.summary ?? ""}`.toLowerCase();
        return { x, score: qw.filter((w) => hay.includes(w)).length + (qw.some((w) => x.title.toLowerCase().includes(w)) ? 2 : 0) };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((r) => r.x);
  }

  // ---------- helpers ----------
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  return { refresh: fillPicker };
}
