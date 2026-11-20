"""Extra demo content for the non-DSD courses: lectures, assignments, sample quizzes (original content).

Gives every course in the demo portal real quizzes and assignments, so a full sync
looks like a real (busy) semester.
Run:  python3 tools/more_courses.py [out_dir]
"""
import os
import sys
from slidekit import Deck, W, H, GREEN

DMA = "DMA201 · Discrete Mathematics"
DBS = "DBS301 · Databases I"
NET = "NET301 · Communication Networks"
TOC = "TOC301 · Theory of Computation"
MED = "MED301 · Introduction to Media Engineering"


def lecture(out, fname, course, title, slides):
    """slides: list of (heading, bullet list). Bullets starting with two spaces are sub-points."""
    d = Deck(os.path.join(out, fname), course)
    d.title(title)
    for head, items in slides:
        d.page(head)
        d.bullets(items)
        d.end()
    d.save()


def sheet(out, fname, course, title, subtitle, exercises, solution=False):
    """exercises: list of (question, answer)."""
    d = Deck(os.path.join(out, fname), course)
    d.title(title + (" – Model Answer" if solution else ""), subtitle)
    for i, (q, a) in enumerate(exercises, 1):
        d.page(f"Exercise {i}" + (" (solution)" if solution else ""))
        d.para(q, 40, H - 100, size=15, maxw=W - 80, gap=22)
        if solution:
            d.c.setFillColor(GREEN); d.c.setFont("Helvetica-Bold", 14); d.c.drawString(40, 260, "Answer")
            d.para(a, 40, 236, size=13, maxw=W - 80, color=GREEN)
        d.end()
    d.save()


def both(out, base, course, title, subtitle, exercises):
    sheet(out, f"{base}.pdf", course, title, subtitle, exercises)
    sheet(out, f"{base}_Solution.pdf", course, title, subtitle, exercises, solution=True)


# ---------------- DMA201 ----------------
def dma(out):
    lecture(out, "DMA201_Lecture5_Functions.pdf", DMA, "Lecture 5: Functions", [
        ("Functions", ["f: A -> B assigns each element of A exactly one element of B",
                       "Domain, codomain, range", "  range = { f(a) : a in A }, a subset of the codomain"]),
        ("Injective, surjective, bijective", ["Injective (one-to-one): f(a) = f(b) implies a = b",
                                             "Surjective (onto): every b in B has a pre-image",
                                             "Bijective: both, so f has an inverse",
                                             "  Example: f(x) = 2x + 1 on the reals is a bijection"]),
        ("Composition and counting", ["(g o f)(x) = g(f(x))", "Composition of bijections is a bijection",
                                      "Pigeonhole principle: n+1 objects in n boxes -> some box has 2"]),
    ])
    sheet(out, "DMA201_Practice3_Solution.pdf", DMA, "Practice Assignment 3: Induction", "Model answers", [
        ("Prove 2^n > n for all n >= 1.", "Base: 2 > 1. Step: if 2^k > k then 2^(k+1) = 2·2^k > 2k >= k + 1 for k >= 1."),
        ("Prove n^3 - n is divisible by 3 for all n >= 1.", "Base: 0 is divisible by 3. Step: (k+1)^3 - (k+1) = (k^3 - k) + 3k^2 + 3k, a sum of multiples of 3."),
        ("Find the error in the 'proof' that all horses have the same colour.", "The step from k = 1 to k = 2 fails: the two groups of size k do not overlap."),
    ], solution=True)
    sheet(out, "DMA201_Practice4.pdf", DMA, "Assignment 4: Sets and Relations", "Graded · submit on the portal", [
        ("(3 marks) Let A = {1, 2, 3}. List the power set of A and state |P(A)|.", ""),
        ("(4 marks) R on the integers is defined by a R b iff a - b is even. Prove that R is an equivalence relation and describe its classes.", ""),
        ("(3 marks) Give a relation on {1, 2, 3} that is symmetric and transitive but NOT reflexive.", ""),
    ])
    both(out, "DMA201_Sample_Quiz3_WS25", DMA, "Sample Quiz 3 (WS25)", "Previous semester (Winter 2025) · 20 minutes", [
        ("(4 marks) Prove by induction that 1 + 3 + 5 + ... + (2n - 1) = n^2 for all n >= 1.",
         "Base: 1 = 1^2. Step: n^2 + (2n + 1) = (n + 1)^2."),
        ("(3 marks) A = {a, b}, B = {b, c}. Find A x B and P(A ∩ B).",
         "A x B = {(a,b), (a,c), (b,b), (b,c)}. A ∩ B = {b}, so P = { {}, {b} }."),
        ("(3 marks) Is 'a divides b' on the positive integers an equivalence relation? Justify.",
         "No. It is reflexive and transitive but not symmetric: 2 | 4 but 4 does not divide 2."),
    ])


