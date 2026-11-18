// Demo University course portal: fictional data, built for judging Campus Copilot.
// Pages use the same structure as a real course portal so the extension works unchanged.
// All dates are relative to TODAY, so "Quiz 2" is always tomorrow whenever you open it.

const DAY = 86400000;
const today = new Date(new Date().toDateString());
const addDays = (n) => new Date(today.getTime() + n * DAY);

// Portal weeks start on Saturday and are written unpadded, like "2026-11-7".
function weekStart(weeksAgo) {
  const d = new Date(today);
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7) - weeksAgo * 7);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function longDate(d) {
  const n = d.getDate();
  const suf = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${d.toLocaleDateString("en-US", { weekday: "long" })} ${n}${suf} of ${d.toLocaleDateString("en-US", { month: "long" })}`;
}
const shortDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

const F = (name) => `files/${name}.pdf`;
let nextId = 500100;
const item = (n, title, type, file, seen = false) => ({ id: nextId++, n, title, type, file, seen });

const COURSES = [
  {
    id: 301, code: "DSD301", name: "Digital System Design",
    announcements: () => `
      <p><span style="font-size:18pt"><strong>Quiz 2 Distribution</strong></span></p>
      <h3>${longDate(addDays(1))}, from 3:45 to 4:25</h3>
      <p><strong>Tutorial Groups:</strong></p>
      <ul>
        <li><p><strong>Exam Hall 1:</strong> T5 – T6</p></li>
        <li><p><strong>Exam Hall 2:</strong> T7 – T13</p></li>
        <li><p><strong>Exam Hall 3:</strong> T14 – T19</p></li>
      </ul>
      <h3>${longDate(addDays(1))}, from 4:30 to 5:10</h3>
      <p><strong>Tutorial Groups:</strong></p>
      <ul>
        <li><p><strong>Exam Hall 1:</strong> T20</p></li>
        <li><p><strong>Exam Hall 2:</strong> T21 – T26</p></li>
        <li><p><strong>Exam Hall 3:</strong> T27 – T31</p></li>
      </ul>
      <p><strong>Important Instructions:</strong> bring your university ID. No calculators. Arrive 10 minutes early.</p>
      <hr />
      <p><strong>Project Milestone 2</strong> submission deadline: ${shortDate(addDays(6))} at 23:59 through the portal. Late submissions are not accepted.</p>
      <hr />
      <p><strong>Office Hours (Teaching Assistants)</strong></p>
      <table class="oh">
        <tr><th>TA</th><th>Day</th><th>Slot</th></tr>
        <tr><td><strong>TA Mona</strong></td><td>Sunday</td><td>3rd</td></tr>
        <tr><td></td><td>Tuesday</td><td>2nd, 3rd</td></tr>
        <tr><td><strong>TA Karim</strong></td><td>Monday</td><td>5th</td></tr>
        <tr><td></td><td>Wednesday</td><td>1st, 2nd</td></tr>
        <tr><td><strong>TA Youssef</strong></td><td>Monday</td><td>3rd, 4th</td></tr>
      </table>
      <p>Please contact the TA assigned to your project team during the office hours listed above.</p>`,
    weeks: [
      { desc: "Week 9", items: [item(1, "Lecture 9", "Lecture slides", F("DSD301_Lecture9_Mealy_VHDL")), item(2, "Practice Assignment 8", "Assignment ", F("DSD301_Practice8"))] },
      { desc: "Week 8", items: [item(1, "Lecture 8", "Lecture slides", F("DSD301_Lecture8_FSM_Moore"), true), item(2, "Practice Assignment 7", "Assignment ", F("DSD301_Practice7"), true), item(3, "Practice Assignment 6 Solution", "Assignment solution", F("DSD301_Practice6_Solution"), true)] },
      { desc: "Week 7", items: [item(1, "Lecture 7", "Lecture slides", F("DSD301_Lecture7_Latches_FlipFlops"), true), item(2, "Practice Assignment 6", "Assignment ", F("DSD301_Practice6"), true), item(3, "Practice Assignment 7 Solution", "Assignment solution", F("DSD301_Practice7_Solution"))] },
      { desc: "Week 6", items: [item(1, "Lecture 6", "Lecture slides", F("DSD301_Lecture6"), true)] },
      { desc: "Week 5", items: [item(1, "Lecture 5", "Lecture slides", F("DSD301_Lecture5"), true)] },
      { desc: "Week 4", items: [item(1, "Lecture 4", "Lecture slides", F("DSD301_Lecture4"), true)] },
      { desc: "Week 3", items: [item(1, "Lecture 3", "Lecture slides", F("DSD301_Lecture3"), true)] },
      { desc: "Week 2", items: [item(1, "Lecture 2", "Lecture slides", F("DSD301_Lecture2"), true)] },
      { desc: "Week 1", items: [item(1, "Lecture 1", "Lecture slides", F("DSD301_Lecture1"), true)] },
    ],
  },
  {
    id: 201, code: "DMA201", name: "Discrete Mathematics",
    announcements: () => `
      <p><strong>Quiz 3</strong> will be held on ${longDate(addDays(5))} at 11:45 in the Main Hall. It covers induction and sets.</p>
      <p>Grades of Quiz 2 are now published. Rechecking requests close next Thursday.</p>`,
    weeks: [
      { desc: "Week 4", items: [item(1, "Lecture 4 Sets and Relations", "Lecture slides", F("DMA201_Lecture4_Sets")), item(2, "Practice Assignment 3", "Assignment ", F("DMA201_Practice3"))] },
      { desc: "Week 3", items: [item(1, "Lecture 3 Mathematical Induction", "Lecture slides", F("DMA201_Lecture3_Induction"), true)] },
      { desc: "Week 2", items: [item(1, "Lecture 2 Proof Techniques", "Lecture slides", F("DMA201_Lecture2_Proofs"), true)] },
      { desc: "Week 1", items: [item(1, "Lecture 1 Propositional Logic", "Lecture slides", F("DMA201_Lecture1_Logic"), true)] },
    ],
  },
  {
    id: 126, code: "DBS301", name: "Databases I",
    announcements: () => `
      <p><strong>Project Milestone 2</strong> (SQL schema and queries) is due on ${shortDate(addDays(4))} at 23:59. Submit one file per team.</p>
      <p>Lab 5 is moved to room C3.201 this week only.</p>`,
    weeks: [
      { desc: "Week 3", items: [item(1, "Lecture 3 Functional Dependencies", "Lecture slides", F("DBS301_Lecture3_FDs")), item(2, "Project Description", "Project", F("DBS301_Project_Description"), true)] },
      { desc: "Week 2", items: [item(1, "Lecture 2 SQL Basics", "Lecture slides", F("DBS301_Lecture2_SQL"), true)] },
      { desc: "Week 1", items: [item(1, "Lecture 1 ER Modeling", "Lecture slides", F("DBS301_Lecture1_ER"), true)] },
    ],
  },
  {
    id: 411, code: "NET301", name: "Introduction to Communication Networks",
    announcements: () => `
      <p>There will be no tutorials next week because of the activity week.</p>
      <p>Lecture recordings are available on request.</p>`,
    weeks: [
      { desc: "Week 2", items: [item(1, "Lecture 2 TCP and UDP", "Lecture slides", F("NET301_Lecture2_TCP"))] },
      { desc: "Week 1", items: [item(1, "Lecture 1 Network Layers", "Lecture slides", F("NET301_Lecture1_Layers"), true)] },
    ],
  },
  {
    id: 127, code: "TOC301", name: "Theory of Computation",
    announcements: () => `<p>Quiz 1 grades are published. Model answers will be discussed in the tutorials.</p>`,
    weeks: [
      { desc: "Week 2", items: [item(1, "Lecture 2 Regular Expressions", "Lecture slides", F("TOC301_Lecture2_Regex"))] },
      { desc: "Week 1", items: [item(1, "Lecture 1 Finite Automata", "Lecture slides", F("TOC301_Lecture1_DFA"), true)] },
    ],
  },
  {
    id: 125, code: "MED301", name: "Introduction to Media Engineering",
    announcements: () => `<p><strong>Assignment 2</strong> (toy creature) is due on ${shortDate(addDays(10))} at 23:59.</p>`,
    weeks: [
      { desc: "Week 2", items: [item(1, "Assignment 2", "Assignment ", F("MED301_Assignment2"))] },
      { desc: "Week 1", items: [item(1, "Lecture 1 3D Modeling Basics", "Lecture slides", F("MED301_Lecture1_3D"), true)] },
    ],
  },
];

const P = "ContentPlaceHolderright_ContentPlaceHoldercontent_";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function renderCourseList(el) {
  el.innerHTML = `
    <p class="hint">[To access old seasons: Menu --> Courses --> All Courses]</p>
    <table class="courses">
      <tr><th></th><th>Name</th><th>Active</th><th>Season</th></tr>
      ${COURSES.map((c) => `
        <tr>
          <td><a class="btn" href="CourseViewStn.html?id=${c.id}&sid=1">View Course</a></td>
          <td>(|${c.code}|) ${esc(c.name)} (${c.id})</td>
          <td>Active</td><td>Winter ${today.getFullYear()}</td>
        </tr>`).join("")}
    </table>`;
}

function renderCourse(el, id) {
  const c = COURSES.find((x) => String(x.id) === String(id)) ?? COURSES[0];
  const unseen = c.weeks.flatMap((w) => w.items).filter((i) => !i.seen).length;
  el.innerHTML = `
    <h1 id="${P}LabelCourseName">(|${c.code}|) ${esc(c.name)} (${c.id})</h1>
    <div class="stats">
      <div><b>${c.weeks.length}</b><span>Total Weeks</span></div>
      <div><b>${unseen}</b><span>Unseen Content</span></div>
      <div><b>0</b><span>Group Chat Messages</span></div>
    </div>
    <div class="card"><div id="${P}desc" class="desc">${c.announcements()}</div></div>
    ${c.weeks.map((w, wi) => `
      <div class="card weeksdata">
        <div class="card-header"><h2>Week: ${weekStart(wi)}</h2></div>
        <div class="p-3">
          <div style="display:none"><div><strong>Announcement</strong></div><p class="m-2 p2"></p></div>
          <div><div><strong>Description</strong></div><p class="m-2 p2">${esc(w.desc)}</p></div>
          <div><strong>Content</strong>
            ${w.items.map((i) => `
              <div class="card item"><div class="card-body">
                <div id="content${i.id}"><strong>${i.n} - ${esc(i.title)}</strong> (${esc(i.type)})</div>
                <div><a href="${i.file}" class="btn contentbtn" download data-contentid="${i.id}" data-seen="${i.seen ? "yes" : "no"}">Download Content</a></div>
                <span class="seen">${i.seen ? "👁 opened" : "not opened"}</span>
              </div></div>`).join("")}
          </div>
        </div>
      </div>`).join("")}`;
}
