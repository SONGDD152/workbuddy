"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Download,
  Upload,
  Save,
  MapPin,
  ImagePlus,
  Images,
  Loader2,
  X,
  Trash2,
  Globe,
  Lock,
} from "lucide-react";
import { Button, Input, Textarea, Select, Card } from "@/components/ui";
import { ImageField, compressImage } from "@/components/ImageField";
import { createTravel, updateTravel } from "@/lib/actions";
import { fmtDate } from "@/lib/utils";

export type TravelFormValue = {
  id?: string;
  title?: string;
  date?: string | Date;
  location?: string | null;
  description?: string | null;
  review?: string | null;
  images?: string[];
  visibility?: "PUBLIC" | "PRIVATE";
};

/**
 * 旅行记录「数据输入页」：新增与编辑共用。
 * - 照片多张（ImageField 仅做「继续添加」按钮，缩略图网格自行渲染）
 * - 地点、日期、旅行记录（description）、回看心得（review）
 * - 保存 / 导出 JSON / 导入 JSON
 */
export function TravelForm({ initial }: { initial?: TravelFormValue }) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [form, setForm] = React.useState({
    title: initial?.title ?? "",
    date: initial?.date ? fmtDate(new Date(initial.date)) : fmtDate(new Date()),
    location: initial?.location ?? "",
    description: initial?.description ?? "",
    review: initial?.review ?? "",
    images: initial?.images ?? [],
    visibility: (initial?.visibility ?? "PRIVATE") as "PUBLIC" | "PRIVATE",
  });
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const batchRef = React.useRef<HTMLInputElement>(null);
  const [batchBusy, setBatchBusy] = React.useState(false);
  const [batchTotal, setBatchTotal] = React.useState(0);
  const [batchDone, setBatchDone] = React.useState(0);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleBatch(files: FileList | null) {
    const imgs = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return;
    setBatchBusy(true);
    setBatchTotal(imgs.length);
    setBatchDone(0);
    const urls: string[] = [];
    const failed: string[] = [];
    for (const f of imgs) {
      try {
        urls.push(await compressImage(f));
      } catch {
        failed.push(f.name || "一张图片");
      }
      setBatchDone((d) => d + 1);
    }
    if (urls.length) setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    setBatchBusy(false);
    setBatchTotal(0);
    setBatchDone(0);
    if (failed.length) alert(`有 ${failed.length} 张图片处理失败（可能过大），已跳过`);
  }

  async function save() {
    const title = form.title.trim() || form.location.trim() || fmtDate(new Date(form.date));
    if (!form.location.trim() && !form.description.trim() && form.images.length === 0) {
      alert("至少填写地点、旅行记录或上传一张照片再保存");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        date: form.date,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        review: form.review.trim() || null,
        images: form.images,
        visibility: form.visibility,
      };
      // 保存即成文：落进「图片+文字」的心得展示页，而不是回到列表
      if (editing) {
        await updateTravel(initial!.id!, payload);
        router.push(`/life/travel/${initial!.id}`);
      } else {
        const created = await createTravel(payload);
        router.push(`/life/travel/${(created as { id?: string })?.id ?? ""}`);
      }
    } catch (e: any) {
      alert(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function exportJson() {
    const data = { ...form, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `旅行记录-${form.location || "未命名"}-${form.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result));
        setForm((f) => ({
          ...f,
          title: typeof d.title === "string" ? d.title : f.title,
          date: typeof d.date === "string" ? d.date : f.date,
          location: typeof d.location === "string" ? d.location : f.location,
          description: typeof d.description === "string" ? d.description : f.description,
          review: typeof d.review === "string" ? d.review : f.review,
          images: Array.isArray(d.images) ? d.images : f.images,
          visibility: d.visibility === "PUBLIC" || d.visibility === "PRIVATE" ? d.visibility : f.visibility,
        }));
      } catch {
        alert("导入失败：文件不是有效的旅行记录 JSON");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{editing ? "编辑旅行记录" : "增加旅行记录"}</h1>
        <p className="text-sm text-muted">照片、地点、日期与旅行记录，可保存也可导入导出</p>
      </div>

      {/* 照片 */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ImagePlus size={16} className="text-brand" /> 照片（可多张）
          </div>
          <Button variant="outline" onClick={() => batchRef.current?.click()} disabled={batchBusy}>
            {batchBusy ? <Loader2 size={16} className="animate-spin" /> : <Images size={16} />}
            {batchBusy ? `处理中 ${batchDone}/${batchTotal}` : "从相册批量选图"}
          </Button>
        </div>
        {form.images.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {form.images.map((img, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-20 w-20 rounded-xl object-cover" />
                <button
                  type="button"
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                  onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                  aria-label="移除"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        <ImageField
          value={undefined}
          onChange={(url) => url && setForm((f) => ({ ...f, images: [...f.images, url] }))}
        />
        <input
          ref={batchRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = "";
            handleBatch(files);
          }}
        />
      </Card>

      {/* 地点 + 日期 */}
      <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-muted">旅游地点</label>
          <div className="relative">
            <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              placeholder="城市 / 景点"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-muted">日期</label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
      </Card>

      {/* 旅行记录 */}
      <Card className="space-y-2 p-4">
        <label className="block text-sm font-medium text-muted">旅行记录</label>
        <Textarea
          rows={4}
          placeholder="记录这段旅程的见闻与感受…"
          className="resize-y"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Card>

      {/* 回看心得 */}
      <Card className="space-y-2 p-4">
        <label className="block text-sm font-medium text-muted">回看心得（初记）</label>
        <Textarea
          rows={3}
          placeholder="日后回看这段记录时写下的感想…"
          className="resize-y"
          value={form.review}
          onChange={(e) => set("review", e.target.value)}
        />
        <p className="text-xs text-muted">
          这里记的是总评；保存后可在心得页的评论区像留言一样，随时补写带时间的回看
        </p>
      </Card>

      {/* 可见性 */}
      <Card className="space-y-2 p-4">
        <label className="block text-sm font-medium text-muted">可见性</label>
        <Select value={form.visibility} onChange={(e) => set("visibility", e.target.value as "PUBLIC" | "PRIVATE")}>
          <option value="PRIVATE">私密（仅自己可见）</option>
          <option value="PUBLIC">公开（进入内容广场）</option>
        </Select>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          {form.visibility === "PRIVATE" ? <Lock size={12} /> : <Globe size={12} />}
          回看心得始终仅自己可见，不会进入内容广场
        </p>
      </Card>

      {/* 操作 */}
      <div className="sticky bottom-2 flex flex-wrap gap-2 rounded-2xl border border-border bg-surface/95 p-3 backdrop-blur">
        <Button onClick={save} disabled={saving} className="flex-1">
          <Save size={16} /> {saving ? "保存中…" : "保存"}
        </Button>
        <Button variant="outline" onClick={exportJson}>
          <Download size={16} /> 导出
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> 导入
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) importJson(f);
          }}
        />
        {editing && (
          <Button
            variant="ghost"
            className="text-red-500"
            onClick={async () => {
              if (!confirm("确认删除这条旅行记录？")) return;
              const { deleteTravel } = await import("@/lib/actions");
              await deleteTravel(initial!.id!);
              router.push("/life/travel/history");
            }}
          >
            <Trash2 size={16} /> 删除
          </Button>
        )}
      </div>
    </div>
  );
}
