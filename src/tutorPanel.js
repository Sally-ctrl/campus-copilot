import { makeMockQuiz, gradeShort, askTutor, styleExamples } from "./tutor.js";

// The Tutor tab: pick a quiz or lecture, then "Quiz me" or "Ask".
// `app` gives access to the list and helpers in sidepanel.js.
export function initTutor(app) {
  const $ = (id) => document.getElementById(id);
  const isPdf = (x) => x.localFile || (x.link && /\.pdf($|\?)/i.test(x.link));
  const today = () => new Date().toISOString().slice(0, 10);

  let session = null; // { holder, questions, i, correct, answered, wrong: [] }
  const history = [];

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

  // ---------- Ask the tutor ----------
  $("askInput").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    const q = e.target.value.trim();
    if (!q) return;
    app.startNano();
    e.target.value = "";
    const s = selected();
    const context = s ? s.targets : app.items().filter((x) => x.summary).slice(0, 10);
    const box = $("askLog");
    const qEl = el("div", "you", q);
    const aEl = el("div", "tutor", "Thinking on your laptop...");
    box.prepend(aEl);
    box.prepend(qEl);
    try {
      const { answer, source } = await askTutor(q, context, history);
      history.push({ q, a: answer });
      aEl.textContent = answer;
      const where = String(source ?? "").includes("cloud") ? "cloud" : "on your laptop";
      aEl.append(el("div", "meta", `(${where})`));
      if (source) app.setStatus(source);
    } catch (err) {
      aEl.textContent = "Sorry: " + err.message;
    }
  });

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