# ---------------- DBS301 ----------------
def dbs(out):
    lecture(out, "DBS301_Lecture4_Normalization.pdf", DBS, "Lecture 4: Normalization", [
        ("Why normalize?", ["Redundancy causes update, insert and delete anomalies",
                            "Split tables using functional dependencies"]),
        ("Normal forms", ["1NF: atomic values only", "2NF: no partial dependency on part of a key",
                          "3NF: no transitive dependency on the key", "BCNF: every determinant is a superkey"]),
        ("Decomposition", ["Must be lossless (natural join gives back the original)",
                           "Prefer dependency-preserving", "  3NF is always possible with both; BCNF sometimes is not"]),
    ])
    lecture(out, "DBS301_Milestone2_Description.pdf", DBS, "Project Milestone 2: SQL Schema and Queries", [
        ("What to submit", ["One .sql file per team: CREATE TABLE statements for your Milestone 1 ER design",
                            "Primary keys, foreign keys and at least 3 CHECK constraints",
                            "12 queries (UPDATED: was 10) covering joins, GROUP BY / HAVING and subqueries"]),
        ("Grading", ["Schema matches your ER diagram: 40%", "Queries correct and readable: 50%",
                     "Sample data (at least 10 rows per table): 10%", "Late submissions are not accepted"]),
    ])
    sheet(out, "DBS301_Practice2.pdf", DBS, "Practice Sheet 2: SQL", "Not graded · discussed in tutorials", [
        ("Given Student(id, name, major) and Enrolled(sid, course, grade), list the names of students enrolled in more than 3 courses.", ""),
        ("Find the major with the highest average grade.", ""),
        ("Rewrite a NOT IN subquery as a LEFT JOIN. When can the two give different results?", ""),
    ])
    both(out, "DBS301_Sample_Quiz1_WS25", DBS, "Sample Quiz 1 (WS25)", "Previous semester (Winter 2025) · 25 minutes", [
        ("(4 marks) Map this ER design to tables: Customer places Order (1:N), Order contains Product (M:N, with quantity).",
         "Customer(cid PK, ...); Order(oid PK, cid FK); Product(pid PK, ...); Contains(oid FK, pid FK, quantity, PK(oid, pid))."),
        ("(3 marks) Write SQL: the number of orders per customer, only for customers with at least 2 orders.",
         "SELECT cid, COUNT(*) FROM Orders GROUP BY cid HAVING COUNT(*) >= 2;"),
        ("(3 marks) Why can't Contains use only oid as its primary key?",
         "One order holds many products, so oid repeats; the key must be (oid, pid)."),
    ])


