from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import textwrap


OUTPUT = Path(
    "/home/user/workspace/BabyReady/assets/clinical-media/drafts/"
    "bleeding-during-pregnancy-contact-care-draft.png"
)
WIDTH, HEIGHT = 1600, 2000

CREAM = "#FFFCF7"
TEAL = "#0C4E54"
TEAL_LIGHT = "#E5F1EF"
TEXT = "#242822"
MUTED = "#53615D"
RUST = "#B54E32"
RUST_LIGHT = "#FBEAE4"
LINE = "#D6DFDA"
WHITE = "#FFFFFF"

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
REGULAR = f"{FONT_DIR}/DejaVuSans.ttf"
BOLD = f"{FONT_DIR}/DejaVuSans-Bold.ttf"


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REGULAR, size)


def wrapped(draw, text, max_width, text_font):
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=text_font) <= max_width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_multiline(draw, xy, text, max_width, text_font, fill, line_gap=10):
    x, y = xy
    lines = wrapped(draw, text, max_width, text_font)
    box = draw.textbbox((0, 0), "Ag", font=text_font)
    line_height = box[3] - box[1] + line_gap
    for line in lines:
        draw.text((x, y), line, font=text_font, fill=fill)
        y += line_height
    return y


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def icon_phone(draw, x, y, color):
    draw.rounded_rectangle((x + 12, y, x + 88, y + 112), radius=15, outline=color, width=9)
    draw.line((x + 31, y + 17, x + 69, y + 17), fill=color, width=8)
    draw.ellipse((x + 43, y + 87, x + 57, y + 101), fill=color)


def icon_alert(draw, x, y, color):
    draw.polygon(((x + 50, y), (x + 100, y + 98), (x, y + 98)), outline=color, fill=None, width=8)
    draw.line((x + 50, y + 30, x + 50, y + 62), fill=color, width=9)
    draw.ellipse((x + 45, y + 76, x + 55, y + 86), fill=color)


def icon_note(draw, x, y, color):
    draw.rounded_rectangle((x, y, x + 86, y + 102), radius=8, outline=color, width=8)
    for offset in (25, 48, 71):
        draw.line((x + 18, y + offset, x + 68, y + offset), fill=color, width=7)


image = Image.new("RGB", (WIDTH, HEIGHT), CREAM)
draw = ImageDraw.Draw(image)

# Header
draw.rectangle((0, 0, WIDTH, 410), fill=TEAL)
rounded(draw, (80, 72, 564, 123), 26, "#2F7377")
draw.text((110, 83), "DRAFT • CLINICIAN REVIEW REQUIRED", font=font(24, True), fill=WHITE)
draw.text((80, 168), "Bleeding During Pregnancy", font=font(70, True), fill=WHITE)
draw.text((80, 254), "Contact Your Care Team", font=font(49, True), fill="#CFE7E2")
draw_multiline(
    draw,
    (80, 324),
    "Bleeding can have many causes. Your care team can help you decide what to do next.",
    1190,
    font(29),
    "#E6F1EE",
    line_gap=8,
)

# Call panel
rounded(draw, (80, 475, 1520, 840), 34, TEAL_LIGHT)
icon_phone(draw, 130, 548, TEAL)
draw.text((265, 535), "CONTACT YOUR OBSTETRIC CARE TEAM", font=font(32, True), fill=TEAL)
draw_multiline(
    draw,
    (265, 595),
    "Call for any bleeding or spotting during pregnancy.",
    1090,
    font(45, True),
    TEXT,
    line_gap=10,
)
draw_multiline(
    draw,
    (265, 710),
    "Do not try to determine the cause from this guide.",
    1090,
    font(29),
    MUTED,
    line_gap=8,
)

# Urgent panel
rounded(draw, (80, 890, 1520, 1390), 34, RUST_LIGHT)
icon_alert(draw, 128, 970, RUST)
draw.text((265, 950), "GET URGENT HELP NOW", font=font(36, True), fill=RUST)
draw_multiline(
    draw,
    (265, 1017),
    "Get immediate help for bleeding more than spotting, or bleeding with:",
    1080,
    font(32, True),
    TEXT,
    line_gap=9,
)
urgent_items = [
    "severe belly, shoulder, or back pain",
    "fainting or severe dizziness",
    "fluid leaking",
]
bullet_y = 1137
for item in urgent_items:
    draw.ellipse((277, bullet_y + 13, 294, bullet_y + 30), fill=RUST)
    draw.text((325, bullet_y), item, font=font(31), fill=TEXT)
    bullet_y += 68

# Call preparation
rounded(draw, (80, 1440, 1520, 1736), 34, WHITE, outline=LINE, width=3)
icon_note(draw, 130, 1525, TEAL)
draw.text((265, 1504), "WHEN YOU CALL", font=font(32, True), fill=TEAL)
draw_multiline(
    draw,
    (265, 1566),
    "Share when it began, how much bleeding you notice, and whether you have pain, dizziness, or fluid leaking.",
    1080,
    font(30),
    TEXT,
    line_gap=8,
)

# Footer
draw.line((80, 1812, 1520, 1812), fill=LINE, width=3)
draw.text((80, 1855), "Clinical education draft • Linked source: ACOG, Bleeding During Pregnancy", font=font(24), fill=MUTED)
draw.text((80, 1898), "The final wording and local emergency-routing instructions require clinical review.", font=font(22), fill=MUTED)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
image.save(OUTPUT, quality=95)
print(OUTPUT)
