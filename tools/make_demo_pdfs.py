"""Generates the original lecture/assignment PDFs for the demo portal (docs/files).

All content is written for this project (no university material), so the demo
portal and the demo video are safe to share publicly.
Run:  python3 tools/make_demo_pdfs.py
"""
import math
import os
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white, black

OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "files")
W, H = landscape(A4)
NAVY = HexColor("#1f3a68")
ACCENT = HexColor("#e0a030")
GREY = HexColor("#555555")


# ---------- slide helpers ----------
def title_slide(c, course, title, sub="Demo University · Faculty of Engineering"):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 34)
    c.drawCentredString(W / 2, H / 2 + 30, title)
    c.setFont("Helvetica", 18)
    c.drawCentredString(W / 2, H / 2 - 10, course)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica", 13)
    c.drawCentredString(W / 2, H / 2 - 50, sub)
    c.showPage()


def header(c, text):
    c.setFillColor(NAVY)
    c.rect(0, H - 70, W, 70, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(40, H - 45, text)
    c.setFillColor(black)


def bullets(c, items, x=50, y=None, size=17, gap=30, width=None):
    y = y or H - 115
    c.setFont("Helvetica", size)
    for it in items:
        sub = it.startswith("  ")
        c.setFont("Helvetica", size - 2 if sub else size)
        c.setFillColor(GREY if sub else black)
        c.drawString(x + (30 if sub else 0), y, ("– " if sub else "• ") + it.strip())
        y -= gap
    c.setFillColor(black)
    return y


def text_slide(c, head, items):
    header(c, head)
    bullets(c, items)
    c.showPage()


def arrow(c, x1, y1, x2, y2, label=None, curve=0):
    c.setStrokeColor(black)
    c.setLineWidth(1.6)
    if curve:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        dx, dy = x2 - x1, y2 - y1
        cx, cy = mx - dy * curve, my + dx * curve
        p = c.beginPath()
        p.moveTo(x1, y1)
        p.curveTo(cx, cy, cx, cy, x2, y2)
        c.drawPath(p, stroke=1, fill=0)
        ang = math.atan2(y2 - cy, x2 - cx)
        lx, ly = cx, cy
    else:
        c.line(x1, y1, x2, y2)
        ang = math.atan2(y2 - y1, x2 - x1)
        lx, ly = (x1 + x2) / 2, (y1 + y2) / 2
    for s in (-1, 1):
        a = ang + math.pi + s * 0.4
        c.line(x2, y2, x2 + 12 * math.cos(a), y2 + 12 * math.sin(a))
    if label:
        c.setFont("Helvetica", 13)
        c.drawCentredString(lx, ly + 8, label)


def state(c, x, y, name, out=None, r=34):
    c.setStrokeColor(NAVY)
    c.setLineWidth(2)
    c.setFillColor(HexColor("#eef3fb"))
    c.circle(x, y, r, fill=1, stroke=1)
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(x, y + (2 if out is not None else -5), name)
    if out is not None:
        c.setFont("Helvetica", 12)
        c.drawCentredString(x, y - 14, f"z={out}")


def edge(c, a, b, label, curve=0, r=34):
    (x1, y1), (x2, y2) = a, b
    ang = math.atan2(y2 - y1, x2 - x1)
    arrow(c, x1 + r * math.cos(ang), y1 + r * math.sin(ang), x2 - r * math.cos(ang), y2 - r * math.sin(ang), label, curve)


def self_loop(c, x, y, label, r=34, up=True):
    s = 1 if up else -1
    c.setLineWidth(1.6)
    c.circle(x, y + s * (r + 16), 18, fill=0, stroke=1)
    c.setFont("Helvetica", 13)
    c.drawCentredString(x, y + s * (r + 44), label)


def box(c, x, y, w, h, label, fill="#eef3fb"):
    c.setStrokeColor(NAVY)
    c.setLineWidth(2)
    c.setFillColor(HexColor(fill))
    c.rect(x, y, w, h, fill=1, stroke=1)
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 14)
    lines = label.split("\n")
    for i, ln in enumerate(lines):
        c.drawCentredString(x + w / 2, y + h / 2 + (len(lines) - 1) * 9 - i * 18 - 5, ln)