# ---------------- NET301 ----------------
def net(out):
    lecture(out, "NET301_Lecture3_IP.pdf", NET, "Lecture 3: IP Addressing and Subnetting", [
        ("IPv4 addresses", ["32 bits written as 4 bytes: 192.168.1.10", "Network part + host part",
                            "CIDR: /24 means the first 24 bits are the network"]),
        ("Subnetting", ["Borrow host bits to make more networks", "Hosts per subnet = 2^h - 2",
                        "  /26 -> 64 addresses, 62 usable hosts", "Network and broadcast addresses are reserved"]),
        ("Routing", ["Routers forward by longest prefix match", "Default gateway for everything else"]),
    ])
    sheet(out, "NET301_Assignment1.pdf", NET, "Assignment 1: Subnetting", "Graded · submit a single PDF", [
        ("(4 marks) Split 192.168.10.0/24 into 4 equal subnets. Give each subnet's network address, broadcast address and usable range.", ""),
        ("(3 marks) A company needs subnets for 50, 25 and 10 hosts from 10.0.0.0/24. Allocate them with VLSM.", ""),
        ("(3 marks) Which of these addresses can be assigned to a host in 172.16.0.0/22: 172.16.3.255, 172.16.2.0, 172.16.4.1?", ""),
    ])
    both(out, "NET301_Sample_Quiz1_WS25", NET, "Sample Quiz 1 (WS25)", "Previous semester (Winter 2025) · 20 minutes", [
        ("(3 marks) Name the layer that handles each: routing, port numbers, framing.",
         "Routing: network layer. Port numbers: transport layer. Framing: link layer."),
        ("(4 marks) Describe the TCP three-way handshake and why it needs three messages.",
         "SYN, SYN-ACK, ACK. Both sides must send their initial sequence number and see it acknowledged."),
        ("(3 marks) How many usable hosts does a /27 subnet have?", "2^5 - 2 = 30."),
    ])


# ---------------- TOC301 ----------------
def toc(out):
    lecture(out, "TOC301_Lecture3_NFA.pdf", TOC, "Lecture 3: Nondeterministic Finite Automata", [
        ("NFA", ["Several possible next states, or none", "Epsilon transitions move without reading input",
                 "Accept if ANY path ends in an accepting state"]),
        ("Subset construction", ["Each DFA state is a set of NFA states", "Up to 2^n DFA states for n NFA states",
                                 "NFAs and DFAs recognize the same languages"]),
    ])
    sheet(out, "TOC301_Problem_Set2.pdf", TOC, "Problem Set 2: NFAs and Regular Expressions", "Graded · submit on the portal", [
        ("(4 marks) Build an NFA for strings over {0,1} whose third symbol from the end is 1. Convert it to a DFA.", ""),
        ("(3 marks) Write a regular expression for strings over {a,b} with an even number of a's.", ""),
        ("(3 marks) Convert the regular expression (ab ∪ b)*a to an NFA.", ""),
    ])
    both(out, "TOC301_Sample_Quiz2_WS25", TOC, "Sample Quiz 2 (WS25)", "Previous semester (Winter 2025) · 20 minutes", [
        ("(4 marks) Convert the NFA with states {q0, q1}, start q0, accept q1, transitions q0 -a-> {q0, q1}, q0 -b-> {q0}, q1 -b-> {q1} to a DFA.",
         "DFA states {q0} and {q0,q1}. {q0}: a -> {q0,q1}, b -> {q0}. {q0,q1}: a -> {q0,q1}, b -> {q0,q1}. Accept {q0,q1}."),
        ("(3 marks) Give a regular expression for strings over {0,1} that contain 00.", "(0 ∪ 1)* 00 (0 ∪ 1)*"),
        ("(3 marks) True or false: every NFA with n states has an equivalent DFA with at most n states.", "False: it can need up to 2^n states."),
    ])


# ---------------- MED301 ----------------
def med(out):
    lecture(out, "MED301_Lecture2_Texturing.pdf", MED, "Lecture 2: Materials, Texturing and Lighting", [
        ("Materials", ["Base colour, roughness, metallic", "Node-based shader editors"]),
        ("UV unwrapping", ["Flatten a 3D surface onto a 2D image", "Mark seams where the cuts should go",
                           "Check stretching with a checker texture"]),
        ("Three-point lighting", ["Key light: main light", "Fill light: softens shadows", "Rim light: separates subject from background"]),
    ])
    lecture(out, "MED301_Assignment3.pdf", MED, "Assignment 3: Textured Scene", [
        ("Task", ["Texture your Assignment 2 creature (UV unwrap + at least one image texture)",
                  "Place it in a small scene with 3-point lighting", "Render 2 images from different angles"]),
        ("Submission", ["Upload the .blend file and both renders as one .zip", "Individual work"]),
    ])


def build_all(out):
    os.makedirs(out, exist_ok=True)
    for f in (dma, dbs, net, toc, med):
        f(out)


if __name__ == "__main__":
    build_all(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "docs", "files"))
