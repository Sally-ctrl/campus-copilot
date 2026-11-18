"""DSD301 demo course: full lectures, practice assignments and sample quizzes (original content)."""
import os
from slidekit import Deck, W, H, NAVY, GREY, GREEN, RED, black

COURSE = "DSD301 · Digital System Design"


def lecture7(out):
    d = Deck(os.path.join(out, "DSD301_Lecture7_Latches_FlipFlops.pdf"), COURSE)
    d.title("Lecture 7: Latches and Flip-Flops")

    d.page("Outline")
    d.bullets(["Why digital circuits need memory", "The bistable element", "SR latch and gated D latch",
               "Edge-triggered D flip-flop (master-slave)", "JK and T flip-flops", "Timing: setup, hold, clock-to-Q",
               "Worked example: a 4-bit shift register", "Check yourself"], y=H - 110, gap=30, size=17)
    d.end()

    d.page("Combinational vs. Sequential Circuits")
    d.bullets(["Combinational: outputs depend only on the CURRENT inputs (adders, MUXes, decoders)",
               "Sequential: outputs depend on current inputs AND on what happened before",
               "  The 'what happened before' is stored as the circuit's STATE",
               "State is kept in storage elements: latches and flip-flops"], maxw=W - 420)
    d.box(520, 260, 140, 80, "Combinational\nLogic")
    d.box(560, 140, 100, 60, "Memory")
    d.arrow(460, 320, 520, 320, "inputs", ly=8)
    d.arrow(660, 300, 760, 300, "outputs")
    d.wire([(660, 280, ), (700, 280), (700, 170), (660, 170)]); d.arrow(700, 170, 662, 170, head=True)
    d.wire([(560, 170), (490, 170), (490, 280)]); d.arrow(490, 280, 518, 280)
    d.label(705, 220, "next state", 11); d.label(420, 220, "current state", 11)
    d.callout(40, 70, 420, 90, "Key idea", "A sequential circuit = combinational logic + memory, with a feedback loop from the memory back into the logic.")
    d.end()

    d.page("The Bistable Element")
    (o1, i1) = d.gate("NOT", 280, 330)
    (o2, i2) = d.gate("NOT", 460, 230)
    d.wire([o1, (440, 330), (440, 230), i2[0]])
    d.wire([o2, (560, 230), (560, 160), (250, 160), (250, 330), i1[0]])
    d.dot(440, 330); d.label(450, 340, "Q", 14, bold=True)
    d.dot(560, 230); d.label(570, 240, "Q'", 14, bold=True)
    d.bullets(["Two inverters in a loop have exactly two stable states: Q = 0 or Q = 1",
               "Once it settles, it keeps its value forever (as long as power is on)",
               "Problem: there is no input, so we cannot CHANGE the stored value",
               "  The SR latch adds inputs to set or reset it"], y=120, size=14, gap=22)
    d.end()

    d.page("SR Latch (NOR Implementation)")
    (oa, ia) = d.gate("NOR", 200, 360)
    (ob, ib) = d.gate("NOR", 200, 230)
    d.wire([(110, ia[0][1]), ia[0]]); d.label(90, ia[0][1] - 4, "R", 14, bold=True)
    d.wire([(110, ib[1][1]), ib[1]]); d.label(90, ib[1][1] - 4, "S", 14, bold=True)
    d.wire([oa, (330, 360)]); d.label(338, 356, "Q", 14, bold=True)
    d.wire([ob, (330, 230)]); d.label(338, 226, "Q'", 14, bold=True)
    d.wire([(300, 360), (300, 300), (160, 270), (160, ib[0][1]), ib[0]]); d.dot(300, 360)
    d.wire([(300, 230), (300, 290), (170, 320), (170, ia[1][1]), ia[1]]); d.dot(300, 230)
    d.table(430, 400, [["S", "R", "Q(next)", "Meaning"], [0, 0, "Q", "hold"], [0, 1, 0, "reset"], [1, 0, 1, "set"], [1, 1, "-", "forbidden"]], colw=[50, 50, 80, 110], highlight={(4, 3)})
    d.para("S = 1 sets the latch (Q = 1). R = 1 resets it (Q = 0). With S = R = 0 the latch remembers. S = R = 1 forces Q = Q' = 0, and the result is unpredictable when both return to 0, so it is forbidden.", 430, 250, size=13, maxw=360)
    d.end()

    d.page("SR Latch: Example Waveform")
    x0 = 150
    d.wave(x0, 380, "S", [0, 1, 1, 0, 0, 0, 0, 1, 0, 0])
    d.wave(x0, 310, "R", [0, 0, 0, 0, 1, 1, 0, 0, 0, 0])
    d.wave(x0, 240, "Q", [0, 1, 1, 1, 0, 0, 0, 1, 1, 1], color=NAVY)
    d.edges(x0, 220, 420, 11)
    d.para("Q goes to 1 when S pulses, stays 1 after S returns to 0 (memory!), and goes to 0 when R pulses. The latch reacts immediately: there is no clock.", 60, 170, size=14, maxw=W - 120)
    d.end()

    d.page("Gated D Latch")
    p = d.ff(130, 220, "D", "D latch", clk=False)
    d.label(138, 248, "EN", 13, bold=True)
    d.wire([(60, p["D"][1]), p["D"]]); d.wire([(60, 250), (130, 250)])
    d.wire([p["Q"], (280, p["Q"][1])])
    d.bullets(["Adds an ENABLE input and a single data input D",
               "EN = 1: the latch is TRANSPARENT, Q follows D",
               "EN = 0: the latch HOLDS its last value",
               "Removes the forbidden S = R = 1 case",
               "  S = D·EN and R = D'·EN feed an SR latch inside"], x=330, y=360, size=14, gap=26)
    d.wave(150, 130, "EN", [0, 1, 1, 1, 0, 0, 0, 1, 0], step=60)
    d.wave(150, 80, "D", [1, 1, 0, 1, 1, 0, 0, 0, 1], step=60)
    d.wave(150, 30, "Q", [0, 1, 0, 1, 1, 1, 1, 0, 0], step=60, color=NAVY)
    d.end()

    d.page("Why Latches Are Not Enough")
    d.bullets(["While EN = 1 the latch is transparent: changes on D pass straight through",
               "In a circuit with feedback, a value can race around the loop several times in one enable pulse",
               "  The final state then depends on gate delays, not on the design",
               "Solution: change state only at ONE instant per clock cycle, the clock EDGE",
               "This is exactly what a flip-flop does"], size=16, gap=32)
    d.callout(40, 90, 500, 80, "Remember", "Latch = level-sensitive (transparent while enabled). Flip-flop = edge-triggered (samples only at the clock edge).")
    d.end()

    d.page("Edge-Triggered D Flip-Flop (Master-Slave)")
    m = d.ff(150, 230, "D", "master latch", clk=False)
    s = d.ff(400, 230, "D", "slave latch", clk=False)
    d.label(158, 258, "EN", 12, bold=True); d.label(408, 258, "EN", 12, bold=True)
    d.wire([(80, m["D"][1]), m["D"]]); d.label(60, m["D"][1] - 4, "D", 14, bold=True)
    d.wire([m["Q"], s["D"]])
    d.wire([s["Q"], (580, s["Q"][1])]); d.label(588, s["Q"][1] - 4, "Q", 14, bold=True)
    # CLK -> NOT -> master EN (master open while CLK = 0); CLK -> slave EN directly.
    (no, ni) = d.gate("NOT", 95, 150, w=40, h=30)
    d.wire([(40, 150), ni[0]]); d.dot(70, 150); d.label(20, 160, "CLK", 13, bold=True)
    d.wire([no, (140, 150), (140, 260), (150, 260)])
    d.wire([(70, 150), (70, 115), (380, 115), (380, 260), (400, 260)])
    d.para("CLK = 0: master is transparent, slave holds. CLK rises: master freezes, slave copies the master. So Q changes only at the RISING edge, to the value D had just before the edge.", 620, 380, size=13, maxw=190)
    d.ff(640, 120, "D", "symbol", w=80, h=90)
    d.end()

    d.page("D Latch vs. D Flip-Flop (Same Inputs)")
    x0 = 170
    d.wave(x0, 400, "CLK", [0] * 8, step=70, clock=True)
    d.wave(x0, 330, "D", [0, 1, 0, 1, 1, 0, 1, 0], step=70)
    d.wave(x0, 255, "Q latch", [0, 1, 0, 1, 1, 0, 1, 0], step=70, color=RED)
    d.wave(x0, 180, "Q flip-flop", [0, 0, 1, 0, 1, 1, 0, 1], step=70, color=NAVY)
    d.edges(x0, 160, 440, 9, step=70)
    d.para("The latch output (red) copies every change of D while the clock is high. The flip-flop output (blue) only changes at rising edges (dashed lines). This makes flip-flops predictable in large synchronous designs.", 60, 120, size=13, maxw=W - 120)
    d.end()

    d.page("JK and T Flip-Flops")
    d.ff(60, 250, "JK", "JK flip-flop")
    d.table(180, 370, [["J", "K", "Q(next)"], [0, 0, "Q (hold)"], [0, 1, "0"], [1, 0, "1"], [1, 1, "Q' (toggle)"]], colw=[45, 45, 100])
    d.label(180, 220, "Q(next) = J·Q' + K'·Q", 14, bold=True)
    d.ff(450, 250, "T", "T flip-flop")
    d.table(570, 370, [["T", "Q(next)"], [0, "Q (hold)"], [1, "Q' (toggle)"]], colw=[45, 110])
    d.label(570, 280, "Q(next) = T XOR Q", 14, bold=True)
    d.bullets(["JK removes the forbidden case of SR: J = K = 1 toggles", "T flip-flops are the natural building block of counters"], y=150, size=14, gap=24)
    d.end()

    d.page("Timing Parameters")
    x0 = 200
    d.wave(x0, 360, "CLK", [0, 0, 1, 1, 1, 0, 0], step=70)
    d.wave(x0, 280, "D", [0, 1, 1, 1, 0, 0, 0], step=70)
    d.wave(x0, 200, "Q", [0, 0, 0, 1, 1, 1, 1], step=70, color=NAVY)
    c = d.c
    c.setFillColor(GREEN); c.setFillAlpha(0.15); c.rect(x0 + 90, 270, 50, 130, fill=1, stroke=0)
    c.setFillColor(RED); c.rect(x0 + 140, 270, 30, 130, fill=1, stroke=0); c.setFillAlpha(1)
    d.label(x0 + 115, 410, "t_setup", 11, center=True); d.label(x0 + 155, 410, "t_hold", 11, center=True)
    d.arrow(x0 + 140, 190, x0 + 210, 190, "t_clk-to-Q", ly=-16, size=11)
    d.bullets(["Setup time: D must be stable for t_setup BEFORE the clock edge",
               "Hold time: D must stay stable for t_hold AFTER the edge",
               "Clock-to-Q: delay from the edge until Q shows the new value",
               "  Violations can cause metastability (Q stuck between 0 and 1 for a while)"], y=140, size=14, gap=23)
    d.end()

    d.page("Worked Example: 4-bit Shift Register")
    xs = [110, 270, 430, 590]
    pins = [d.ff(x, 250, "D", f"FF{i}", w=80, h=90, outs=("Q",)) for i, x in enumerate(xs)]
    d.wire([(50, pins[0]["D"][1]), pins[0]["D"]]); d.label(30, pins[0]["D"][1] - 4, "in", 13, bold=True)
    for a, b in zip(pins, pins[1:]):
        d.wire([a["Q"], (a["Q"][0] + 40, a["Q"][1]), (a["Q"][0] + 40, b["D"][1]), b["D"]])
    d.wire([(50, 200), (650, 200)]); d.label(20, 196, "CLK", 12, bold=True)
    for p_ in pins:
        d.wire([(p_["CLK"][0] - 10, 200), (p_["CLK"][0] - 10, p_["CLK"][1]), p_["CLK"]])
    d.table(120, 170, [["Clock edge", "in", "Q0", "Q1", "Q2", "Q3"], [0, "-", 0, 0, 0, 0], [1, 1, 1, 0, 0, 0], [2, 0, 0, 1, 0, 0], [3, 1, 1, 0, 1, 0], [4, 1, 1, 1, 0, 1]], colw=[100, 60, 60, 60, 60, 60], rowh=22)
    d.para("Each clock edge moves every bit one position to the right. After 4 edges the input sequence 1,0,1,1 is stored as Q3..Q0 = 1,0,1,1.", 560, 150, size=12, maxw=250)
    d.end()

    d.page("In the Real World")
    d.chip(110, 260, "DM74 DFF", pins=7)
    d.bullets(["Flip-flops are sold as small chips: for example, a dual D flip-flop IC with 14 pins",
               "Inside an FPGA or CPU there are millions of them, all driven by the same clock",
               "Registers, counters and the state of every FSM are just groups of flip-flops"], x=380, y=340, size=14, gap=26, maxw=400)
    d.para("Picture: a dual D flip-flop chip in a DIP package (drawing).", 110, 215, size=11, maxw=240, color=GREY)
    d.end()

    d.page("Summary")
    d.bullets(["Sequential circuits = combinational logic + memory",
               "SR latch: set / reset / hold; S = R = 1 is forbidden",
               "D latch: transparent while enabled",
               "D flip-flop: samples D only at the rising clock edge",
               "JK: J = K = 1 toggles. T: toggles when T = 1",
               "Respect setup and hold times, or risk metastability"], size=16, gap=30)
    d.end()

    d.page("Check Yourself")
    d.bullets(["1) What is the difference between a latch and a flip-flop?",
               "2) Draw Q of a positive-edge D flip-flop for the D waveform on slide 10.",
               "3) A JK flip-flop has J = K = 1 and Q = 0. What is Q after 3 rising edges?",
               "4) Why is S = R = 1 forbidden in a NOR SR latch?",
               "5) After 2 more edges with in = 0, what does the shift register on slide 13 hold?"], size=15, gap=32)
    d.end()
    d.save()