def table(c, x, y, rows, colw=90, rowh=26):
    c.setLineWidth(1)
    for i, row in enumerate(rows):
        for j, cell in enumerate(row):
            cx, cy = x + j * colw, y - i * rowh
            if i == 0:
                c.setFillColor(HexColor("#dfe7f5"))
                c.rect(cx, cy - rowh, colw, rowh, fill=1, stroke=1)
                c.setFillColor(black)
                c.setFont("Helvetica-Bold", 13)
            else:
                c.rect(cx, cy - rowh, colw, rowh, fill=0, stroke=1)
                c.setFont("Helvetica", 13)
            c.drawCentredString(cx + colw / 2, cy - rowh + 8, str(cell))


def new_pdf(name):
    return canvas.Canvas(os.path.join(OUT, name), pagesize=landscape(A4))


# ---------- DSD301 (main demo course) ----------
DSD = "DSD301 · Digital System Design"


def dsd_lecture_7():
    c = new_pdf("DSD301_Lecture7_Latches_FlipFlops.pdf")
    title_slide(c, DSD, "Lecture 7: Latches and Flip-Flops")
    text_slide(c, "Combinational vs. Sequential", [
        "Combinational: outputs depend only on current inputs",
        "Sequential: outputs depend on inputs AND stored state",
        "  State = memory of the past, kept in storage elements",
        "Storage elements: latches (level-sensitive), flip-flops (edge-triggered)",
        "Synchronous circuits change state only on a clock edge",
    ])
    header(c, "SR Latch (NOR implementation)")
    box(c, 120, 300, 140, 70, "NOR")
    box(c, 120, 160, 140, 70, "NOR")
    arrow(c, 40, 345, 120, 345, "R")
    arrow(c, 40, 185, 120, 185, "S")
    arrow(c, 260, 335, 360, 335, "Q")
    arrow(c, 260, 195, 360, 195, "Q'")
    c.line(300, 335, 300, 260); c.line(300, 260, 90, 220); arrow(c, 90, 220, 120, 215)
    c.line(320, 195, 320, 270); c.line(320, 270, 90, 310); arrow(c, 90, 310, 120, 315)
    table(c, 470, 380, [["S", "R", "Q next"], [0, 0, "Q (hold)"], [0, 1, 0], [1, 0, 1], [1, 1, "invalid"]], colw=100)
    c.showPage()
    header(c, "D Flip-Flop")
    box(c, 300, 200, 200, 160, "D FF")
    arrow(c, 180, 320, 300, 320, "D")
    arrow(c, 180, 240, 300, 240, "CLK >")
    arrow(c, 500, 320, 620, 320, "Q")
    bullets(c, ["Q takes the value of D at the rising clock edge", "Holds Q until the next rising edge", "Characteristic equation:  Q(next) = D"], x=60, y=150, size=15, gap=24)
    c.showPage()
    text_slide(c, "Other Flip-Flops", [
        "JK flip-flop: J=K=1 toggles the output",
        "  Q(next) = J·Q' + K'·Q",
        "T flip-flop: toggles when T = 1",
        "  Q(next) = T XOR Q",
        "Setup time: D must be stable BEFORE the clock edge",
        "Hold time: D must stay stable AFTER the clock edge",
    ])
    header(c, "Timing Diagram: D Flip-Flop")
    y0 = 380
    c.setFont("Helvetica-Bold", 14)
    for i, name in enumerate(["CLK", "D", "Q"]):
        c.drawString(50, y0 - i * 90, name)
    c.setLineWidth(2)
    x = 120
    for k in range(8):
        c.line(x, y0, x, y0 + 30); c.line(x, y0 + 30, x + 40, y0 + 30); c.line(x + 40, y0 + 30, x + 40, y0); c.line(x + 40, y0, x + 80, y0)
        x += 80
    d = [0, 1, 1, 0, 0, 1, 0, 0]
    q = [0, 0, 1, 1, 0, 0, 1, 0]
    for row, vals in ((1, d), (2, q)):
        yb = y0 - row * 90
        x = 120 if row == 1 else 120
        for i, v in enumerate(vals):
            y = yb + (30 if v else 0)
            c.line(x, y, x + 80, y)
            if i + 1 < len(vals) and vals[i + 1] != v:
                c.line(x + 80, yb, x + 80, yb + 30)
            x += 80
    c.setFont("Helvetica", 13)
    c.drawString(120, 100, "Q copies D only at rising clock edges (dashed lines).")
    c.setDash(3, 3)
    for k in range(8):
        c.line(120 + k * 80, 120, 120 + k * 80, 420)
    c.setDash()
    c.showPage()
    c.save()


