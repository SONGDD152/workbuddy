"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, MapPin, Lock, Globe } from "lucide-react";
import {
  Button,
  Card,
  Modal,
  Input,
  Textarea,
  Select,
  Badge,
  EmptyState,
} from "@/components/ui";
import { ImageField } from "@/components/ImageField";
import { createTravel, updateTravel, deleteTravel } from "@/lib/actions";
import { fmtDate, VISIBILITY_LABEL } from "@/lib/utils";

type Travel = {
  id: string;
  title: string;
  date: string | Date;
  location: string | null;
  description: string | null;
  images: string[];
  visibility: "PUBLIC" | "PRIVATE";
};

export function TravelClient({ initial }: { initial: Travel[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Travel | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    date: fmtDate(new Date()),
    location: "",
    description: "",
    images: [] as string[],
    visibility: "PRIVATE" as "PUBLIC" | "PRIVATE",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setItems(initial), [initial]);

  function openNew() {
    setEditing(null);
    setForm({
      title: "",
      date: fmtDate(new Date()),
      location: "",
      description: "",
      images: [],
      visibility: "PRIVATE",
    });
    setOpen(true);
  }
  function openEdit(t: Travel) {
    setEditing(t);
    setForm({
      title: t.title,
      date: fmtDate(t.date),
      location: t.location || "",
      description: t.description || "",
      images: t.images || [],
      visibility: t.visibility,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title) return;
    setSaving(true);
    try {
      if (editing) {
        await updateTravel(editing.id, form);
      } else {
        await createTravel(form);
      }
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("确认删除？")) return;
    await deleteTravel(id);
    router.refresh();
  }

  // 按 年-月 分组
  const groups = React.useMemo(() => {
    const m = new Map<string, Travel[]>();
    for (const it of items) {
      const d = new Date(it.date);
      const key = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    return Array.from(m.entries());
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">旅行摄影</h1>
          <p className="text-sm text-muted">按时间归档的图文记录</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> 新建
        </Button>
      </div>

      {items.length === 0 && (
        <EmptyState title="还没有旅行记录" hint="记录下一段旅程吧" action={<Button onClick={openNew}><Plus size={16} /> 新建</Button>} />
      )}

      {groups.map(([key, list]) => (
        <section key={key}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{key}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <Card key={t.id} className="card-hover overflow-hidden">
                {t.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.images[0]} alt={t.title} className="h-40 w-full object-cover" />
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium">{t.title}</h3>
                    {t.visibility === "PRIVATE" ? (
                      <Lock size={14} className="text-muted" />
                    ) : (
                      <Globe size={14} className="text-brand" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{fmtDate(t.date)}</p>
                  {t.location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <MapPin size={12} /> {t.location}
                    </p>
                  )}
                  {t.description && (
                    <p className="mt-2 line-clamp-3 text-sm">{t.description}</p>
                  )}
                  {t.images?.length > 1 && (
                    <div className="mt-2 flex gap-1">
                      {t.images.slice(1, 4).map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={img} className="h-10 w-10 rounded object-cover" alt="" />
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => openEdit(t)}>
                      <Pencil size={14} /> 编辑
                    </Button>
                    <Button variant="ghost" className="px-2 py-1 text-xs text-red-500" onClick={() => remove(t.id)}>
                      <Trash2 size={14} /> 删除
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "编辑记录" : "新建旅行记录"}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">标题</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm">日期</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm">地点</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">描述</label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm">照片（可多张）</label>
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} className="h-20 w-20 rounded object-cover" alt="" />
              ))}
            </div>
            <div className="mt-2">
              <ImageField
                value={undefined}
                onChange={(url) => url && setForm({ ...form, images: [...form.images, url] })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">可见性</label>
            <Select
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}
            >
              <option value="PRIVATE">私密</option>
              <option value="PUBLIC">公开</option>
            </Select>
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
