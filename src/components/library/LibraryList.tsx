"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Lock, Globe, FileText } from "lucide-react";
import {
  Button,
  Card,
  Modal,
  Input,
  Select,
  Badge,
  EmptyState,
} from "@/components/ui";
import {
  createBook,
  deleteBook,
  createMovie,
  deleteMovie,
  createStudy,
  deleteStudy,
  setContentVisibility,
} from "@/lib/actions";

type Item = {
  id: string;
  title: string;
  subtitle?: string | null;
  type?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  noteCount: number;
  hasReport: boolean;
};

const CFG: Record<string, any> = {
  book: { label: "读书笔记", addLabel: "添加书籍", create: createBook, del: deleteBook, types: ["小说", "历史", "社科", "科技", "经济", "其他"] },
  movie: { label: "影评", addLabel: "添加影片", create: createMovie, del: deleteMovie, types: ["电影", "剧集", "纪录片", "动画", "其他"] },
  study: { label: "专业学习", addLabel: "添加主题", create: createStudy, del: deleteStudy, types: ["进行中", "已完成"] },
};

const EMPTY_FORM = { title: "", author: "", type: "", status: "ONGOING", visibility: "PRIVATE" };

export function LibraryList({ kind, items }: { kind: string; items: Item[] }) {
  const router = useRouter();
  const cfg = CFG[kind];
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const types = Array.from(new Set(items.map((i) => i.type).filter(Boolean))) as string[];
  const shown = items.filter((i) => !filter || i.type === filter);

  async function save() {
    if (!form.title) return;
    setSaving(true);
    try {
      if (kind === "book") await cfg.create({ title: form.title, author: form.author || null, type: form.type || null, visibility: form.visibility });
      else if (kind === "movie") await cfg.create({ title: form.title, genre: form.type || null, visibility: form.visibility });
      else await cfg.create({ topic: form.title, status: form.status, visibility: form.visibility });
      router.refresh();
      setOpen(false);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("确认删除？相关笔记与报告也会删除。")) return;
    await cfg.del(id);
    router.refresh();
  }

  /** 切换公开 / 私密：只改当前账号自己的这条记录 */
  async function toggle(it: Item) {
    const next = it.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    setBusy(it.id);
    try {
      await setContentVisibility(kind, it.id, next);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{cfg.label}</h1>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> {cfg.addLabel}</Button>
      </div>

      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        标为「公开」的条目会出现在
        <Link href="/explore" target="_blank" rel="noopener noreferrer" className="mx-1 font-medium text-brand hover:underline">公开内容广场</Link>
        ，其他账号与未登录访客可见；「私密」仅自己可见。笔记、报告与日记正文永不公开。
      </p>

      {types.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilter("")} className={`rounded-full px-3 py-1 text-xs ${!filter ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted"}`}>全部</button>
          {types.map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={`rounded-full px-3 py-1 text-xs ${filter === t ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted"}`}>{t}</button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="还没有内容" hint={`点击右上角${cfg.addLabel}`} action={<Button onClick={() => setOpen(true)}><Plus size={16} /> {cfg.addLabel}</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((it) => (
            <Card key={it.id} className="flex flex-col">
              <Link href={`/library/${kind === "study" ? "study" : kind === "movie" ? "movies" : "books"}/${it.id}`} className="flex-1">
                <div className="flex items-start justify-between">
                  <p className="font-medium">{it.title}</p>
                  {it.visibility === "PRIVATE" ? <Lock size={13} className="text-muted" /> : <Globe size={13} className="text-brand" />}
                </div>
                {it.subtitle && <p className="mt-0.5 text-sm text-muted">{it.subtitle}</p>}
                {it.type && <Badge className="mt-1">{it.type}</Badge>}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <FileText size={12} /> {it.noteCount} 条笔记
                  {it.hasReport && <span className="text-brand">· 已生成报告</span>}
                </div>
              </Link>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button className="text-xs text-red-500" onClick={() => remove(it.id)}>
                  <Trash2 size={12} className="inline" /> 删除
                </button>
                <button
                  className={`inline-flex items-center gap-1 text-xs ${it.visibility === "PUBLIC" ? "text-brand" : "text-muted"}`}
                  onClick={() => toggle(it)}
                  disabled={busy === it.id}
                  title={it.visibility === "PUBLIC" ? "点击改为私密" : "点击公开到广场"}
                >
                  {it.visibility === "PUBLIC" ? <Globe size={12} /> : <Lock size={12} />}
                  {busy === it.id ? "切换中…" : it.visibility === "PUBLIC" ? "已公开" : "设为公开"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={cfg.addLabel}>
        <div className="space-y-3">
          <Input placeholder={kind === "study" ? "主题名称" : "名称"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          {kind === "book" && <Input placeholder="作者（可选）" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />}
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="">选择{kind === "study" ? "分类" : "类型"}（可选）</option>
            {cfg.types.map((t: string) => (<option key={t} value={t}>{t}</option>))}
          </Select>
          {kind === "study" && (
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ONGOING">进行中</option>
              <option value="DONE">已完成</option>
              <option value="PAUSED">搁置</option>
            </Select>
          )}
          <Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
            <option value="PRIVATE">私密（仅自己可见）</option>
            <option value="PUBLIC">公开（出现在广场）</option>
          </Select>
          <Button className="w-full" onClick={save} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
        </div>
      </Modal>
    </div>
  );
}