# ---------------------------------------------------------------------------
def moore_block(d, mealy=False):
    d.box(110, 230, 160, 80, "Next-State\nLogic")
    d.box(340, 230, 130, 80, "State\nRegister")
    d.box(560, 230, 160, 80, "Output\nLogic")
    d.arrow(40, 270, 110, 270, "inputs x")
    d.arrow(270, 270, 340, 270, "next")
    d.arrow(470, 270, 560, 270, "state")
    d.arrow(720, 270, 800, 270, "outputs z")
    d.wire([(405, 230), (405, 180), (190, 180)]); d.arrow(190, 180, 190, 228)
    d.label(300, 186, "current state", 11)
    d.wire([(398, 230), (380, 210)])
    d.c.setFont("Helvetica", 10); d.c.drawString(410, 214, "CLK")
    if mealy:
        d.wire([(70, 270), (70, 360), (640, 360)]); d.arrow(640, 360, 640, 312)
        d.dot(70, 270); d.label(330, 366, "inputs also go straight to the output logic", 12)


def lecture8(out):
    d = Deck(os.path.join(out, "DSD301_Lecture8_FSM_Moore.pdf"), COURSE)
    d.title("Lecture 8: Finite State Machines (Moore)")

    d.page("Outline")
    d.bullets(["What a finite state machine (FSM) is", "Moore machine structure", "The 6-step design procedure",
               "Example 1: detect two consecutive 1s", "From state table to circuit (K-maps)",
               "Example 2: a traffic light controller", "State encoding choices", "Check yourself"], y=H - 110, gap=30, size=17)
    d.end()

    d.page("What Is a Finite State Machine?")
    d.bullets(["A sequential circuit that is always in one of a FINITE number of states",
               "On every clock edge it moves to a next state that depends on the current state and the inputs",
               "Outputs depend on the state (Moore) or on state and inputs (Mealy, next lecture)",
               "Everyday examples: traffic lights, vending machines, elevators, washing machines",
               "  Every control unit inside a CPU is an FSM"], maxw=W - 300, size=15, gap=28)
    d.traffic_light(680, 230, on="green")
    d.label(710, 140, "a traffic light is an FSM", 11, center=True)
    d.end()

    d.page("Moore Machine Structure")
    moore_block(d)
    d.callout(40, 70, 520, 80, "Key idea", "In a Moore machine the output depends ONLY on the current state. Outputs change only after a clock edge, so they are glitch-free.")
    d.end()

    d.page("The FSM Design Procedure")
    d.bullets(["1) Understand the problem: inputs, outputs, an example input/output sequence",
               "2) Draw the state diagram (circles = states, arrows = transitions)",
               "3) Write the state table: current state + input -> next state, output",
               "4) Choose a state encoding (binary, one-hot, ...)",
               "5) Derive next-state and output equations (K-maps)",
               "6) Draw the circuit, or write it in VHDL"], size=16, gap=34)
    d.end()

    d.page("Example 1: Detect Two Consecutive 1s")
    d.para("Design a Moore FSM with one input x and one output z. z = 1 while the last two inputs were both 1 (overlapping allowed).", 40, H - 105, size=15, maxw=W - 80)
    d.table(80, 360, [["clock", 0, 1, 2, 3, 4, 5, 6, 7], ["x", 0, 1, 1, 1, 0, 1, 1, 0], ["z (after)", 0, 0, 1, 1, 0, 0, 1, 0]], colw=[110] + [60] * 8, rowh=30, size=14)
    d.bullets(["States we need: S0 = 'no 1 yet', S1 = 'just saw one 1', S2 = 'saw two or more 1s'",
               "Only S2 outputs z = 1"], y=230, size=15, gap=28)
    d.end()

    d.page("State Diagram")
    A, B, C = (200, 280), (420, 280), (640, 280)
    d.state(*A, "S0", "z=0", start=True); d.state(*B, "S1", "z=0"); d.state(*C, "S2", "z=1", accept=True)
    d.trans(A, B, "x=1", curve=0.18); d.trans(B, A, "x=0", curve=0.18, ly=-20)
    d.trans(B, C, "x=1")
    d.trans(C, A, "x=0", curve=-0.32)
    d.loop(*A, "x=0", up=False); d.loop(*C, "x=1", up=False)
    d.para("Read it like this: from S1, if x = 1 go to S2, otherwise go back to S0. The output is written inside each state because this is a Moore machine.", 60, 110, size=13, maxw=W - 120)
    d.end()

    d.page("State Table and Encoding")
    d.table(50, 420, [["Current", "Next (x=0)", "Next (x=1)", "z"], ["S0", "S0", "S1", 0], ["S1", "S0", "S2", 0], ["S2", "S0", "S2", 1]], colw=[90, 110, 110, 50], rowh=30, size=14)
    d.table(480, 420, [["State", "Q1 Q0"], ["S0", "0 0"], ["S1", "0 1"], ["S2", "1 0"], ["(unused)", "1 1"]], colw=[110, 90], rowh=30, size=14)
    d.table(50, 260, [["Q1 Q0", "x", "Q1+ Q0+", "z"], ["0 0", 0, "0 0", 0], ["0 0", 1, "0 1", 0], ["0 1", 0, "0 0", 0], ["0 1", 1, "1 0", 0], ["1 0", 0, "0 0", 1], ["1 0", 1, "1 0", 1]], colw=[80, 50, 90, 50], rowh=24, size=13)
    d.para("3 states need ceil(log2 3) = 2 flip-flops. Code 11 is never used, so it becomes a don't-care (d) in the K-maps.", 480, 240, size=13, maxw=320)
    d.end()

    d.page("K-Maps for the Next State")
    d.kmap(80, 400, "Q1+", ["00", "01", "11", "10"], ["x=0", "x=1"],
           [[0, 0], [0, 1], ["d", "d"], [0, 1]], groups=[(1, 1, 2, 1, "#2f6fd6"), (2, 1, 3, 1, "#d6812f")])
    d.kmap(380, 400, "Q0+", ["00", "01", "11", "10"], ["x=0", "x=1"],
           [[0, 1], [0, 0], ["d", "d"], [0, 0]], groups=[(0, 1, 0, 1, "#2f6fd6")])
    d.label(60, 400, "Q1Q0", 11)
    d.label(80, 150, "Q1+ = x·Q0 + x·Q1 = x·(Q1 + Q0)", 15, bold=True)
    d.label(380, 150, "Q0+ = x·Q1'·Q0'", 15, bold=True)
    d.label(80, 110, "Output:  z = Q1   (z is 1 only in S2 = 10)", 15, bold=True)
    d.para("Rows use Gray-code order (00, 01, 11, 10) so neighbours differ in one bit. The don't-cares let the Q1+ groups be bigger.", 620, 360, size=12, maxw=190)
    d.end()

    d.page("The Circuit")
    f1 = d.ff(470, 280, "D", "Q1", w=80, h=90, outs=("Q",))
    f0 = d.ff(470, 140, "D", "Q0", w=80, h=90, outs=("Q",))
    (oo, oi) = d.gate("OR", 150, 340); (ao, ai) = d.gate("AND", 290, 330)
    d.wire([oo, ai[0]]); d.wire([ao, (400, ao[1]), (400, f1["D"][1]), f1["D"]])
    d.label(100, oi[0][1] - 4, "Q1", 12); d.label(100, oi[1][1] - 4, "Q0", 12)
    d.wire([(120, oi[0][1]), oi[0]]); d.wire([(120, oi[1][1]), oi[1]])
    d.wire([(60, 300), (260, 300), (260, ai[1][1]), ai[1]]); d.label(40, 296, "x", 13, bold=True)
    (go, gi) = d.gate("AND", 290, 200, inputs=3)
    d.label(230, gi[0][1] - 4, "x", 12); d.label(230, gi[1][1] - 4, "Q1'", 12); d.label(230, gi[2][1] - 4, "Q0'", 12)
    for p_ in gi:
        d.wire([(262, p_[1]), p_])
    d.wire([go, (400, go[1]), (400, f0["D"][1]), f0["D"]])
    d.wire([f1["Q"], (680, f1["Q"][1])]); d.label(690, f1["Q"][1] - 4, "z = Q1", 14, bold=True)
    d.wire([(430, 120), (430, f0["CLK"][1]), f0["CLK"]]); d.wire([(430, f0["CLK"][1]), (430, f1["CLK"][1]), f1["CLK"]]); d.label(410, 105, "CLK", 12, bold=True)
    d.para("Flip-flop outputs feed back into the gates (feedback wires not drawn to keep the picture readable).", 60, 70, size=12, color=GREY, maxw=W - 120)
    d.end()

    d.page("Checking It: A Trace")
    d.table(60, 420, [["Clock", "State", "x", "Next", "z"], [0, "S0", 0, "S0", 0], [1, "S0", 1, "S1", 0], [2, "S1", 1, "S2", 0], [3, "S2", 1, "S2", 1], [4, "S2", 0, "S0", 1], [5, "S0", 1, "S1", 0], [6, "S1", 1, "S2", 0], [7, "S2", 0, "S0", 1]],
            colw=[70, 80, 50, 80, 50], rowh=28, size=14, highlight={(4, 4), (5, 4), (8, 4)})
    d.para("z is the output of the CURRENT state. Notice that z becomes 1 one clock AFTER the second 1 arrives: Moore outputs always lag by a cycle. Mealy machines (next lecture) react in the same cycle.", 480, 380, size=14, maxw=330)
    d.end()

    d.page("Example 2: Traffic Light Controller")
    G, Y, R = (180, 290), (430, 290), (680, 290)
    d.state(*G, "GO", "green", start=True); d.state(*Y, "WAIT", "yellow"); d.state(*R, "STOP", "red")
    d.trans(G, Y, "T=1"); d.trans(Y, R, "T=1"); d.trans(R, G, "T=1", curve=-0.3)
    d.loop(*G, "T=0", up=False); d.loop(*Y, "T=0", up=False); d.loop(*R, "T=0", up=False)
    for (x, _), on in ((G, "green"), (Y, "yellow"), (R, "red")):
        d.c.saveState(); d.c.translate(x - 15, 80); d.c.scale(0.5, 0.5); d.traffic_light(0, 0, on); d.c.restoreState()
    d.para("Input T = 1 when a timer expires. Each state turns on one light (Moore outputs).", 60, 420, size=14, maxw=W - 120)
    d.end()

    d.page("Choosing a State Encoding")
    d.table(60, 420, [["Encoding", "S0", "S1", "S2", "S3", "Flip-flops", "Logic"], ["Binary", "00", "01", "10", "11", "log2(n)", "more complex"],
                      ["Gray", "00", "01", "11", "10", "log2(n)", "fewer glitches"], ["One-hot", "0001", "0010", "0100", "1000", "n", "very simple"]],
            colw=[100, 70, 70, 70, 70, 100, 130], rowh=32, size=14)
    d.bullets(["Binary: fewest flip-flops, good for ASICs where area matters",
               "One-hot: one flip-flop per state, next-state logic is almost trivial",
               "  FPGAs have many flip-flops, so tools often pick one-hot automatically"], y=240, size=15, gap=28)
    d.end()

    d.page("Summary")
    d.bullets(["FSM = states + transitions + outputs, updated on every clock edge",
               "Moore: output depends only on the state, written inside the state circle",
               "Procedure: diagram -> table -> encoding -> K-maps -> circuit",
               "Unused codes become don't-cares and simplify the logic",
               "Moore outputs appear one clock after the triggering input"], size=16, gap=32)
    d.end()

    d.page("Check Yourself")
    d.bullets(["1) How many flip-flops does a 6-state FSM need with binary encoding? With one-hot?",
               "2) Modify Example 1 to detect THREE consecutive 1s. How many states?",
               "3) Why is code 11 a don't-care in Example 1?",
               "4) Add a pedestrian button input to the traffic light FSM.",
               "5) In the trace on slide 11, at which clocks is z = 1, and why one clock late?"], size=15, gap=32)
    d.end()
    d.save()


