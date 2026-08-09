from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


WIDTH = 828
HEIGHT = 1431
PADDING = 48
OUTPUT = Path(__file__).resolve().parents[1] / "assets/clinical-media/urgent-maternal-warning-signs-get-help-now.png"

COLORS = {
    "ink": "#25231F",
    "muted": "#5E625E",
    "teal": "#0C5961",
    "teal_dark": "#07464D",
    "teal_soft": "#E3F0EF",
    "off_white": "#F8F6F1",
    "white": "#FFFFFF",
    "border": "#CEDBD8",
    "urgent": "#B7472D",
    "urgent_soft": "#FBE6DF",
}

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
REGULAR = FONT_DIR / "DejaVuSans.ttf"
BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD if bold else REGULAR), size=size)


def text_width(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont) -> float:
    return draw.textlength(text, font=text_font)


def wrap(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if text_width(draw, candidate, text_font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    text_font: ImageFont.FreeTypeFont,
    fill: str,
    max_width: int,
    line_height: int,
) -> int:
    x, y = xy
    lines = wrap(draw, text, text_font, max_width)
    for line in lines:
        draw.text((x, y), line, font=text_font, fill=fill)
        y += line_height
    return y


def draw_chip(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.rounded_rectangle((x, y, x + 202, y + 36), radius=18, fill="#DCEDEC")
    draw.text((x + 22, y + 8), "B A B Y R E A D Y", font=font(13, True), fill=COLORS["teal"])


def draw_icon_circle(draw: ImageDraw.ImageDraw, x: int, y: int, fill: str, symbol: str, symbol_fill: str) -> None:
    draw.ellipse((x, y, x + 44, y + 44), fill=fill)
    bbox = draw.textbbox((0, 0), symbol, font=font(24, True))
    symbol_x = x + (44 - (bbox[2] - bbox[0])) / 2
    symbol_y = y + (42 - (bbox[3] - bbox[1])) / 2 - 2
    draw.text((symbol_x, symbol_y), symbol, font=font(24, True), fill=symbol_fill)


def draw_group(
    draw: ImageDraw.ImageDraw,
    rect: tuple[int, int, int, int],
    heading: str,
    items: list[str],
    *,
    background: str,
    icon_fill: str,
    icon_symbol: str,
    heading_fill: str = COLORS["ink"],
    body_fill: str = COLORS["ink"],
) -> None:
    left, top, right, bottom = rect
    draw.rounded_rectangle(rect, radius=24, fill=background)
    draw_icon_circle(draw, left + 25, top + 22, icon_fill, icon_symbol, COLORS["teal"])
    heading_y = top + 80
    draw.text((left + 25, heading_y), heading, font=font(16, True), fill=heading_fill)
    y = heading_y + 31
    body_font = font(17, False)
    for item in items:
        bullet_x = left + 28
        text_x = left + 49
        draw.ellipse((bullet_x, y + 8, bullet_x + 7, y + 15), fill=COLORS["urgent"] if background == COLORS["urgent_soft"] else COLORS["teal"])
        y = draw_wrapped(draw, (text_x, y), item, body_font, body_fill, right - text_x - 18, 23)
        y += 5


def build_figure() -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), COLORS["off_white"])
    draw = ImageDraw.Draw(image)

    # Header
    draw.rounded_rectangle((0, 0, WIDTH, 242), radius=0, fill=COLORS["teal"])
    draw_chip(draw, PADDING, 38)
    draw.text((PADDING, 95), "Urgent warning", font=font(39, True), fill=COLORS["white"])
    draw.text((PADDING, 140), "signs", font=font(39, True), fill=COLORS["white"])
    draw.text(
        (PADDING, 196),
        "Get medical help right away during pregnancy.",
        font=font(18, False),
        fill="#DDEDEC",
    )

    # Action banner
    action_top = 270
    action_bottom = 412
    draw.rounded_rectangle((PADDING, action_top, WIDTH - PADDING, action_bottom), radius=24, fill=COLORS["urgent_soft"])
    draw_icon_circle(draw, PADDING + 24, action_top + 24, "#F8CDBF", "!", COLORS["urgent"])
    draw.text((PADDING + 84, action_top + 27), "GET HELP NOW", font=font(17, True), fill=COLORS["urgent"])
    action_y = draw_wrapped(
        draw,
        (PADDING + 84, action_top + 59),
        "Contact your obstetric care team. If you cannot reach them, go to the emergency room.",
        font(18, True),
        COLORS["ink"],
        WIDTH - PADDING - (PADDING + 84) - 22,
        25,
    )
    draw.text((PADDING + 84, action_y + 2), "Call 911 if you are in immediate danger.", font=font(15, False), fill="#653025")

    # Two-column symptom groups
    gap = 18
    column_width = (WIDTH - (PADDING * 2) - gap) // 2
    left_x = PADDING
    right_x = left_x + column_width + gap
    row_one_top = 438
    row_one_bottom = 656
    row_two_top = 674
    row_two_bottom = 942

    draw_group(
        draw,
        (left_x, row_one_top, left_x + column_width, row_one_bottom),
        "BREATHING OR CHEST",
        ["Trouble breathing", "Chest pain or a fast-beating heart", "Fainting or passing out"],
        background=COLORS["white"],
        icon_fill=COLORS["teal_soft"],
        icon_symbol="↗",
    )
    draw_group(
        draw,
        (right_x, row_one_top, right_x + column_width, row_one_bottom),
        "HEAD OR VISION",
        ["A headache that will not go away or gets worse", "Changes in your vision", "Dizziness or fainting"],
        background=COLORS["teal_soft"],
        icon_fill=COLORS["white"],
        icon_symbol="•",
    )
    draw_group(
        draw,
        (left_x, row_two_top, left_x + column_width, row_two_bottom),
        "PAIN, BLEEDING, OR VOMITING",
        [
            "Severe belly pain that will not go away",
            "Vaginal bleeding or fluid leaking",
            "Severe nausea or vomiting and you cannot keep fluids down",
        ],
        background=COLORS["urgent_soft"],
        icon_fill="#F8CDBF",
        icon_symbol="!",
    )
    draw_group(
        draw,
        (right_x, row_two_top, right_x + column_width, row_two_bottom),
        "FEVER OR SWELLING",
        [
            "Fever of 100.4°F (38°C) or higher",
            "Extreme swelling of your face or hands",
            "Severe pain, redness, or swelling in one leg or arm",
        ],
        background=COLORS["white"],
        icon_fill=COLORS["teal_soft"],
        icon_symbol="+",
    )

    # Mental health safety strip
    mental_top = 972
    mental_bottom = 1120
    draw.rounded_rectangle((PADDING, mental_top, WIDTH - PADDING, mental_bottom), radius=24, fill=COLORS["teal_dark"])
    draw_icon_circle(draw, PADDING + 24, mental_top + 27, "#DDEDEC", "!", COLORS["teal_dark"])
    draw.text(
        (PADDING + 84, mental_top + 28),
        "THOUGHTS OF HARMING YOURSELF OR YOUR BABY?",
        font=font(15, True),
        fill="#DDEDEC",
    )
    mental_y = draw_wrapped(
        draw,
        (PADDING + 84, mental_top + 57),
        "Get help now. You are not alone.",
        font(22, True),
        COLORS["white"],
        WIDTH - PADDING - (PADDING + 84) - 18,
        29,
    )
    draw.text(
        (PADDING + 84, mental_y + 3),
        "Contact your care team, go to the ER, or call 911.",
        font=font(15, False),
        fill="#DDEDEC",
    )

    # Footer
    footer_top = 1155
    draw.line((PADDING, footer_top, WIDTH - PADDING, footer_top), fill="#CCD7D5", width=2)
    draw_wrapped(
        draw,
        (PADDING, footer_top + 26),
        "If something feels seriously wrong, trust that concern and get help.",
        font(20, True),
        COLORS["teal_dark"],
        WIDTH - (PADDING * 2),
        27,
    )
    draw.text(
        (PADDING, 1304),
        "Source: CDC urgent maternal warning signs · Clinical review required before publication",
        font=font(12, False),
        fill="#6B6B65",
    )
    draw.text(
        (PADDING, 1330),
        "Educational information only. It cannot diagnose a condition or replace care from your obstetric team.",
        font=font(12, False),
        fill="#6B6B65",
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT, format="PNG", optimize=True)
    print(f"Saved {OUTPUT}")


if __name__ == "__main__":
    build_figure()
