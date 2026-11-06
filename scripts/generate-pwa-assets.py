# -*- coding: utf-8 -*-
"""
生成 PWA 静态资源：应用图标 + 扫码用二维码。

用法（一次性工具，不参与线上构建）：
    python -m pip install pillow qrcode
    python scripts/generate-pwa-assets.py

如果以后换了域名或想改图标配色，改下面的常量后重新运行，
把 public/ 下生成的产物一起 git push 即可，Vercel 会自动发布。
"""
from pathlib import Path

from PIL import Image, ImageDraw
import qrcode
from qrcode.constants import ERROR_CORRECT_H

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"
ICONS.mkdir(parents=True, exist_ok=True)

SITE_URL = "https://songdd.online"
INSTALL_URL = f"{SITE_URL}/install"

BG_TOP = (41, 37, 33)       # 深墨
BG_BOTTOM = (18, 16, 14)
BRAND = (245, 158, 11)      # amber-500，与站点品牌色一致
CUTOUT = (24, 21, 18)


def make_icon(size: int, maskable: bool = False) -> Image.Image:
    """4 倍超采样绘制，缩放后得到平滑边缘。"""
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    grad = Image.new("RGB", (s, s))
    gd = ImageDraw.Draw(grad)
    for y in range(s):
        t = y / max(s - 1, 1)
        gd.line(
            [(0, y), (s, y)],
            fill=tuple(int(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM)),
        )

    if maskable:
        # Android 会按圆形/方形遮罩裁切，背景必须铺满整块，不能有透明边
        mask = Image.new("L", (s, s), 255)
    else:
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=255
        )
    img.paste(grad, (0, 0), mask)

    cx = cy = s / 2
    r = s * (0.20 if maskable else 0.27)
    d = ImageDraw.Draw(img)
    d.polygon(
        [(cx, cy - r), (cx + r * 0.86, cy), (cx, cy + r), (cx - r * 0.86, cy)],
        fill=BRAND + (255,),
    )
    ri = r * 0.30
    d.polygon(
        [(cx, cy - ri), (cx + ri * 0.86, cy), (cx, cy + ri), (cx - ri * 0.86, cy)],
        fill=CUTOUT + (255,),
    )

    return img.resize((size, size), Image.LANCZOS)


def make_qr(url: str, name: str) -> None:
    qr = qrcode.QRCode(
        version=None, error_correction=ERROR_CORRECT_H, box_size=14, border=3
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1c1917", back_color="white").convert("RGB")
    img.save(PUBLIC / name, optimize=True)
    print(f"  {name}: {img.size[0]}x{img.size[1]} -> {url}")


def main() -> None:
    print("生成应用图标：")
    for filename, size, maskable in [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, False),
        ("icon-64.png", 64, False),
    ]:
        make_icon(size, maskable).save(ICONS / filename, optimize=True)
        print(f"  icons/{filename}: {size}x{size} maskable={maskable}")

    favicon = make_icon(64).convert("RGBA")
    favicon.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("  favicon.ico")

    print("生成二维码：")
    make_qr(INSTALL_URL, "qr-install.png")
    make_qr(SITE_URL + "/", "qr-site.png")
    print("完成。")


if __name__ == "__main__":
    main()