def lecture9(out):
    d = Deck(os.path.join(out, "DSD301_Lecture9_Mealy_VHDL.pdf"), COURSE)
    d.title("Lecture 9: Mealy Machines and FSMs in VHDL")

    d.page("Outline")
    d.bullets(["Mealy machine structure", "Moore vs. Mealy", "Example: detect 101 (overlapping)",
               "The same detector as a Moore machine", "Writing FSMs in VHDL", "Testbench", "Common mistakes", "Check yourself"], y=H - 110, gap=30, size=17)
    d.end()

    d.page("Mealy Machine Structure")
    moore_block(d, mealy=True)
    d.callout(40, 70, 520, 80, "Key idea", "In a Mealy machine the output depends on the current state AND the current input. Outputs are written on the arrows, as input/output.")
    d.end()

    d.page("Moore vs. Mealy")
    d.table(50, 420, [["", "Moore", "Mealy"], ["Output depends on", "state only", "state + input"], ["Output written", "inside the state", "on the arrow (x/z)"],
                      ["Number of states", "usually more", "usually fewer"], ["Reaction time", "one clock later", "same clock cycle"], ["Glitches", "glitch-free", "can glitch if x changes"]],
            colw=[200, 220, 240], rowh=36, size=14)
    d.para("Rule of thumb: use Mealy when you need a fast response or fewer states; use Moore when clean, registered outputs matter.", 50, 160, size=14, maxw=W - 100)
    d.end()

    d.page("Timing: The Same '11' Detector, Both Ways")
    x0 = 180
    d.wave(x0, 400, "CLK", [0] * 8, step=70, clock=True)
    d.wave(x0, 330, "x", [0, 1, 1, 1, 0, 1, 1, 0], step=70)
    d.wave(x0, 255, "z Mealy", [0, 0, 1, 1, 0, 0, 1, 0], step=70, color=RED)
    d.wave(x0, 180, "z Moore", [0, 0, 0, 1, 1, 0, 0, 1], step=70, color=NAVY)
    d.edges(x0, 160, 440, 9, step=70)
    d.para("The Mealy output (red) rises in the same cycle as the second 1. The Moore output (blue) rises one clock later, after the FSM has moved into S2.", 60, 120, size=14, maxw=W - 120)
    d.end()

    d.page("Example: Detect 101 (Mealy, Overlapping)")
    A, B, C = (180, 280), (430, 280), (680, 280)
    d.state(*A, "A", start=True); d.state(*B, "B"); d.state(*C, "C")
    d.trans(A, B, "1/0", curve=0.15); d.trans(B, C, "0/0", curve=0.15)
    d.trans(C, B, "1/1", curve=0.15, ly=-20); d.trans(C, A, "0/0", curve=-0.3)
    d.loop(*A, "0/0", up=False); d.loop(*B, "1/0", up=False)
    d.para("A = nothing useful seen, B = last input was 1, C = last two inputs were 10. On input 1 in state C we have found 101: output 1 and go to B, because that last 1 can start the next 101 (overlapping).", 60, 110, size=13, maxw=W - 120)
    d.end()

    d.page("State Table and a Trace")
    d.table(50, 420, [["Current", "x=0", "x=1"], ["A", "A / 0", "B / 0"], ["B", "C / 0", "B / 0"], ["C", "A / 0", "B / 1"]], colw=[90, 100, 100], rowh=32, size=14, highlight={(3, 2)})
    d.table(400, 420, [["x", 1, 0, 1, 0, 1, 1, 0, 1], ["state", "A", "B", "C", "B", "C", "B", "B", "C"], ["z", 0, 0, 1, 0, 1, 0, 0, 1]], colw=[60] + [42] * 8, rowh=32, size=14)
    d.para("Overlapping: in 10101 the middle 1 belongs to BOTH matches, so z = 1 twice. Non-overlapping detection would go back to A after a match and find 101 only once.", 400, 300, size=13, maxw=400)
    d.end()

    d.page("The Same Detector as a Moore Machine")
    S0, S1, S2, S3 = (140, 300), (340, 300), (540, 300), (740, 300)
    d.state(*S0, "S0", "z=0", start=True); d.state(*S1, "S1", "z=0"); d.state(*S2, "S2", "z=0"); d.state(*S3, "S3", "z=1", accept=True)
    d.trans(S0, S1, "1"); d.trans(S1, S2, "0"); d.trans(S2, S3, "1")
    d.trans(S2, S0, "0", curve=-0.25); d.trans(S3, S1, "1", curve=0.3, ly=-24); d.trans(S3, S2, "0", curve=-0.35)
    d.loop(*S0, "0", up=False); d.loop(*S1, "1", up=False)
    d.para("Moore needs 4 states instead of 3: the extra state S3 exists only to hold the output z = 1 for one clock.", 60, 110, size=14, maxw=W - 120)
    d.end()

    d.page("VHDL: Declarations and the State Register")
    d.code(["library ieee; use ieee.std_logic_1164.all;",
            "",
            "entity det101 is",
            "  port (clk, rst, x : in  std_logic;",
            "        z           : out std_logic);",
            "end det101;",
            "",
            "architecture rtl of det101 is",
            "  type state_t is (A, B, C);          -- enumerated states",
            "  signal cur, nxt : state_t;",
            "begin",
            "  reg: process (clk, rst)             -- the state register",
            "  begin",
            "    if rst = '1' then cur <= A;",
            "    elsif rising_edge(clk) then cur <= nxt;",
            "    end if;",
            "  end process;"], y=H - 100)
    d.end()

    d.page("VHDL: Next State and Mealy Output")
    d.code(["  comb: process (cur, x)             -- combinational logic",
            "  begin",
            "    nxt <= cur;  z <= '0';            -- DEFAULTS: avoid latches",
            "    case cur is",
            "      when A => if x = '1' then nxt <= B; end if;",
            "      when B => if x = '0' then nxt <= C; end if;",
            "      when C => if x = '1' then nxt <= B; z <= '1';",
            "                else nxt <= A;",
            "                end if;",
            "    end case;",
            "  end process;",
            "end rtl;"], y=H - 100)
    d.callout(40, 70, 560, 90, "Why two processes?", "The clocked process only stores the state. Everything combinational (next state and Mealy outputs) lives in the second process, which must list every input it reads (cur, x).")
    d.end()

    d.page("VHDL: A Small Testbench")
    d.code(["  clk <= not clk after 5 ns;                 -- 100 MHz clock",
            "  stim: process begin",
            "    rst <= '1'; wait for 12 ns; rst <= '0';",
            "    for i in 0 to 7 loop                      -- apply 1 0 1 0 1 1 0 1",
            "      x <= pattern(i);",
            "      wait until rising_edge(clk);",
            "    end loop;",
            "    wait;",
            "  end process;"], y=H - 100)
    d.para("Compare the simulated z with the trace on slide 7. Every mismatch is a bug in the diagram or in the code.", 40, 200, size=14, maxw=W - 80)
    d.end()

    d.page("Common Mistakes")
    d.label(40, H - 100, "Wrong: no default for z", 14, bold=True, color=RED)
    d.code(["when C => if x = '1' then z <= '1'; nxt <= B; end if;", "-- z keeps its old value when x = '0'  =>  LATCH!"], y=H - 125)
    d.label(40, H - 200, "Wrong: Mealy output inside the clocked process", 14, bold=True, color=RED)
    d.code(["elsif rising_edge(clk) then", "  if cur = C and x = '1' then z <= '1'; end if;  -- z is now REGISTERED"], y=H - 225)
    d.para("This delays z by one clock, so the design behaves like a Moore machine.", 40, H - 285, size=13)
    d.label(40, H - 330, "Wrong: incomplete sensitivity list", 14, bold=True, color=RED)
    d.code(["comb: process (cur)   -- x is missing: simulation and hardware disagree"], y=H - 355)
    d.end()

    d.page("Summary")
    d.bullets(["Mealy: output on the arrows, depends on state and input",
               "Mealy reacts in the same cycle and usually needs fewer states",
               "Overlapping detectors reuse the end of one match as the start of the next",
               "VHDL: enumerated state type + clocked register process + combinational process",
               "Always give default values in the combinational process"], size=16, gap=32)
    d.end()

    d.page("Check Yourself")
    d.bullets(["1) Draw a Mealy FSM that detects 110 (overlapping). How many states?",
               "2) Convert it to a Moore machine. How many states now?",
               "3) Find the input sequence that makes the 101 detector output 1 three times in 7 clocks.",
               "4) What hardware does the synthesizer infer if you forget 'z <= 0' as a default?",
               "5) Rewrite the det101 VHDL so that z is a Moore output."], size=15, gap=32)
    d.end()
    d.save()


