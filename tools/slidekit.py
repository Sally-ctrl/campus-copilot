"""Small drawing kit for the demo lecture PDFs (gates, flip-flops, waveforms, K-maps, FSMs...).
Everything is drawn in code, so all figures are original."""
import math
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white, black

W, H = landscape(A4)
NAVY = HexColor("#1f3a68")
ACCENT = HexColor("#e0a030")
GREY = HexColor("#555555")
LIGHT = HexColor("#eef3fb")
GREEN = HexColor("#1d6b40")
RED = HexColor("#b03030")


class Deck:
    def __init__(self, path, course):
        self.c = canvas.Canvas(path, pagesize=landscape(A4))
        self.course = course
        self.n = 0

    # ---------- page frame ----------
    def title(self, title, sub="Demo University · Faculty of Engineering"):
        c = self.c
        c.setFillColor(NAVY); c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 34)
        c.drawCentredString(W / 2, H / 2 + 30, title)
        c.setFont("Helvetica", 18); c.drawCentredString(W / 2, H / 2 - 10, self.course)
        c.setFillColor(ACCENT); c.setFont("Helvetica", 13); c.drawCentredString(W / 2, H / 2 - 50, sub)
        self.end()

    def page(self, head):
        c = self.c
        c.setFillColor(NAVY); c.rect(0, H - 64, W, 64, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 22); c.drawString(36, H - 41, head)
        c.setFillColor(black)

    def end(self):
        self.n += 1
        c = self.c
        c.setFont("Helvetica", 9); c.setFillColor(GREY)
        c.drawRightString(W - 20, 14, f"{self.course}  ·  {self.n}")
        c.setFillColor(black)
        c.showPage()

    def save(self):
        self.c.save()

    # ---------- text ----------
    def bullets(self, items, x=40, y=None, size=15, gap=24, maxw=None):
        c = self.c
        y = y if y is not None else H - 100
        for it in items:
            sub = it.startswith("  ")
            text = it.strip()
            fs = size - 2 if sub else size
            c.setFont("Helvetica", fs)
            c.setFillColor(GREY if sub else black)
            prefix = "– " if sub else "• "
            indent = x + (24 if sub else 0)
            for k, line in enumerate(self.wrap(prefix + text, fs, (maxw or (W - indent - 40)))):
                c.drawString(indent + (12 if k else 0), y, line)
                y -= gap - (4 if sub else 0)
        c.setFillColor(black)
        return y

    def para(self, text, x, y, size=13, maxw=None, color=black, font="Helvetica", gap=None):
        c = self.c
        gap = gap or size + 5
        c.setFont(font, size); c.setFillColor(color)
        for line in self.wrap(text, size, maxw or (W - x - 40), font):
            c.drawString(x, y, line); y -= gap
        c.setFillColor(black)
        return y

    def wrap(self, text, size, maxw, font="Helvetica"):
        words, lines, cur = text.split(" "), [], ""
        for w in words:
            t = (cur + " " + w).strip()
            if self.c.stringWidth(t, font, size) > maxw and cur:
                lines.append(cur); cur = w
            else:
                cur = t
        if cur:
            lines.append(cur)
        return lines

    def callout(self, x, y, w, h, title, text, color=ACCENT):
        c = self.c
        c.setFillColor(HexColor("#fff7e0")); c.setStrokeColor(color); c.setLineWidth(1.5)
        c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
        c.setFillColor(black); c.setFont("Helvetica-Bold", 13); c.drawString(x + 12, y + h - 20, title)
        self.para(text, x + 12, y + h - 40, size=12, maxw=w - 24)

    def code(self, lines, x=40, y=None, size=11.5, gap=16):
        c = self.c
        y = y if y is not None else H - 100
        h = gap * len(lines) + 14
        c.setFillColor(HexColor("#f4f5f7")); c.setStrokeColor(HexColor("#d0d4dc"))
        c.roundRect(x - 8, y - h + gap, W - 2 * x + 16, h, 6, fill=1, stroke=1)
        c.setFillColor(black); c.setFont("Courier", size)
        for ln in lines:
            c.drawString(x, y, ln); y -= gap
        return y

    # ---------- shapes ----------
    def arrow(self, x1, y1, x2, y2, label=None, curve=0, head=True, lx=0, ly=8, size=12):
        c = self.c
        c.setStrokeColor(black); c.setLineWidth(1.5)
        if curve:
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            dx, dy = x2 - x1, y2 - y1
            cx, cy = mx - dy * curve, my + dx * curve
            p = c.beginPath(); p.moveTo(x1, y1); p.curveTo(cx, cy, cx, cy, x2, y2)
            c.drawPath(p, stroke=1, fill=0)
            ang = math.atan2(y2 - cy, x2 - cx); px, py = (mx + cx) / 2, (my + cy) / 2
        else:
            c.line(x1, y1, x2, y2)
            ang = math.atan2(y2 - y1, x2 - x1); px, py = (x1 + x2) / 2, (y1 + y2) / 2
        if head:
            for s in (-1, 1):
                a = ang + math.pi + s * 0.4
                c.line(x2, y2, x2 + 10 * math.cos(a), y2 + 10 * math.sin(a))
        if label:
            c.setFont("Helvetica", size); c.drawCentredString(px + lx, py + ly, label)

    def wire(self, pts):
        c = self.c
        c.setStrokeColor(black); c.setLineWidth(1.5)
        for (a, b), (d, e) in zip(pts, pts[1:]):
            c.line(a, b, d, e)

    def dot(self, x, y):
        self.c.setFillColor(black); self.c.circle(x, y, 3, fill=1, stroke=0)

    def label(self, x, y, text, size=13, bold=False, center=False, color=black):
        c = self.c
        c.setFillColor(color); c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        (c.drawCentredString if center else c.drawString)(x, y, text)
        c.setFillColor(black)

    def box(self, x, y, w, h, text="", fill=LIGHT, size=13):
        c = self.c
        c.setStrokeColor(NAVY); c.setLineWidth(1.8); c.setFillColor(fill)
        c.rect(x, y, w, h, fill=1, stroke=1)
        c.setFillColor(black); c.setFont("Helvetica-Bold", size)
        lines = text.split("\n")
        for i, ln in enumerate(lines):
            c.drawCentredString(x + w / 2, y + h / 2 + (len(lines) - 1) * 8 - i * 16 - 4, ln)

    # Logic gates: (x, y) = left-middle; returns output point
    def gate(self, kind, x, y, w=60, h=44, inputs=2):
        c = self.c
        c.setStrokeColor(black); c.setLineWidth(1.6); c.setFillColor(white)
        b, t = y - h / 2, y + h / 2
        neg = kind in ("NAND", "NOR", "NOT", "XNOR")
        base = {"NAND": "AND", "NOR": "OR", "XNOR": "XOR"}.get(kind, kind)
        if base == "AND":
            p = c.beginPath(); p.moveTo(x, b); p.lineTo(x + w / 2, b)
            p.arcTo(x, b, x + w, t, -90, 180); p.lineTo(x, t); p.close()
            c.drawPath(p, fill=1, stroke=1); ox = x + w
        elif base in ("OR", "XOR"):
            p = c.beginPath(); p.moveTo(x, b)
            p.curveTo(x + w * 0.55, b, x + w * 0.85, b + h * 0.2, x + w, y)
            p.curveTo(x + w * 0.85, t - h * 0.2, x + w * 0.55, t, x, t)
            p.curveTo(x + w * 0.22, t - h * 0.3, x + w * 0.22, b + h * 0.3, x, b)
            c.drawPath(p, fill=1, stroke=1); ox = x + w
            if base == "XOR":
                q = c.beginPath(); q.moveTo(x - 8, b); q.curveTo(x + w * 0.22 - 8, b + h * 0.3, x + w * 0.22 - 8, t - h * 0.3, x - 8, t)
                c.drawPath(q, fill=0, stroke=1)
        else:  # NOT / buffer
            p = c.beginPath(); p.moveTo(x, b); p.lineTo(x + w * 0.8, y); p.lineTo(x, t); p.close()
            c.drawPath(p, fill=1, stroke=1); ox = x + w * 0.8
        if neg:
            c.circle(ox + 5, y, 5, fill=1, stroke=1); ox += 10
        ins = [y] if inputs == 1 or kind == "NOT" else [y + h / 4, y - h / 4] if inputs == 2 else [y + h / 3, y, y - h / 3]
        return (ox, y), [(x + (6 if base in ("OR", "XOR") else 0), yy) for yy in ins]

    def ff(self, x, y, kind="D", name="", w=90, h=110, clk=True, outs=("Q", "Q'")):
        c = self.c
        self.box(x, y, w, h, "", fill=white)
        c.setFont("Helvetica-Bold", 13)
        ins = {"D": ["D"], "JK": ["J", "K"], "T": ["T"], "SR": ["S", "R"]}[kind]
        pts = {}
        for i, nm in enumerate(ins):
            yy = y + h - 28 - i * 30
            c.drawString(x + 8, yy - 4, nm); pts[nm] = (x, yy)
        if clk:
            cy = y + 22
            c.setLineWidth(1.4); c.line(x, cy + 8, x + 12, cy); c.line(x + 12, cy, x, cy - 8)
            c.setFont("Helvetica", 11); c.drawString(x + 16, cy - 4, "CLK"); pts["CLK"] = (x, cy)
        c.setFont("Helvetica-Bold", 13)
        for i, nm in enumerate(outs):
            yy = y + h - 28 - i * (h - 50)
            c.drawRightString(x + w - 8, yy - 4, nm); pts[nm] = (x + w, yy)
        if name:
            c.setFont("Helvetica", 11); c.drawCentredString(x + w / 2, y - 14, name)
        return pts

    def wave(self, x, y, name, bits, step=50, hgt=26, clock=False, color=black):
        c = self.c
        c.setFont("Helvetica-Bold", 13); c.setFillColor(black); c.drawRightString(x - 10, y + 8, name)
        c.setStrokeColor(color); c.setLineWidth(2)
        if clock:
            for k in range(len(bits)):
                x0 = x + k * step
                c.line(x0, y, x0, y + hgt); c.line(x0, y + hgt, x0 + step / 2, y + hgt)
                c.line(x0 + step / 2, y + hgt, x0 + step / 2, y); c.line(x0 + step / 2, y, x0 + step, y)
        else:
            prev = None
            for k, v in enumerate(bits):
                x0 = x + k * step; yy = y + (hgt if v else 0)
                if prev is not None and prev != v:
                    c.line(x0, y, x0, y + hgt)
                c.line(x0, yy, x0 + step, yy); prev = v
        c.setStrokeColor(black)

    def edges(self, x, y0, y1, n, step=50):
        c = self.c
        c.setDash(3, 3); c.setStrokeColor(HexColor("#999999")); c.setLineWidth(1)
        for k in range(n):
            c.line(x + k * step, y0, x + k * step, y1)
        c.setDash(); c.setStrokeColor(black)

    def table(self, x, y, rows, colw=80, rowh=24, size=12, highlight=None):
        c = self.c
        cols = colw if isinstance(colw, list) else [colw] * len(rows[0])
        c.setLineWidth(1); c.setStrokeColor(HexColor("#8a94a6"))
        for i, row in enumerate(rows):
            cx = x
            for j, cell in enumerate(row):
                cy = y - i * rowh
                fill = HexColor("#dfe7f5") if i == 0 else (HexColor("#fff3cf") if highlight and (i, j) in highlight else white)
                c.setFillColor(fill); c.rect(cx, cy - rowh, cols[j], rowh, fill=1, stroke=1)
                c.setFillColor(black); c.setFont("Helvetica-Bold" if i == 0 else "Helvetica", size)
                c.drawCentredString(cx + cols[j] / 2, cy - rowh + 7, str(cell))
                cx += cols[j]
        c.setStrokeColor(black)
        return y - len(rows) * rowh

    def kmap(self, x, y, title, rows_lbl, cols_lbl, vals, groups=(), cell=46):
        c = self.c
        c.setFont("Helvetica-Bold", 13); c.drawString(x, y + 26, title)
        c.setFont("Helvetica", 12)
        for j, cl in enumerate(cols_lbl):
            c.drawCentredString(x + 40 + j * cell + cell / 2, y + 6, cl)
        for i, rl in enumerate(rows_lbl):
            c.drawRightString(x + 34, y - (i + 1) * cell + cell / 2 - 4, rl)
            for j in range(len(cols_lbl)):
                cx, cy = x + 40 + j * cell, y - (i + 1) * cell
                c.setFillColor(white); c.setStrokeColor(black); c.rect(cx, cy, cell, cell, fill=1, stroke=1)
                c.setFillColor(black); c.setFont("Helvetica-Bold", 15)
                c.drawCentredString(cx + cell / 2, cy + cell / 2 - 5, str(vals[i][j]))
        for (r0, c0, r1, c1, col) in groups:
            c.setStrokeColor(HexColor(col)); c.setLineWidth(2.5)
            c.roundRect(x + 40 + c0 * cell + 4, y - (r1 + 1) * cell + 4, (c1 - c0 + 1) * cell - 8, (r1 - r0 + 1) * cell - 8, 12, fill=0, stroke=1)
        c.setStrokeColor(black); c.setLineWidth(1)

    def state(self, x, y, name, out=None, r=32, start=False, accept=False):
        c = self.c
        c.setStrokeColor(NAVY); c.setLineWidth(2); c.setFillColor(HexColor("#fff3cf") if accept else LIGHT)
        c.circle(x, y, r, fill=1, stroke=1)
        if accept:
            c.circle(x, y, r - 5, fill=0, stroke=1)
        c.setFillColor(black); c.setFont("Helvetica-Bold", 15)
        c.drawCentredString(x, y + (2 if out is not None else -5), name)
        if out is not None:
            c.setFont("Helvetica", 11); c.drawCentredString(x, y - 14, out)
        if start:
            self.arrow(x - r - 40, y, x - r - 2, y, "start", ly=8, size=10)

    def trans(self, a, b, label, curve=0, r=32, lx=0, ly=8):
        (x1, y1), (x2, y2) = a, b
        ang = math.atan2(y2 - y1, x2 - x1)
        off = 0.35 if curve else 0
        self.arrow(x1 + r * math.cos(ang + off), y1 + r * math.sin(ang + off),
                   x2 - r * math.cos(ang - off), y2 - r * math.sin(ang - off), label, curve, lx=lx, ly=ly)

    def loop(self, x, y, label, r=32, up=True):
        c = self.c
        s = 1 if up else -1
        c.setLineWidth(1.5); c.setStrokeColor(black)
        c.circle(x, y + s * (r + 14), 16, fill=0, stroke=1)
        c.setFont("Helvetica", 12); c.drawCentredString(x, y + s * (r + 38) - (0 if up else 8), label)

    def chip(self, x, y, label, pins=7):
        """A drawn DIP chip, like a 'photo' of an IC."""
        c = self.c
        w, h = pins * 26 + 20, 70
        for k in range(pins):
            px = x + 18 + k * 26
            c.setFillColor(HexColor("#b9bec7")); c.rect(px, y - 14, 10, 14, fill=1, stroke=0); c.rect(px, y + h, 10, 14, fill=1, stroke=0)
        c.setFillColor(HexColor("#2b2f36")); c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
        c.setFillColor(HexColor("#555b66")); c.circle(x + 14, y + h / 2, 6, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 15); c.drawCentredString(x + w / 2, y + h / 2 + 2, label)
        c.setFont("Helvetica", 9); c.drawCentredString(x + w / 2, y + 14, "DEMO SEMI")
        c.setFillColor(black)

    def traffic_light(self, x, y, on="red"):
        c = self.c
        c.setFillColor(HexColor("#333")); c.roundRect(x, y, 60, 160, 10, fill=1, stroke=0)
        for i, col in enumerate(["red", "yellow", "green"]):
            base = {"red": "#e04040", "yellow": "#f0c030", "green": "#30b060"}[col]
            c.setFillColor(HexColor(base) if col == on else HexColor("#555"))
            c.circle(x + 30, y + 130 - i * 50, 18, fill=1, stroke=0)
        c.setFillColor(HexColor("#333")); c.rect(x + 25, y - 60, 10, 60, fill=1, stroke=0)
        c.setFillColor(black)
