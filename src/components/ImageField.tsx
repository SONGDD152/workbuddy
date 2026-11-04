"use client";
import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui";

export function ImageField({
  value,
  onChange,
  capture = false,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  capture?: boolean;
}) {
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handle(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) onChange(data.url);
    } finally {
      setUploading(false);
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
          if (f) handle(f);
        }}
      />
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="预览"
            className="h-32 w-32 rounded-xl object-cover"
          />
          <button
            type="button"
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
            onClick={() => onChange(undefined)}
            aria-label="移除"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
          {capture ? "拍照 / 选图" : "上传图片"}
        </Button>
      )}
    </div>
  );
}