def dsd_lecture_8():
    c = new_pdf("DSD301_Lecture8_FSM_Moore.pdf")
    title_slide(c, DSD, "Lecture 8: Finite State Machines (Moore)")
    text_slide(c, "What is a Finite State Machine?", [
        "A sequential circuit with a finite number of states",
        "Next state = f(current state, inputs)",
        "Design steps:",
        "  1) State diagram  2) State table  3) State encoding",
        "  4) Next-state & output equations  5) Circuit / HDL",
    ])
    header(c, "Moore Machine: Block Diagram")
    box(c, 90, 220, 170, 90, "Next-State\nLogic")
    box(c, 340, 220, 140, 90, "State\nRegister")
    box(c, 560, 220, 170, 90, "Output\nLogic")
    arrow(c, 20, 265, 90, 265, "x")
    arrow(c, 260, 265, 340, 265)
    arrow(c, 480, 265, 560, 265)
    arrow(c, 730, 265, 800, 265, "z")
    c.line(410, 220, 410, 170); c.line(410, 170, 175, 170); arrow(c, 175, 170, 175, 220)
    bullets(c, ["Output depends ONLY on the current state"], x=60, y=120, size=16)
    c.showPage()
    header(c, "Example: Detect \"11\" (Moore)")
    pos = {"S0": (180, 300), "S1": (400, 300), "S2": (620, 300)}
    state(c, *pos["S0"], "S0", 0); state(c, *pos["S1"], "S1", 0); state(c, *pos["S2"], "S2", 1)
    edge(c, pos["S0"], pos["S1"], "x=1", curve=0.25)
    edge(c, pos["S1"], pos["S0"], "x=0", curve=0.25)
    edge(c, pos["S1"], pos["S2"], "x=1")
    edge(c, pos["S2"], pos["S0"], "x=0", curve=-0.35)
    self_loop(c, *pos["S0"], "x=0")
    self_loop(c, *pos["S2"], "x=1")
    c.setFont("Helvetica", 14)
    c.drawString(60, 110, "Output z = 1 while in S2 (two or more consecutive 1s seen).")
    c.showPage()
    header(c, "State Table and Encoding")
    table(c, 60, 400, [["Current", "x=0", "x=1", "z"], ["S0", "S0", "S1", 0], ["S1", "S0", "S2", 0], ["S2", "S0", "S2", 1]], colw=110)
    table(c, 560, 400, [["State", "Q1 Q0"], ["S0", "00"], ["S1", "01"], ["S2", "10"]], colw=100)
    bullets(c, ["Binary encoding needs ceil(log2 3) = 2 flip-flops", "One-hot encoding: 3 flip-flops, simpler logic"], x=60, y=200, size=15, gap=26)
    c.showPage()
    c.save()


