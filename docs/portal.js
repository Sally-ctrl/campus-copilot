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
      <p><strong>Quiz 2 covers Lectures 7 to 9</strong> (latches, flip-flops, Moore and Mealy machines, FSMs in VHDL). Sample Quiz 2 from last semester is posted in Week 9.</p>
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
      { desc: "Week 9", ann: `Lab Assessment 2 (FSM in VHDL) is on ${longDate(addDays(3))} in your lab slot. T13 – T15: 2nd slot, Lab C6.207. T16 – T19: 4th slot, Lab C6.208. Bring your own testbench.`, items: [item(1, "Lecture 9", "Lecture slides", F("DSD301_Lecture9_Mealy_VHDL")), item(2, "Practice Assignment 8", "Assignment ", F("DSD301_Practice8")), item(3, "Sample Quiz 2 (WS25)", "Quiz", F("DSD301_Sample_Quiz2_WS25")), item(4, "Sample Quiz 2 (WS25) Solution", "Quiz solution", F("DSD301_Sample_Quiz2_WS25_Solution"))] },
      { desc: "Week 8", items: [item(1, "Lecture 8", "Lecture slides", F("DSD301_Lecture8_FSM_Moore"), true), item(2, "Practice Assignment 7", "Assignment ", F("DSD301_Practice7"), true), item(3, "Practice Assignment 6 Solution", "Assignment solution", F("DSD301_Practice6_Solution"), true)] },
      { desc: "Week 7", items: [item(1, "Lecture 7", "Lecture slides", F("DSD301_Lecture7_Latches_FlipFlops"), true), item(2, "Practice Assignment 6", "Assignment ", F("DSD301_Practice6"), true), item(3, "Practice Assignment 7 Solution", "Assignment solution", F("DSD301_Practice7_Solution"))] },
      { desc: "Week 6", items: [item(1, "Lecture 6", "Lecture slides", F("DSD301_Lecture6"), true)] },
      { desc: "Week 5", items: [item(1, "Lecture 5", "Lecture slides", F("DSD301_Lecture5"), true), item(2, "Sample Quiz 1 (WS25)", "Quiz", F("DSD301_Sample_Quiz1_WS25"), true), item(3, "Sample Quiz 1 (WS25) Solution", "Quiz solution", F("DSD301_Sample_Quiz1_WS25_Solution"), true)] },
      { desc: "Week 4", items: [item(1, "Lecture 4", "Lecture slides", F("DSD301_Lecture4"), true)] },
      { desc: "Week 3", items: [item(1, "Lecture 3", "Lecture slides", F("DSD301_Lecture3"), true)] },
      { desc: "Week 2", items: [item(1, "Lecture 2", "Lecture slides", F("DSD301_Lecture2"), true)] },
      { desc: "Week 1", items: [item(1, "Lecture 1", "Lecture slides", F("DSD301_Lecture1"), true)] },
    ],
  },
  {
    id: 201, code: "DMA201", name: "Discrete Mathematics",
    announcements: () => `
      <p><strong>UPDATE: Quiz 3 is postponed</strong> because of the activity week. The new date is ${longDate(addDays(5))} at 11:45 in the Main Hall (it was ${shortDate(addDays(2))}). It covers Lectures 3 and 4 (induction, sets and relations).</p>
      <p><strong>Assignment 4</strong> (sets and relations) must be submitted by ${shortDate(addDays(2))} at 23:59 on the portal. Scanned handwritten solutions are accepted.</p>
      <p>Grades of Quiz 2 are now published. Rechecking requests close next Thursday.</p>
      <p><strong>Regarding the 10% classwork grade:</strong> there will be no more online homework this semester. Instead, we will hold in-class assignments during your next tutorials, each one covering the practice assignment of the week before. Because of the activity week, the last teaching week for all groups starts on ${longDate(addDays(14))} and coincides with Quiz 4, so there will be no in-class assignment in those final tutorials. Only your best 3 classwork grades will count, so missing one is not the end of the world.</p>`,
    weeks: [
      { desc: "Week 5", ann: "The solution of Practice Assignment 3 is uploaded. Sample Quiz 3 from last semester is a good preparation for Quiz 3.", items: [item(1, "Lecture 5 Functions", "Lecture slides", F("DMA201_Lecture5_Functions")), item(2, "Assignment 4", "Assignment ", F("DMA201_Practice4")), item(3, "Sample Quiz 3 (WS25)", "Quiz", F("DMA201_Sample_Quiz3_WS25")), item(4, "Sample Quiz 3 (WS25) Solution", "Quiz solution", F("DMA201_Sample_Quiz3_WS25_Solution"))] },
      { desc: "Week 4", items: [item(1, "Lecture 4 Sets and Relations", "Lecture slides", F("DMA201_Lecture4_Sets")), item(2, "Practice Assignment 3", "Assignment ", F("DMA201_Practice3"), true), item(3, "Practice Assignment 3 Solution", "Assignment solution", F("DMA201_Practice3_Solution"))] },
      { desc: "Week 3", items: [item(1, "Lecture 3 Mathematical Induction", "Lecture slides", F("DMA201_Lecture3_Induction"), true)] },
      { desc: "Week 2", items: [item(1, "Lecture 2 Proof Techniques", "Lecture slides", F("DMA201_Lecture2_Proofs"), true)] },
      { desc: "Week 1", items: [item(1, "Lecture 1 Propositional Logic", "Lecture slides", F("DMA201_Lecture1_Logic"), true)] },
    ],
  },
  {
    id: 126, code: "DBS301", name: "Databases I",
    announcements: () => `
      <p><strong>Project Milestone 2</strong> (SQL schema and queries) is due on ${shortDate(addDays(4))} at 23:59. Submit one file per team.</p>
      <p><strong>Quiz 1</strong> (ER modeling and SQL, Lectures 1 and 2) will be held on ${longDate(addDays(8))} during the tutorial slots:</p>
      <ul>
        <li>T5 – T12: 2nd slot, C7.301</li>
        <li>T13 – T16: 3rd slot, C7.301</li>
        <li>T17 – T24: 4th slot, C7.302</li>
      </ul>
      <p>Lab 5 is moved to room C3.201 this week only.</p>`,
    weeks: [
      { desc: "Week 4", ann: "Correction: Milestone 2 now requires 12 queries, not 10. The updated description is uploaded below.", items: [item(1, "Lecture 4 Normalization", "Lecture slides", F("DBS301_Lecture4_Normalization")), item(2, "Milestone 2 Description (updated)", "Project", F("DBS301_Milestone2_Description")), item(3, "Sample Quiz 1 (WS25)", "Quiz", F("DBS301_Sample_Quiz1_WS25")), item(4, "Sample Quiz 1 (WS25) Solution", "Quiz solution", F("DBS301_Sample_Quiz1_WS25_Solution"))] },
      { desc: "Week 3", items: [item(1, "Lecture 3 Functional Dependencies", "Lecture slides", F("DBS301_Lecture3_FDs"), true), item(2, "Practice Sheet 2", "Assignment ", F("DBS301_Practice2")), item(3, "Project Description", "Project", F("DBS301_Project_Description"), true)] },
      { desc: "Week 2", items: [item(1, "Lecture 2 SQL Basics", "Lecture slides", F("DBS301_Lecture2_SQL"), true)] },
      { desc: "Week 1", items: [item(1, "Lecture 1 ER Modeling", "Lecture slides", F("DBS301_Lecture1_ER"), true)] },
    ],
  },
  {
    id: 411, code: "NET301", name: "Introduction to Communication Networks",
    announcements: () => `
      <p><strong>Assignment 1</strong> (subnetting) is due on ${shortDate(addDays(3))} at 23:59. Submit a single PDF through the portal.</p>
      <p><strong>Quiz 1</strong> will be held on ${longDate(addDays(12))} at 13:30 in Exam Hall 2. It covers Lectures 1 to 3.</p>
      <p>There will be no tutorials next week because of the activity week.</p>
      <p>Lecture recordings are available on request.</p>`,
    weeks: [
      { desc: "Week 3", items: [item(1, "Lecture 3 IP Addressing and Subnetting", "Lecture slides", F("NET301_Lecture3_IP")), item(2, "Assignment 1", "Assignment ", F("NET301_Assignment1")), item(3, "Sample Quiz 1 (WS25)", "Quiz", F("NET301_Sample_Quiz1_WS25")), item(4, "Sample Quiz 1 (WS25) Solution", "Quiz solution", F("NET301_Sample_Quiz1_WS25_Solution"))] },
      { desc: "Week 2", items: [item(1, "Lecture 2 TCP and UDP", "Lecture slides", F("NET301_Lecture2_TCP"), true)] },
      { desc: "Week 1", items: [item(1, "Lecture 1 Network Layers", "Lecture slides", F("NET301_Lecture1_Layers"), true)] },
    ],
  },
  {
    id: 127, code: "TOC301", name: "Theory of Computation",
    announcements: () => `
      <p>Quiz 1 grades are published. Model answers will be discussed in the tutorials.</p>
      <p><strong>Quiz 2</strong> is on ${longDate(addDays(9))} in your tutorial slot. It covers Lectures 2 and 3 (regular expressions and NFAs).</p>`,
    weeks: [
      { desc: "Week 3", ann: `Problem Set 2 is uploaded. Deadline: ${shortDate(addDays(7))} at 23:59 on the portal.`, items: [item(1, "Lecture 3 NFAs", "Lecture slides", F("TOC301_Lecture3_NFA")), item(2, "Problem Set 2", "Assignment ", F("TOC301_Problem_Set2")), item(3, "Sample Quiz 2 (WS25)", "Quiz", F("TOC301_Sample_Quiz2_WS25")), item(4, "Sample Quiz 2 (WS25) Solution", "Quiz solution", F("TOC301_Sample_Quiz2_WS25_Solution"))] },
      { desc: "Week 2", items: [item(1, "Lecture 2 Regular Expressions", "Lecture slides", F("TOC301_Lecture2_Regex"), true)] },
      { desc: "Week 1", items: [item(1, "Lecture 1 Finite Automata", "Lecture slides", F("TOC301_Lecture1_DFA"), true)] },
    ],
  },
  {
    id: 125, code: "MED301", name: "Introduction to Media Engineering",
    announcements: () => `
      <p><strong>Assignment 2</strong> (toy creature) is due on ${shortDate(addDays(10))} at 23:59.</p>
      <p><strong>Assignment 3</strong> (textured scene) is released. It builds on Assignment 2 and is due on ${shortDate(addDays(21))} at 23:59.</p>`,
    weeks: [
      { desc: "Week 3", items: [item(1, "Lecture 2 Materials, Texturing and Lighting", "Lecture slides", F("MED301_Lecture2_Texturing")), item(2, "Assignment 3", "Assignment ", F("MED301_Assignment3"))] },
      { desc: "Week 2", items: [item(1, "Assignment 2", "Assignment ", F("MED301_Assignment2"), true)] },
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
          <div${w.ann ? "" : ' style="display:none"'}><div><strong>Announcement</strong></div><p class="m-2 p2 ann">${w.ann ? esc(w.ann) : ""}</p></div>
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
