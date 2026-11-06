"use client";
import * as React from "react";
import { BrowserQRCodeSvgWriter } from "@zxing/browser";
import { cn } from "@/lib/utils";

/**
 * 二维码显示与导出。
 *
 * 不引入新依赖：项目里扫码用的 @zxing/browser 自带 BrowserQRCodeSvgWriter。
 * 渲染成原始 <img>（SVG data URL）而不是注入 SVG 节点，是为了在手机 WebView
 * 里能长按保存图片 —— 打印贴在仓库上是这个功能的主要用途。
 * 生成的二维码自带白底，截图 / 保存 / 导出都不会变成透明背景。
 */
const SVG_NS = "http://www.w3.org/2000/svg";

/** 生成带白底的二维码 SVG data URL（只在浏览器调用） */
export function qrSvgDataUrl(value: string, size = 240): string {
  const svg = new BrowserQRCodeSvgWriter().write(value, size, size);
  svg.setAttribute("xmlns", SVG_NS);
  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(size));
  bg.setAttribute("height", String(size));
  bg.setAttribute("fill", "#ffffff");
  svg.insertBefore(bg, svg.firstChild);
  const markup = new XMLSerializer().serializeToString(svg);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
}

export function QrCode({
  value,
  size = 180,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setSrc(qrSvgDataUrl(value, size));
    } catch {
      setSrc(null); // 内容异常时留白即可，不影响页面其它部分
    }
  }, [value, size]);

  if (!src) {
    return (
      <div
        role="img"
        aria-label="二维码"
        className={cn("bg-white", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt="仓库二维码"
      width={size}
      height={size}
      className={cn("block bg-white", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** 把二维码导出成带白底的高清 PNG，供打印贴在仓库 / 收纳箱上 */
export async function downloadQrPng(value: string, filename: string, size = 720) {
  const src = qrSvgDataUrl(value, size);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("二维码图片生成失败"));
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前环境不支持 canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