def assignment(out, fname, title, subtitle, exercises, solution=False, header_note=None):
    """exercises: list of (question_lines, answer_lines, draw_fn or None)."""
    d = Deck(os.path.join(out, fname), COURSE)
    d.title(title + (" – Model Answer" if solution else ""), subtitle)
    for i, (q, a, draw) in enumerate(exercises, 1):
        d.page(f"Exercise {i}" + (" (solution)" if solution else ""))
        y = d.para(" ".join(q), 40, H - 100, size=15, maxw=W - 80, gap=22)
        if draw:
            draw(d, y)
        if solution:
            d.c.setFillColor(GREEN); d.c.setFont("Helvetica-Bold", 14); d.c.drawString(40, 150, "Answer")
            d.para(" ".join(a), 40, 128, size=13, maxw=W - 80, color=GREEN)
        d.end()
    if header_note:
        d.page("Notes"); d.bullets(header_note); d.end()
    d.save()


def fig_sr_wave(d, y):
    d.wave(170, y - 70, "S", [0, 1, 0, 0, 0, 1, 0, 0])
    d.wave(170, y - 130, "R", [0, 0, 0, 1, 0, 0, 0, 1])
    d.wave(170, y - 190, "Q", [0] * 8, color=GREY)
    d.edges(170, y - 210, y - 40, 9)