def dsd_lecture_9():
    c = new_pdf("DSD301_Lecture9_Mealy_VHDL.pdf")
    title_slide(c, DSD, "Lecture 9: Mealy Machines and FSMs in VHDL")
    header(c, "Mealy Machine: Block Diagram")
    box(c, 90, 220, 170, 90, "Next-State\nLogic")
    box(c, 340, 220, 140, 90, "State\nRegister")
    box(c, 560, 220, 170, 90, "Output\nLogic")
    arrow(c, 20, 265, 90, 265, "x")
    arrow(c, 260, 265, 340, 265)
    arrow(c, 480, 265, 560, 265)
    arrow(c, 730, 265, 800, 265, "z")
    c.line(410, 220, 410, 170); c.line(410, 170, 175, 170); arrow(c, 175, 170, 175, 220)
    c.line(50, 265, 50, 380); c.line(50, 380, 645, 380); arrow(c, 645, 380, 645, 310, "x also feeds output")
    bullets(c, ["Output depends on current state AND current input"], x=60, y=120, size=16)
    c.showPage()
    text_slide(c, "Moore vs. Mealy", [
        "Moore: z = f(state)        Mealy: z = f(state, input)",
        "Mealy usually needs FEWER states",
        "Mealy reacts in the same cycle; Moore one cycle later",
        "Moore outputs are glitch-free (only change on clock edges)",
        "Mealy outputs can glitch if inputs change between edges",
    ])
    header(c, "Example: Detect \"101\" (Mealy, overlapping)")
    pos = {"A": (180, 290), "B": (420, 290), "C": (660, 290)}
    for n, p in pos.items():
        state(c, *p, n)
    edge(c, pos["A"], pos["B"], "1/0", curve=0.2)
    edge(c, pos["B"], pos["C"], "0/0", curve=0.2)
    edge(c, pos["C"], pos["B"], "1/1", curve=0.2)
    edge(c, pos["C"], pos["A"], "0/0", curve=-0.3)
    self_loop(c, *pos["A"], "0/0")
    self_loop(c, *pos["B"], "1/0")
    c.setFont("Helvetica", 14)
    c.drawString(60, 100, "Labels are input/output. Output 1 on the transition that completes 101.")
    c.showPage()
    header(c, "FSM in VHDL: Two-Process Style")
    c.setFont("Courier", 12.5)
    code = [
        "type state_t is (A, B, C);",
        "signal cur, nxt : state_t;",
        "",
        "reg: process(clk, rst) begin            -- state register",
        "  if rst = '1' then cur <= A;",
        "  elsif rising_edge(clk) then cur <= nxt; end if;",
        "end process;",
        "",
        "comb: process(cur, x) begin             -- next state + Mealy output",
        "  z <= '0'; nxt <= cur;                 -- defaults avoid latches",
        "  case cur is",
        "    when A => if x = '1' then nxt <= B; end if;",
        "    when B => if x = '0' then nxt <= C; end if;",
        "    when C => if x = '1' then nxt <= B; z <= '1'; else nxt <= A; end if;",
        "  end case;",
        "end process;",
    ]
    y = H - 110
    for ln in code:
        c.drawString(50, y, ln)
        y -= 21
    c.showPage()
    text_slide(c, "Common Mistakes", [
        "Missing default assignments in the combinational process",
        "  -> synthesis infers unwanted latches",
        "Putting a Mealy output inside the clocked process",
        "  -> output is delayed by one clock cycle",
        "Forgetting signals in the sensitivity list (simulation mismatch)",
    ])
    c.save()


def dsd_practice(n, topic, questions, solution=False):
    tag = "Solution" if solution else ""
    c = new_pdf(f"DSD301_Practice{n}{'_Solution' if solution else ''}.pdf")
    title_slide(c, DSD, f"Practice Assignment {n}{' – Solution' if solution else ''}", topic)
    header(c, f"Practice Assignment {n}: {topic}" + (" (Solution)" if solution else ""))
    y = H - 115
    for i, (q, a) in enumerate(questions, 1):
        c.setFont("Helvetica-Bold", 15)
        c.drawString(50, y, f"Exercise {i}")
        y -= 24
        c.setFont("Helvetica", 14)
        for ln in q.split("\n"):
            c.drawString(70, y, ln); y -= 21
        if solution:
            c.setFillColor(HexColor("#1d6b40"))
            for ln in a.split("\n"):
                c.drawString(70, y, "> " + ln); y -= 21
            c.setFillColor(black)
        y -= 12
    c.showPage()
    c.save()


