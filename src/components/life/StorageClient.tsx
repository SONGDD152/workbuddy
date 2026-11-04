"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Search, ScanLine, Boxes } from "lucide-react";
import {
  Button,
  Card,
  Modal,
  Input,
  Select,
  Badge,
  EmptyState,
} from "@/components/ui";
import { ImageField } from "@/components/ImageField";
import { Scanner } from "@/components/Scanner";
import {
  createStorageItem,
  updateStorageItem,
  deleteStorageItem,
} from "@/lib/actions";
import { STORAGE_CATEGORY_LABEL } from "@/lib/constants";

type Item = {
  id: string;
  name: string;
  category: string;
  room: string | null;
  position: string | null;
  barcode: string | null;
  image: string | null;
  note: string | null;
};

export function StorageClient({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [query, setQuery] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [room, setRoom] = React.useState("");
  const [scanner, setScanner] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Item | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    category: "DAILY",
    room: "",
    position: "",
    barcode: "",
    image: "",
    note: "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setItems(initial), [initial]);

  const rooms = React.useMemo(
    () => Array.from(new Set(items.map((i) => i.room).filter(Boolean))) as string[],
    [items]
  );

  const filtered = items.filter((i) => {
    const q = query.trim().toLowerCase();
    const hit =
      !q ||
      [i.name, i.category, i.room, i.position, i.note, i.barcode]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q));
    return hit && (!cat || i.category === cat) && (!room || i.room === room);
  });

  const stats = React.useMemo(() => {
    const byCat: Record<string, number> = {};
    const byRoom: Record<string, number> = {};
    for (const i of items) {
      byCat[i.category] = (byCat[i.category] || 0) + 1;
      if (i.room) byRoom[i.room] = (byRoom[i.room] || 0) + 1;
    }
    return { total: items.length, byCat, byRoom };
  }, [items]);

  function openNew(barcode?: string) {
    setEditing(null);
    setForm({ name: "", category: "DAILY", room: "", position: "", barcode: barcode || "", image: "", note: "" });
    setOpen(true);
  }
  function openEdit(it: Item) {
    setEditing(it);
    setForm({
      name: it.name,
      category: it.category,
      room: it.room || "",
      position: it.position || "",
      barcode: it.barcode || "",
      image: it.image || "",
      note: it.note || "",
    });
    setOpen(true);
  }
  async function save() {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing) await updateStorageItem(editing.id, form);
      else await createStorageItem(form);
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("确认删除？")) return;
    await deleteStorageItem(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">家庭仓储</h1>
          <p className="text-sm text-muted">共 {stats.total} 件物品 · 支持关键词与扫码搜索</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScanner(true)}>
            <ScanLine size={16} /> 扫码
          </Button>
          <Button onClick={() => openNew()}>
            <Plus size={16} /> 添加
          </Button>
        </div>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-muted" />
          <Input
            className="pl-9"
            placeholder="搜索名称 / 品类 / 位置 / 备注 / 条码"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select className="w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">全部品类</option>
          {Object.entries(STORAGE_CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select className="w-auto" value={room} onChange={(e) => setRoom(e.target.value)}>
          <option value="">全部房间</option>
          {rooms.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">物品总数</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-muted">各品类</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.byCat).map(([k, v]) => (
              <Badge key={k}>{STORAGE_CATEGORY_LABEL[k]} {v}</Badge>
            ))}
          </div>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-muted">各房间</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.byRoom).map(([k, v]) => (
              <Badge key={k}>{k} {v}</Badge>
            ))}
          </div>
        </Card>
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <EmptyState title="没有匹配的物品" hint="换个关键词，或添加新物品 / 扫码录入" action={<Button onClick={() => openNew()}><Plus size={16} /> 添加</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => (
            <Card key={it.id}>
              <div className="flex gap-3">
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt={it.name} className="h-20 w-20 rounded object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded bg-surface-2 text-muted">
                    <Boxes size={22} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <p className="truncate font-medium">{it.name}</p>
                    <Badge>{STORAGE_CATEGORY_LABEL[it.category]}</Badge>
                  </div>
                  {(it.room || it.position) && (
                    <p className="mt-0.5 text-xs text-muted">
                      📍 {[it.room, it.position].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {it.barcode && <p className="text-xs text-muted">条码：{it.barcode}</p>}
                  {it.note && <p className="mt-1 line-clamp-2 text-xs">{it.note}</p>}
                  <div className="mt-2 flex gap-2">
                    <button className="text-xs text-muted" onClick={() => openEdit(it)}>
                      <Pencil size={12} className="inline" /> 编辑
                    </button>
                    <button className="text-xs text-red-500" onClick={() => remove(it.id)}>
                      <Trash2 size={12} className="inline" /> 删除
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "编辑物品" : "添加物品"}>
        <div className="space-y-3">
          <Input placeholder="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm">品类</label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(STORAGE_CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm">房间</label>
              <Input placeholder="如 阳台" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </div>
          </div>
          <Input placeholder="具体位置，如 右侧柜子第二层" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <Input placeholder="条码（可扫码自动填充）" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm">照片</label>
            <ImageField value={form.image || undefined} onChange={(url) => setForm({ ...form, image: url || "" })} />
          </div>
          <TextareaX value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </Modal>

      {scanner && (
        <Scanner
          onResult={(text) => {
            setScanner(false);
            openNew(text);
          }}
          onClose={() => setScanner(false)}
        />
      )}
    </div>
  );
}

function TextareaX({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
      rows={3}
      placeholder="备注"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