def fig_d_wave(d, y):
    d.wave(170, y - 60, "CLK", [0] * 8, step=60, clock=True)
    d.wave(170, y - 120, "D", [1, 1, 0, 0, 1, 0, 1, 1], step=60)
    d.wave(170, y - 180, "Q", [0] * 8, step=60, color=GREY)
    d.edges(170, y - 200, y - 30, 9, step=60)


def fig_fsm_given(d, y):
    A, B, C = (220, y - 130), (440, y - 130), (660, y - 130)
    d.state(*A, "P", start=True); d.state(*B, "Q"); d.state(*C, "R")
    d.trans(A, B, "1/0"); d.trans(B, C, "1/1"); d.trans(C, A, "0/0", curve=-0.3)
    d.loop(*A, "0/0", up=False); d.trans(B, A, "0/0", curve=0.25, ly=-20); d.loop(*C, "1/1", up=False)


def fig_bug_code(d, y):
    d.code(["process (clk) begin", "  if rising_edge(clk) then", "    cur <= nxt;", "    if cur = S2 and x = '1' then z <= '1';", "    end if;", "  end if;", "end process;"], y=y - 20)


def fig_kmap_q(d, y):
    d.kmap(200, y - 20, "F(A,B,C)", ["A=0", "A=1"], ["00", "01", "11", "10"], [[0, 1, 1, 0], [1, 1, 0, 1]])
    d.label(240, y - 10, "BC", 11)


