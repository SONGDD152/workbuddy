"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronDown, Lock, Globe } from "lucide-react";
import { Button, Card, Modal, Input, Select, Badge, EmptyState, Toggle } from "@/components/ui";
import { ImageField } from "@/components/ImageField";
import {
  createHobby,
  updateHobby,
  deleteHobby,
  createHobbyEntry,
  deleteHobbyEntry,
} from "@/lib/actions";
import { fmtDate, PROGRESS_LABEL, VISIBILITY_LABEL } from "@/lib/utils";

type Entry = { id: string; content: string; status: string; image: string | null; createdAt: string | Date };
type Hobby = {
  id: string;
  name: string;
  visibility: "PUBLIC" | "PRIVATE";
  entries: Entry[];
};

export function HobbiesClient({ initial }: { initial: Hobby[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [expanded, setExpanded] = React.useState<string | null>(initial[0]?.id ?? null);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Hobby | null>(null);
  const [form, setForm] = React.useState({ name: "", visibility: "PRIVATE" });
  const [entryForm, setEntryForm] = React.useState({ hobbyId: "", content: "", status: "ONGOING", image: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setItems(initial), [initial]);

  const stats = React.useMemo(() => {
    const totalEntries = items.reduce((a, h) => a + h.entries.length, 0);
    const done = items.reduce((a, h) => a + h.entries.filter((e) => e.status === "DONE").length, 0);
    return {
      domains: items.length,
      totalEntries,
      completion: totalEntries ? Math.round((done / totalEntries) * 100) : 0,
    };
  }, [items]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", visibility: "PRIVATE" });
    setOpen(true);
  }
  function openEdit(h: Hobby) {
    setEditing(h);
    setForm({ name: h.name, visibility: h.visibility });
    setOpen(true);
  }
  async function save() {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing) await updateHobby(editing.id, form);
      else await createHobby(form);
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("确认删除该领域及其记录？")) return;
    await deleteHobby(id);
    router.refresh();
  }
  function startEntry(hobbyId: string) {
    setEntryForm({ hobbyId, content: "", status: "ONGOING", image: "" });
  }
  async function addEntry() {
    if (!entryForm.content) return;
    await createHobbyEntry(entryForm);
    setEntryForm({ hobbyId: "", content: "", status: "ONGOING", image: "" });
    router.refresh();
  }
  async function removeEntry(id: string) {
    await deleteHobbyEntry(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">兴趣爱好</h1>
          <p className="text-sm text-muted">领域 {stats.domains} · 记录 {stats.totalEntries} · 完成率 {stats.completion}%</p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> 新领域</Button>
      </div>

      {items.length === 0 && (
        <EmptyState title="还没有兴趣领域" hint="添加一个领域，开始记录时间线" action={<Button onClick={openNew}><Plus size={16} /> 新建</Button>} />
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((h) => (
          <Card key={h.id}>
            <div className="flex items-center justify-between">
              <button className="flex flex-1 items-center gap-2 text-left" onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
                <ChevronDown size={16} className={expanded === h.id ? "rotate-180 transition" : "transition"} />
                <span className="font-medium">{h.name}</span>
                {h.visibility === "PRIVATE" ? <Lock size={13} className="text-muted" /> : <Globe size={13} className="text-brand" />}
              </button>
              <div className="flex gap-1">
                <button className="text-xs text-muted" onClick={() => openEdit(h)}><Pencil size={12} className="inline" /> 编辑</button>
                <button className="text-xs text-red-500" onClick={() => remove(h.id)}><Trash2 size={12} className="inline" /> 删除</button>
              </div>
            </div>

            {expanded === h.id && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {h.entries.map((e) => (
                  <div key={e.id} className="rounded-xl bg-surface-2 p-2">
                    <div className="flex items-center justify-between">
                      <Badge>{PROGRESS_LABEL[e.status]}</Badge>
                      <span className="text-xs text-muted">{fmtDate(e.createdAt, "yyyy-MM-dd HH:mm")}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{e.content}</p>
                    {e.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.image} alt="" className="mt-1 h-24 w-24 rounded object-cover" />
                    )}
                    <button className="mt-1 text-xs text-red-500" onClick={() => removeEntry(e.id)}>删除</button>
                  </div>
                ))}
                {entryForm.hobbyId === h.id ? (
                  <div className="space-y-2 rounded-xl border border-border p-2">
                    <TextareaX value={entryForm.content} onChange={(v) => setEntryForm({ ...entryForm, content: v })} placeholder="记录这一刻…" />
                    <div className="flex gap-2">
                      <Select value={entryForm.status} onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value })}>
                        {Object.entries(PROGRESS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </Select>
                      <ImageField value={entryForm.image || undefined} onChange={(url) => setEntryForm({ ...entryForm, image: url || "" })} />
                      <Button className="px-3 py-1 text-xs" onClick={addEntry}>添加</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" className="w-full py-1 text-xs" onClick={() => startEntry(h.id)}>
                    <Plus size={12} /> 追加记录
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "编辑领域" : "新建领域"}>
        <div className="space-y-3">
          <Input placeholder="领域名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">可见性</span>
            <select
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}
            >
              <option value="PRIVATE">私密</option>
              <option value="PUBLIC">公开</option>
            </select>
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
        </div>
      </Modal>
    </div>
  );
}

function TextareaX({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
      rows={3}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