DSD_PRACTICE = {
    6: ("Latches and Flip-Flops", [
        ("Draw the timing of Q for a positive-edge D flip-flop given CLK and D\n(waveforms in class). Mark where Q changes.", "Q changes only at rising edges, copying D just before each edge."),
        ("A JK flip-flop has J=1, K=1 and Q=0. What is Q after 3 clock edges?", "It toggles each edge: 1, 0, 1  ->  Q = 1."),
        ("Explain setup and hold time in one sentence each.", "Setup: D stable before the edge. Hold: D stable after the edge."),
    ]),
    7: ("Moore Machines", [
        ("Design a Moore FSM that outputs 1 after the input sequence 11.\nGive the state diagram and state table.", "States S0,S1,S2 with z=1 only in S2 (see Lecture 8)."),
        ("How many flip-flops are needed for 5 states with binary encoding?\nWith one-hot encoding?", "Binary: 3 (since 2^3 >= 5). One-hot: 5."),
        ("Derive the next-state equations for your FSM from Exercise 1.", "With S0=00,S1=01,S2=10: Q1+ = x(Q1+Q0), Q0+ = x·Q1'·Q0'."),
    ]),
    8: ("Mealy Machines and VHDL", [
        ("Design a Mealy FSM detecting 101 (overlapping). How many states?", "3 states: A, B, C; output 1 on C --1--> B."),
        ("Convert the 101 detector to a Moore machine. How many states now?", "4 states; Moore needs an extra state to hold the output."),
        ("Find the bug: a Mealy output is assigned inside the clocked process.\nWhat changes in the waveform?", "The output is delayed by one clock cycle (registered)."),
    ]),
}

# Short "background" lectures so the course looks complete (and summaries/search have real text).
DSD_EARLY = {
    1: ("Number Systems", ["Binary, octal, hexadecimal", "Conversions between bases", "Two's complement for signed numbers", "  -5 in 8 bits = 11111011"]),
    2: ("Boolean Algebra", ["AND, OR, NOT; identities and De Morgan's laws", "  (A·B)' = A' + B'", "Canonical forms: SOP and POS", "Minterms and maxterms"]),
    3: ("Karnaugh Maps", ["Group 1s in powers of two", "Wrap-around adjacency", "Don't-care conditions help larger groups", "Find minimal SOP expressions"]),
    4: ("Combinational Building Blocks", ["Multiplexers and demultiplexers", "Decoders and encoders", "Half and full adders", "Ripple-carry adder delay"]),
    5: ("Combinational Design in VHDL", ["Entity and architecture", "Concurrent signal assignment", "with-select and when-else", "Testbenches for simulation"]),
    6: ("Arithmetic Circuits", ["Carry-lookahead adder", "Subtraction with two's complement", "Overflow detection", "Comparators"]),
}


def simple_lecture(fname, course, title, slides):
    c = new_pdf(fname)
    title_slide(c, course, title)
    for head, items in slides:
        text_slide(c, head, items)
    c.save()