def fig_mux(d, y):
    d.box(330, y - 200, 120, 160, "4:1\nMUX")
    for i, lbl in enumerate(["I0 = C", "I1 = C'", "I2 = 1", "I3 = 0"]):
        d.arrow(220, y - 70 - i * 35, 330, y - 70 - i * 35); d.label(140, y - 74 - i * 35, lbl, 12)
    d.arrow(450, y - 120, 540, y - 120, "F"); d.label(350, y - 222, "S1 = A, S0 = B", 12)


def practice_and_quizzes(out):
    p6 = [
        (["For the SR latch below, complete the Q waveform. Assume Q starts at 0."], ["Q = 0, 1, 1, 0, 0, 1, 1, 0 (set by S, reset by R, holds in between)."], fig_sr_wave),
        (["Complete Q for a positive-edge-triggered D flip-flop with the CLK and D shown. Q starts at 0."], ["At each rising edge Q copies D: Q = 1, 1, 0, 0, 1, 0, 1, 1 (each value appears right after its edge)."], fig_d_wave),
        (["A JK flip-flop has J = 1, K = 1 and Q = 0. Give Q after each of the next 4 rising edges. Then repeat for J = 1, K = 0."], ["J=K=1 toggles: 1, 0, 1, 0. J=1, K=0 sets: 1, 1, 1, 1."], None),
        (["Explain in your own words why a design with feedback should use flip-flops rather than latches."], ["A latch is transparent while enabled, so a value can race around the feedback loop several times; a flip-flop updates only at the edge, so each loop iteration takes exactly one clock."], None),
    ]
    p7 = [
        (["Design a Moore FSM with input x and output z, where z = 1 after the input has been 1 for THREE consecutive clocks. Draw the state diagram."], ["4 states S0..S3 (number of consecutive 1s, saturating at 3); z = 1 only in S3; any 0 returns to S0."], None),
        (["How many flip-flops does your FSM need with binary encoding? With one-hot encoding?"], ["Binary: 2 (4 states). One-hot: 4."], None),
        (["Using the encoding S0=00, S1=01, S2=10, S3=11, write the state table and derive Q1+ and Q0+ with K-maps."], ["Q1+ = x·(Q1 + Q0), Q0+ = x·(Q1 + Q0') ; z = Q1·Q0."], None),
        (["Trace your FSM for the input 0 1 1 1 1 0 1 1 1. At which clocks is z = 1?"], ["The FSM reaches S3 after the 4th, 5th and 9th inputs, so z = 1 in the clock after each of those (Moore output lags by one clock)."], None),
    ]
    p8 = [
        (["The Mealy FSM below is given (labels are x/z). What sequence does it detect? Is it overlapping?"], ["It outputs 1 on every 1 that follows a 1, i.e. it detects 11, overlapping (R loops on 1/1)."], fig_fsm_given),
        (["Design a Mealy FSM that detects 110 (overlapping). Then convert it to a Moore machine. Compare the number of states."], ["Mealy: 3 states (A, saw 1, saw 11). Moore: 4 states (extra state holding z = 1)."], None),
        (["Find the bug in this VHDL code for a Mealy output. What will you see in simulation?"], ["z is assigned inside the clocked process, so it is registered: it appears one clock late and never returns to 0 (no default)."], fig_bug_code),
        (["Write the combinational process of the 101 detector (Lecture 9) with correct default values."], ["See Lecture 9, slide 10: defaults nxt <= cur; z <= '0'; then a case on cur."], None),
    ]
    for n, ex, topic in ((6, p6, "Latches and Flip-Flops"), (7, p7, "Moore Machines"), (8, p8, "Mealy Machines and VHDL")):
        for sol in (False, True):
            assignment(out, f"DSD301_Practice{n}{'_Solution' if sol else ''}.pdf", f"Practice Assignment {n}", topic, ex, solution=sol)

    q1 = [
        (["(4 marks) Minimize F using the K-map below. Give the minimal SOP expression."], ["F = Sum m(1,3,4,5,6). Minimal SOP: F = A'C + AC' + AB'  (equally minimal: A'C + AC' + B'C)."], fig_kmap_q),
        (["(3 marks) The 4:1 MUX below implements a function F(A,B,C). Write its truth table."], ["AB=00 -> F=C; 01 -> F=C'; 10 -> F=1; 11 -> F=0."], fig_mux),
        (["(3 marks) Convert -13 to 8-bit two's complement, then add it to 25. Show the carry and say whether overflow occurs."], ["-13 = 11110011; 25 = 00011001; sum = 00001100 = 12, carry out 1, no overflow."], None),
    ]
    q2 = [
        (["(3 marks) Complete Q for the positive-edge D flip-flop below. Q starts at 0."], ["Q = 1, 1, 0, 0, 1, 0, 1, 1."], fig_d_wave),
        (["(4 marks) Design a Moore FSM that outputs z = 1 when the last two inputs were 01. Draw the state diagram and give the state table."], ["3 states: S0 (start), S1 (last input was 0), S2 (just saw 01, z = 1). S0: 0->S1, 1->S0. S1: 0->S1, 1->S2. S2: 0->S1, 1->S0."], None),
        (["(3 marks) For the given Mealy FSM (x/z), trace the input 1 1 0 1 1 1 and give z for each clock."], ["P -1/0-> Q -1/1-> R -0/0-> P -1/0-> Q -1/1-> R -1/1-> R, so z = 0, 1, 0, 0, 1, 1."], fig_fsm_given),
    ]
    for name, title, ex in (("Sample_Quiz1_WS25", "Sample Quiz 1 (WS25)", q1), ("Sample_Quiz2_WS25", "Sample Quiz 2 (WS25)", q2)):
        for sol in (False, True):
            assignment(out, f"DSD301_{name}{'_Solution' if sol else ''}.pdf", title, "Previous semester (Winter 2025) · 20 minutes", ex, solution=sol)


def build_all(out):
    lecture7(out)
    lecture8(out)
    lecture9(out)
    practice_and_quizzes(out)


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "docs/files"
    build_all(out)
