# -*- coding: utf-8 -*-
"""
生成 PWA 静态资源：应用图标 + 扫码用二维码。

用法（一次性工具，不参与线上构建）：
    python -m pip install pillow qrcode
    python scripts/generate-pwa-assets.py

图标素材：scripts/assets/icon-source.png（1024x1024，已去除生成水印）
  白色二次元小狗从淡蓝小房子的圆门探出头，底部有绿色草地与小白花。
  想换插画时替换这张图即可重跑，各尺寸会自动重新裁切。
  若重新用 AI 生成，注意清掉右下角平台水印，并保证主体在中心 70% 内。

尺寸处理：
  - any（192/512/64）：整图 + squircle 圆角透明边 + 极淡蓝内缘描边，浅图标在白桌面才有轮廓。
  - maskable：缩到 92% 后用背景色满铺，边缘高斯羽化避免方框接缝；主体落进中心安全区。
  - apple-touch / favicon：满铺不透明，iOS 会把透明像素渲染成黑角。

配色联动：改插画后需同步 public/manifest.webmanifest 的 background_color / theme_color、
public/sw.js 离线页配色，并递增 sw.js 的 CACHE 版本（否则已安装设备仍读旧图标缓存）。

换域名时改下面的 SITE_URL 后重跑即可。
"""
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter
import qrcode
from qrcode.constants import ERROR_CORRECT_H

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"
SOURCE = ROOT / "scripts/assets/icon-source.png"
ICONS.mkdir(parents=True, exist_ok=True)

SITE_URL = "https://songdd.online"
INSTALL_URL = f"{SITE_URL}/install"
# 扫码直接下载签名 APK（原生 WebView 壳）。版本升级时需同步替换 public/downloads/ 下的文件并更新此文件名。
APK_URL = f"{SITE_URL}/downloads/xiaobaiguanjia-v1.6.0.apk"

EDGE = (110, 170, 215, 70)  # squircle 内缘极淡蓝描边


@lru_cache(maxsize=1)
def _source() -> Image.Image:
    if not SOURCE.exists():
        raise FileNotFoundError(f"缺少图标素材：{SOURCE}")
    return Image.open(SOURCE).convert("RGBA")


@lru_cache(maxsize=1)
def _bg() -> tuple:
    """取四角背景平均色，用于 maskable 的满铺底色，保证与插画背景自然衔接。"""
    im = _source().convert("RGB")
    w, h = im.size
    samples = []
    for box in [(0, 0, 24, 24), (w - 24, 0, w, 24),
                (0, h - 24, 24, h), (w - 24, h - 24, w, h)]:
        samples.append(im.crop(box).resize((1, 1), Image.BOX).getpixel((0, 0)))
    return tuple(sum(s[i] for s in samples) // 4 for i in range(3))


def make_icon(size: int, maskable: bool = False, opaque: bool = False) -> Image.Image:
    """2 倍超采样合成（不超过素材原生 1024px，避免无意义的放大）。"""
    s = size * 2

    if maskable:
        art = _source().resize((int(s * 0.92),) * 2, Image.LANCZOS)
        small = art.width
        img = Image.new("RGBA", (s, s), _bg() + (255,))
        fade = max(2, int(small * 0.05))
        blend = Image.new("L", (small, small), 0)
        ImageDraw.Draw(blend).rectangle(
            (fade, fade, small - fade - 1, small - fade - 1), fill=255
        )
        blend = blend.filter(ImageFilter.GaussianBlur(fade * 0.7))
        offset = (s - small) // 2
        img.paste(art, (offset, offset), blend)
        return img.resize((size, size), Image.LANCZOS)

    radius = int(s * 0.22)
    if opaque:
        mask = Image.new("L", (s, s), 255)
    else:
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (0, 0, s - 1, s - 1), radius=radius, fill=255
        )

    img = _source().resize((s, s), Image.LANCZOS).copy()
    img.putalpha(mask)

    if not opaque:
        highlight = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        inset = max(1, int(s * 0.006))
        ImageDraw.Draw(highlight).rounded_rectangle(
            (inset, inset, s - 1 - inset, s - 1 - inset),
            radius=max(1, radius - inset),
            outline=EDGE,
            width=inset,
        )
        highlight.putalpha(ImageChops.multiply(highlight.getchannel("A"), mask))
        img.alpha_composite(highlight)

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
    print("图标素材:", SOURCE.name, "| 背景色:", _bg())
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
    make_qr(APK_URL, "qr-apk.png")
    print("完成。")


if __name__ == "__main__":
    main()