# ---------- Other demo courses (short, so the portal looks realistic) ----------
OTHER = {
    "DMA201 · Discrete Mathematics": [
        ("DMA201_Lecture1_Logic.pdf", "Lecture 1: Propositional Logic", [("Propositions", ["Statements that are true or false", "Connectives: NOT, AND, OR, IMPLIES, IFF", "Truth tables", "Tautologies and contradictions"])]),
        ("DMA201_Lecture2_Proofs.pdf", "Lecture 2: Proof Techniques", [("Methods", ["Direct proof", "Proof by contrapositive", "Proof by contradiction", "  Example: sqrt(2) is irrational"])]),
        ("DMA201_Lecture3_Induction.pdf", "Lecture 3: Mathematical Induction", [("Induction", ["Base case: prove P(1)", "Inductive step: P(k) implies P(k+1)", "Example: 1+2+...+n = n(n+1)/2", "Strong induction"])]),
        ("DMA201_Lecture4_Sets.pdf", "Lecture 4: Sets and Relations", [("Sets", ["Union, intersection, difference", "Power set has 2^n elements", "Relations: reflexive, symmetric, transitive", "Equivalence relations"])]),
        ("DMA201_Practice3.pdf", "Practice Assignment 3: Induction", [("Exercises", ["Prove 2^n > n for all n >= 1", "Prove n^3 - n is divisible by 3", "Find the error in a given 'proof'"])]),
    ],
    "DBS301 · Databases I": [
        ("DBS301_Lecture1_ER.pdf", "Lecture 1: ER Modeling", [("ER Model", ["Entities, attributes, relationships", "Cardinality: 1:1, 1:N, M:N", "Weak entities", "Mapping ER to tables"])]),
        ("DBS301_Lecture2_SQL.pdf", "Lecture 2: SQL Basics", [("SQL", ["SELECT ... FROM ... WHERE", "JOINs: inner, left, right", "GROUP BY and HAVING", "Subqueries"])]),
        ("DBS301_Lecture3_FDs.pdf", "Lecture 3: Functional Dependencies", [("Normalization", ["Functional dependency X -> Y", "Closure of attributes", "1NF, 2NF, 3NF, BCNF", "Lossless decomposition"])]),
        ("DBS301_Project_Description.pdf", "Project Description", [("Project", ["Design a database for a delivery marketplace", "Milestone 1: ER diagram", "Milestone 2: SQL schema + queries", "Milestone 3: stored procedures"])]),
    ],
    "NET301 · Communication Networks": [
        ("NET301_Lecture1_Layers.pdf", "Lecture 1: Network Layers", [("Layers", ["Application, transport, network, link, physical", "Encapsulation", "Packet switching vs circuit switching"])]),
        ("NET301_Lecture2_TCP.pdf", "Lecture 2: TCP and UDP", [("Transport", ["TCP: reliable, connection-oriented", "Three-way handshake: SYN, SYN-ACK, ACK", "UDP: fast, no guarantees", "Ports and sockets"])]),
    ],
    "TOC301 · Theory of Computation": [
        ("TOC301_Lecture1_DFA.pdf", "Lecture 1: Finite Automata", [("DFA", ["States, alphabet, transitions", "Accepting states", "Regular languages", "NFA to DFA conversion"])]),
        ("TOC301_Lecture2_Regex.pdf", "Lecture 2: Regular Expressions", [("Regex", ["Union, concatenation, star", "Regex <-> NFA", "Pumping lemma (intro)"])]),
    ],
    "MED301 · Introduction to Media Engineering": [
        ("MED301_Lecture1_3D.pdf", "Lecture 1: 3D Modeling Basics", [("3D", ["Vertices, edges, faces", "Modifiers and subdivision", "Materials and lighting basics"])]),
        ("MED301_Assignment2.pdf", "Assignment 2: Toy Creature", [("Task", ["Model a toy creature", "Use at least 3 modifiers", "Render with 3-point lighting"])]),
    ],
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for n, (topic, items) in DSD_EARLY.items():
        simple_lecture(f"DSD301_Lecture{n}.pdf", DSD, f"Lecture {n}: {topic}", [(topic, items)])
    dsd_lecture_7()
    dsd_lecture_8()
    dsd_lecture_9()
    for n, (topic, qs) in DSD_PRACTICE.items():
        dsd_practice(n, topic, qs)
        dsd_practice(n, topic, qs, solution=True)
    for course, files in OTHER.items():
        for fname, title, slides in files:
            simple_lecture(fname, course, title, slides)
    print("PDFs:", len(os.listdir(OUT)))


if __name__ == "__main__":
    main()
