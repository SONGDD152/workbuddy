# -*- coding: utf-8 -*-
"""
生成 PWA 静态资源：应用图标 + 扫码用二维码。

用法（一次性工具，不参与线上构建）：
    python -m pip install pillow qrcode
    python scripts/generate-pwa-assets.py

如果以后换了域名或想改图标配色，改下面的常量后重新运行，
把 public/ 下生成的产物一起 git push 即可，Vercel 会自动发布。

图标设计说明（亮色 · 清新风）：
  - 淡薄荷白 squircle 底 + 青绿「圆角菱形环」+ 柔暖黄中心点，像嫩芽与花心，
    也呼应站内的园艺 / 植物频道；沿用站点 ◆ 品牌符号的轮廓。
  - 低饱和、通透、留白多；青绿在浅底上对比足够，小尺寸不发虚，暖黄点负责辨识度。
  - 外缘用极淡青灰细描边，避免浅色图标在白色桌面背景上「糊成一片」。
  - apple-touch-icon / favicon 必须满铺不透明：iOS 会把透明像素渲染成黑角。
  - maskable 图形缩到中心安全区（顶点距中心 < 0.33 * size），避免被圆形遮罩裁掉。
  - 改动图标后请同步递增 public/sw.js 里的 CACHE 版本，否则已安装设备仍读旧缓存。
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw
import qrcode
from qrcode.constants import ERROR_CORRECT_H

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"
ICONS.mkdir(parents=True, exist_ok=True)

SITE_URL = "https://songdd.online"
INSTALL_URL = f"{SITE_URL}/install"

BG_TOP = (247, 253, 249)     # 淡薄荷白
BG_BOTTOM = (226, 244, 234)  # 极淡青绿
BG_MID = (237, 249, 242)     # 环内回填色，取渐变中段，肉眼无色差
RING_INK = (31, 138, 106)    # 清新青绿，浅底上仍清晰
DOT = (245, 190, 92)         # 柔暖黄花心，低饱和点睛
EDGE = (31, 138, 106, 30)    # squircle 内缘极淡青灰描边


def _diamond(side: int, radius: int, fill: tuple) -> Image.Image:
    """画一个旋转 45° 的圆角矩形，得到圆角菱形。"""
    tile = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle(
        (0, 0, side - 1, side - 1), radius=max(1, radius), fill=fill
    )
    return tile.rotate(45, resample=Image.BICUBIC, expand=True)


def _center(canvas: Image.Image, layer: Image.Image) -> None:
    x = (canvas.width - layer.width) // 2
    y = (canvas.height - layer.height) // 2
    canvas.alpha_composite(layer, (x, y))


def make_icon(size: int, maskable: bool = False, opaque: bool = False) -> Image.Image:
    """4 倍超采样绘制，缩放后得到平滑边缘。

    maskable: 背景满铺且图形缩小，供 Android 圆形/方形遮罩裁切。
    opaque:   背景满铺不透明（iOS / favicon 用），避免透明像素变黑角。
    """
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

    radius = int(s * 0.22)
    if maskable or opaque:
        mask = Image.new("L", (s, s), 255)
    else:
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (0, 0, s - 1, s - 1), radius=radius, fill=255
        )
    img.paste(grad, (0, 0), mask)

    # 内缘高光：单独一层绘制，再用同一个 mask 裁掉圆角外的部分。
    # maskable 会被系统按未知形状裁切，边缘装饰会残留成断弧，因此跳过。
    if not maskable:
        highlight = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        inset = int(s * 0.006)
        ImageDraw.Draw(highlight).rounded_rectangle(
            (inset, inset, s - 1 - inset, s - 1 - inset),
            radius=max(1, radius - inset),
            outline=EDGE,
            width=max(1, int(s * 0.006)),
        )
        highlight.putalpha(ImageChops.multiply(highlight.getchannel("A"), mask))
        img.alpha_composite(highlight)

    # 菱形环：金色外菱形 + 背景色内菱形回填，得到均匀的环
    outer = int(s * (0.42 if maskable else 0.48))
    ring = int(s * (0.0525 if maskable else 0.060))
    inner = outer - ring * 2
    _center(img, _diamond(outer, int(outer * 0.16), RING_INK + (255,)))
    _center(img, _diamond(inner, int(inner * 0.16), BG_MID + (255,)))

    # 中心暖黄花心，让环有焦点
    dot = int(s * (0.048 if maskable else 0.055))
    cx = cy = s // 2
    ImageDraw.Draw(img).ellipse(
        (cx - dot, cy - dot, cx + dot, cy + dot), fill=DOT + (255,)
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
    for filename, size, maskable, opaque in [
        ("icon-192.png", 192, False, False),
        ("icon-512.png", 512, False, False),
        ("icon-maskable-512.png", 512, True, False),
        ("apple-touch-icon.png", 180, False, True),
        ("icon-64.png", 64, False, False),
    ]:
        make_icon(size, maskable, opaque).save(ICONS / filename, optimize=True)
        print(f"  icons/{filename}: {size}x{size} maskable={maskable} opaque={opaque}")

    favicon = make_icon(64, opaque=True).convert("RGB")
    favicon.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("  favicon.ico")

    print("生成二维码：")
    make_qr(INSTALL_URL, "qr-install.png")
    make_qr(SITE_URL + "/", "qr-site.png")
    print("完成。")


if __name__ == "__main__":
    main()
