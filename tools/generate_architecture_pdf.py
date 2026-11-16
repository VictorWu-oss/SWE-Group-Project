from pathlib import Path

import cairosvg
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp" / "pdfs"
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)
PDF = OUTPUT / "toilettracker-high-level-design.pdf"

PAGE_W, PAGE_H = 1280, 720
LOGO_FILES = {
    "Vite": "vite.svg",
    "React": "react.svg",
    "Expo": "expo.svg",
    "Express": "express.svg",
    "SQLite": "sqlite.svg",
    "OpenStreetMap": "openstreetmap.svg",
}


def prepare_logos():
    logos = {}
    for name, filename in LOGO_FILES.items():
        source = TMP / filename
        target = TMP / f"{source.stem}.png"
        cairosvg.svg2png(url=str(source), write_to=str(target), output_width=170, output_height=170)
        logos[name] = ImageReader(str(target))
    return logos


def rounded_box(pdf, x, y, width, height, title, lines, fill, stroke=colors.HexColor("#202124"), logo=None):
    pdf.setFillColor(fill)
    pdf.setStrokeColor(stroke)
    pdf.setLineWidth(1.2)
    pdf.roundRect(x, y, width, height, 9, fill=1, stroke=1)
    text_x = x + 12
    if logo:
        pdf.drawImage(logo, x + 12, y + height - 49, width=35, height=35, preserveAspectRatio=True, mask="auto")
        text_x = x + 55
    pdf.setFillColor(colors.HexColor("#111111"))
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(text_x, y + height - 25, title)
    pdf.setFont("Helvetica", 9.5)
    for index, line in enumerate(lines):
        pdf.drawString(x + 12, y + height - 52 - index * 14, line)


def arrow(pdf, start, end, label=None, green=False, dashed=False, label_offset=7):
    color = colors.HexColor("#228B4A") if green else colors.HexColor("#111111")
    pdf.setStrokeColor(color)
    pdf.setFillColor(color)
    pdf.setLineWidth(1.5)
    if dashed:
        pdf.setDash(3, 3)
    pdf.line(*start, *end)
    pdf.setDash()
    ex, ey = end
    sx, sy = start
    dx, dy = ex - sx, ey - sy
    length = max((dx * dx + dy * dy) ** 0.5, 1)
    ux, uy = dx / length, dy / length
    left = (-uy, ux)
    size = 8
    pdf.line(ex, ey, ex - ux * size + left[0] * 4, ey - uy * size + left[1] * 4)
    pdf.line(ex, ey, ex - ux * size - left[0] * 4, ey - uy * size - left[1] * 4)
    if label:
        mx, my = (sx + ex) / 2, (sy + ey) / 2
        pdf.setFillColor(colors.HexColor("#111111"))
        pdf.setFont("Helvetica", 9)
        pdf.drawCentredString(mx, my + label_offset, label)


def logo_label(pdf, logo, x, y, title, subtitle=None, accent=colors.HexColor("#2C8E4A")):
    pdf.drawImage(logo, x - 29, y, width=58, height=58, preserveAspectRatio=True, mask="auto")
    pdf.setFillColor(colors.HexColor("#111111"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawCentredString(x, y - 16, title)
    if subtitle:
        pdf.setFont("Helvetica", 9)
        pdf.drawCentredString(x, y - 29, subtitle)


def person(pdf, x, y, name, description):
    pdf.setStrokeColor(colors.HexColor("#287A0B"))
    pdf.setLineWidth(3)
    pdf.circle(x, y + 31, 21, fill=0, stroke=1)
    pdf.roundRect(x - 48, y - 38, 96, 62, 12, fill=0, stroke=1)
    pdf.setFillColor(colors.HexColor("#287A0B"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawCentredString(x, y - 2, name)
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(x, y - 16, "[Person]")
    pdf.drawCentredString(x, y - 29, description)


def main():
    logos = prepare_logos()
    pdf = canvas.Canvas(str(PDF), pagesize=(PAGE_W, PAGE_H))
    pdf.setTitle("ToiletTracker High-Level Design")
    pdf.setFillColor(colors.HexColor("#F5F5F5"))
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    white = colors.white
    blue = colors.HexColor("#1769C2")
    orange = colors.HexColor("#E98500")

    pdf.setFillColor(colors.HexColor("#111111"))
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawString(45, 670, "Container View: ToiletTracker")
    pdf.setFont("Helvetica", 11)
    pdf.setFillColor(colors.HexColor("#444444"))
    pdf.drawString(45, 650, "System Architecture / Container-level Diagram (Level 2 of the C4 Model)")

    person(pdf, 245, 580, "Campus Visitor", "Finds and reviews campus bathrooms")

    pdf.setStrokeColor(blue)
    pdf.setLineWidth(2.5)
    pdf.roundRect(55, 75, 820, 445, 12, fill=0, stroke=1)
    pdf.setFillColor(blue)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(72, 95, "ToiletTracker")
    pdf.setFont("Helvetica", 9)
    pdf.drawString(72, 81, "[Software System]")

    rounded_box(pdf, 120, 345, 205, 105, "Web Application", ["[Container: JavaScript, Vite, React]", "Browser UI for search, details,", "ratings, and maintenance reports."], white, blue, logos["Vite"])
    rounded_box(pdf, 120, 180, 205, 105, "Mobile Application", ["[Container: TypeScript, Expo, React Native]", "Mobile UI for search, maps,", "directions, ratings, and reports."], white, blue, logos["Expo"])
    rounded_box(pdf, 470, 285, 230, 130, "Backend API", ["[Container: Node.js and Express]", "Provides bathroom, review, directory,", "maintenance, and walking-route JSON APIs."], white, blue, logos["Express"])
    rounded_box(pdf, 465, 125, 235, 100, "SQLite Database", ["[Container: SQLite]", "Stores bathroom records, reviews,", "maintenance reports, and verification data."], white, blue, logos["SQLite"])

    pdf.setStrokeColor(orange)
    pdf.setLineWidth(2.5)
    pdf.roundRect(970, 320, 240, 105, 10, fill=0, stroke=1)
    pdf.setFillColor(orange)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawCentredString(1090, 388, "OpenStreetMap / Valhalla")
    pdf.setFont("Helvetica", 9)
    pdf.drawCentredString(1090, 370, "[External Software System]")
    pdf.setFont("Helvetica", 10)
    pdf.drawCentredString(1090, 347, "Provides map tiles and pedestrian routes.")

    arrow(pdf, (210, 542), (175, 450), dashed=True)
    arrow(pdf, (280, 542), (310, 285), dashed=True)
    arrow(pdf, (325, 400), (470, 370), "JSON/HTTPS", dashed=True, label_offset=12)
    arrow(pdf, (325, 235), (470, 330), "JSON/HTTPS", dashed=True, label_offset=-14)
    arrow(pdf, (585, 285), (585, 225), "SQL", dashed=True, label_offset=10)
    arrow(pdf, (700, 380), (970, 380), "Requests pedestrian routes [JSON/HTTPS]", dashed=True, label_offset=12)

    pdf.setFillColor(colors.HexColor("#444444"))
    pdf.setFont("Helvetica", 8.5)
    pdf.drawString(55, 62, "Containers are deployable or runnable applications and data stores; dashed arrows show the main runtime relationships.")
    pdf.drawRightString(1210, 42, "C4 Level 2 - Container Diagram")
    pdf.save()
    print(PDF)


if __name__ == "__main__":
    main()
