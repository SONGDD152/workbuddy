"use client";
import * as React from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, X, AlertTriangle, ImagePlus, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useKeyboardInset } from "@/lib/useKeyboardInset";

/**
 * 条码 / 二维码录入。
 *
 * 摄像头是首选，但嵌入式 WebView、桌面浏览器、权限被拒的设备都可能
 * 拿不到 getUserMedia，所以这里永远保留两条不依赖摄像头的路：
 *   1) 从相册选一张拍好的条码照片，用 ZXing 静态解码；
 *   2) 手动输入条码数字 / 二维码内容。
 * 旧版 APK 没申请摄像头权限时，扫码功能因此仍然可用。
 *
 * continuous = true 时识别成功不关闭摄像头，用于「连续入库」；
 * 相同内容 1.8 秒内只回调一次，避免逐帧解码把同一件东西重复入库。
 */
export function Scanner({
  onResult,
  onClose,
  title,
  hint,
  footer,
  continuous = false,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
  footer?: React.ReactNode;
  continuous?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<any>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  // 调用方常传内联箭头函数；用 ref 存最新回调，避免 effect 反复重启摄像头
  const onResultRef = React.useRef(onResult);
  onResultRef.current = onResult;
  const continuousRef = React.useRef(continuous);
  continuousRef.current = continuous;
  const lastRef = React.useRef({ text: "", at: 0 });

  const keyboardInset = useKeyboardInset();
  const [error, setError] = React.useState<string | null>(null);
  const [manual, setManual] = React.useState("");
  const [reading, setReading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        if (!videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, _err, ctrl) => {
            if (!result || cancelled) return;
            const text = result.getText();
            if (continuousRef.current) {
              const now = Date.now();
              if (text === lastRef.current.text && now - lastRef.current.at < 1800) return;
              lastRef.current = { text, at: now };
              onResultRef.current(text);
              return;
            }
            ctrl.stop();
            onResultRef.current(text);
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (e: any) {
        if (cancelled) return;
        const denied =
          e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError";
        setError(
          denied
            ? "摄像头权限被拒绝。可在系统设置里允许，或直接用下面的「从相册识别」"
            : "摄像头没打开（App 未授权、设备不支持或非 HTTPS）。可用下面的「从相册识别」或手动输入"
        );
      }
    }
    start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop?.();
    };
  }, []);

  async function readImage(file: File) {
    setReading(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error("读取失败"));
        fr.readAsDataURL(file);
      });
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(dataUrl);
      onResultRef.current(result.getText());
    } catch {
      setError("这张图里没认出条码，换一张更清晰、正对条码的照片，或直接手动输入");
    } finally {
      setReading(false);
    }
  }

  function submitManual() {
    const text = manual.trim();
    if (!text) return;
    setManual("");
    onResultRef.current(text);
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex flex-col bg-black"
      style={{ bottom: keyboardInset }}
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Camera size={18} /> {title || "扫码"}
        </span>
        <button
          className="tap rounded-lg p-2 text-white/80 hover:bg-white/10"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <video ref={videoRef} className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-2xl border-2 border-white/80" />
        </div>
        <p className="absolute inset-x-0 bottom-3 px-6 text-center text-xs text-white/70">
          {hint || "将条码 / 二维码对准取景框"}
        </p>
      </div>

      <div className="shrink-0 space-y-3 bg-surface px-4 pb-5 pt-4">
        {footer}
        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-brand/10 px-3 py-2 text-xs text-brand">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) readImage(f);
          }}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileRef.current?.click()}
          disabled={reading}
        >
          {reading ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
          {reading ? "识别中…" : "从相册识别"}
        </Button>
        <div className="flex gap-2">
          <Input
            placeholder="手动输入条码 / 二维码内容"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
          />
          <Button className="shrink-0" onClick={submitManual} disabled={!manual.trim()}>
            确定
          </Button>
        </div>
        <p className="text-xs text-muted">
          {continuous
            ? "连续模式：识别成功不会关闭，可接着扫下一件；摄像头打不开也能用「从相册识别」或手输。"
            : "摄像头打不开也能用：先拍一张条码照片，点「从相册识别」，或直接手输。"}
        </p>
      </div>
    </div>
  );
}
