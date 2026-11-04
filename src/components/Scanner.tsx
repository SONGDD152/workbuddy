"use client";
import * as React from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

export function Scanner({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<any>(null);
  const [error, setError] = React.useState<string | null>(null);

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
            if (result && !cancelled) {
              onResult(result.getText());
              ctrl.stop();
            }
          }
        );
        controlsRef.current = controls;
      } catch (e: any) {
        setError(
          e?.name === "NotAllowedError"
            ? "摄像头权限被拒绝，请在浏览器设置中允许后重试"
            : "无法启动摄像头（设备可能不支持或页面非 HTTPS）"
        );
      }
    }
    start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop?.();
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="flex items-center gap-2">
          <Camera size={18} /> 扫码
        </span>
        <button onClick={onClose} aria-label="关闭">
          <X size={20} />
        </button>
      </div>
      <div className="relative flex-1">
        <video ref={videoRef} className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 border-2 border-white/80 rounded-lg" />
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 bg-red-500/90 p-3 text-sm text-white">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      <p className="bg-black p-3 text-center text-xs text-white/70">
        将条码 / 二维码对准取景框
      </p>
    </div>
  );
}
