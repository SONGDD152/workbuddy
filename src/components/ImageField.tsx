"use client";
import * as React from "react";
import { ImagePlus, Loader2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * 图片选择：在浏览器里压缩成 WebP data URL 后直接回填，不再上传文件。
 *
 * 站点部署在 Vercel —— 文件系统只读，且实例无状态。原来的 /api/upload
 * 往 public/uploads 写文件必定 500，就算写成功也会在下一次部署后消失。
 * 压缩后单张通常 60~150 KB，可以随表单一起存进数据库的 String 字段，
 * 刷新、换设备、重新部署都不会丢，也不需要任何图床密钥。
 *
 * 代价是图片会占用数据库体积，所以这里把长边压到 960px、质量 0.72，
 * 并在过大时自动再降一档；不适合存原图 / 视频。
 */
const MAX_EDGE = 960;
const QUALITY = 0.72;
const SOFT_LIMIT = 380_000; // data URL 字符数，超过就降质重试
const HARD_LIMIT = 650_000; // 再大就明确拒绝，避免撑爆表单提交

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取这张图片，请换一张试试"));
    };
    img.src = url;
  });
}

async function compress(file: File): Promise<string> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器不支持图片处理");

  // 先铺白底：不支持 WebP 时退回 JPEG 才不会把透明区域变成黑块
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let webp = canvas.toDataURL("image/webp", QUALITY);
  const type = webp.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
  let out = type === "image/webp" ? webp : canvas.toDataURL("image/jpeg", QUALITY);

  if (out.length > SOFT_LIMIT) {
    const smaller = canvas.toDataURL(type, 0.55);
    if (smaller.length < out.length) out = smaller;
  }
  if (out.length > HARD_LIMIT) {
    throw new Error("这张图片太大了，换一张或先裁剪一下再选");
  }
  return out;
}

/** 供 TravelForm 等批量选图复用：把图片压缩成 WebP data URL。 */
export async function compressImage(file: File): Promise<string> {
  return compress(file);
}

export function ImageField({
  value,
  onChange,
  capture = false,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  capture?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handle(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    setBusy(true);
    try {
      onChange(await compress(file));
    } catch (e: any) {
      // 失败必须看得见：原来静默吞掉错误，用户只会觉得「点了没反应」
      setError(e?.message || "图片处理失败，请换一张试试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // 允许连续选择同一张图
          if (f) handle(f);
        }}
      />
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="预览" className="h-32 w-32 rounded-xl object-cover" />
          <button
            type="button"
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1.5 text-white"
            onClick={() => {
              setError(null);
              onChange(undefined);
            }}
            aria-label="移除"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <>
          <Button
            variant="outline"
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
            {busy ? "处理中…" : capture ? "拍照 / 选图" : "上传图片"}
          </Button>
          {error ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle size={14} /> {error}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">
              自动压缩后随记录一起保存，不用等上传
            </p>
          )}
        </>
      )}
    </div>
  );
}
