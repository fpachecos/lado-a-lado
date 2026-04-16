#!/usr/bin/env python3
"""
Sobrepõe texto em uma imagem via banda colorida (top, bottom ou center).

Uso:
    python3 text_overlay.py <input.jpg> <output.jpg> "<texto>" [posição] [#cor_fundo] [#cor_texto]

Argumentos:
    posição   : top | bottom | center  (padrão: top)
    cor_fundo : hex como #5B9BD5       (padrão: #5B9BD5)
    cor_texto : hex como #FFFFFF       (padrão: #FFFFFF)

Exemplo:
    python3 text_overlay.py slide1.jpg slide1-final.jpg "1. O WhatsApp que não para de vibrar" top #5B9BD5 #FFFFFF

Dependências: Pillow (pip install Pillow)
"""
import sys
from PIL import Image, ImageDraw, ImageFont
import textwrap

def hex_to_rgba(hex_color, alpha=220):
    h = hex_color.lstrip('#')
    r, g, b = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    return (r, g, b, alpha)

def add_overlay(img_path, output_path, text, position="top",
                bg_hex="#5B9BD5", text_hex="#FFFFFF"):
    img = Image.open(img_path).convert("RGBA")
    W, H = img.size

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font_candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Arial.ttf",
    ]
    font_size = max(40, W // 16)
    font = None
    for fp in font_candidates:
        try:
            font = ImageFont.truetype(fp, font_size)
            break
        except Exception:
            pass
    if font is None:
        font = ImageFont.load_default()

    avg_char_w = font_size * 0.55
    max_chars = int(W * 0.82 / avg_char_w)
    wrapped = textwrap.fill(text, width=max(max_chars, 10))
    lines = wrapped.split('\n')

    line_h = int(font_size * 1.35)
    pad_v = int(font_size * 0.6)
    band_h = len(lines) * line_h + pad_v * 2

    bg_rgba = hex_to_rgba(bg_hex, alpha=230)
    text_rgba = hex_to_rgba(text_hex, alpha=255)
    shadow_rgba = (0, 0, 0, 80)

    if position == "top":
        band_rect = [(0, 0), (W, band_h)]
        text_start_y = pad_v
    elif position == "bottom":
        band_rect = [(0, H - band_h), (W, H)]
        text_start_y = H - band_h + pad_v
    else:  # center
        band_y = (H - band_h) // 2
        band_rect = [(0, band_y), (W, band_y + band_h)]
        text_start_y = band_y + pad_v

    draw.rectangle(band_rect, fill=bg_rgba)

    y = text_start_y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_w = bbox[2] - bbox[0]
        x = (W - line_w) // 2
        draw.text((x + 2, y + 2), line, font=font, fill=shadow_rgba)
        draw.text((x, y), line, font=font, fill=text_rgba)
        y += line_h

    result = Image.alpha_composite(img, overlay).convert("RGB")
    result.save(output_path, "JPEG", quality=95)
    print(f"OK: {output_path}")

if __name__ == "__main__":
    add_overlay(
        sys.argv[1], sys.argv[2], sys.argv[3],
        sys.argv[4] if len(sys.argv) > 4 else "top",
        sys.argv[5] if len(sys.argv) > 5 else "#5B9BD5",
        sys.argv[6] if len(sys.argv) > 6 else "#FFFFFF"
    )
