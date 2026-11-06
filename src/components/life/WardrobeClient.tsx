"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Shirt,
  Check,
  X,
  MapPin,
  CloudRain,
} from "lucide-react";
import type { Clothing, OutfitFeedback, Season, Occasion } from "@prisma/client";
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
import {
  createClothing,
  updateClothing,
  deleteClothing,
  addOutfitFeedback,
} from "@/lib/actions";
import { getWeatherByCoords, isRainy } from "@/lib/weather";
import { suggestOutfits } from "@/lib/outfit";
import {
  CLOTHING_TYPE_LABEL,
  SEASON_LABEL,
  OCCASION_LABEL,
} from "@/lib/constants";

const TYPES = Object.keys(CLOTHING_TYPE_LABEL);
const SEASONS = Object.keys(SEASON_LABEL);
const OCCASIONS = Object.keys(OCCASION_LABEL);

function ChipSelect({
  options,
  labels,
  value,
  onChange,
}: {
  options: string[];
  labels: Record<string, string>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() =>
              onChange(on ? value.filter((x) => x !== o) : [...value, o])
            }
            className={`rounded-full px-3 py-1 text-xs ${
              on ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted"
            }`}
          >
            {labels[o]}
          </button>
        );
      })}
    </div>
  );
}

function WeatherBox({
  onWeather,
}: {
  onWeather: (w: { temp: number; rain: boolean; desc: string } | null) => void;
}) {
  const [state, setState] = React.useState<"idle" | "loading" | "ok" | "denied">(
    "idle"
  );
  const [info, setInfo] = React.useState<{ temp: number; rain: boolean; desc: string } | null>(
    null
  );
  React.useEffect(() => {
    if (!("geolocation" in navigator)) return setState("denied");
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const w = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          const next = { temp: w.temperature, rain: isRainy(w.code), desc: w.desc };
          setInfo(next);
          onWeather(next);
          setState("ok");
        } catch {
          setState("denied");
        }
      },
      () => setState("denied"),
      { timeout: 8000 }
    );
  }, [onWeather]);

  return (
    <Card>
      <div className="flex items-center gap-2 text-sm">
        <MapPin size={16} className="text-brand" />
        {state === "loading" && "定位中获取天气…"}
        {state === "denied" && (
          <span className="text-muted">未授权定位，可在「今日速览」查看天气</span>
        )}
        {state === "ok" && info && (
          <span>
            {info.temp}℃ {info.desc}
            {info.rain && (
              <span className="ml-2 inline-flex items-center gap-1 text-brand">
                <CloudRain size={14} /> 有降水
              </span>
            )}
          </span>
        )}
      </div>
    </Card>
  );
}

export function WardrobeClient({
  clothes,
  feedbacks,
}: {
  clothes: Clothing[];
  feedbacks: OutfitFeedback[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(clothes);
  const [fb, setFb] = React.useState(feedbacks);
  const [weather, setWeather] = React.useState<{ temp: number; rain: boolean; desc: string } | null>(
    null
  );
  const [occasion, setOccasion] = React.useState("CASUAL");
  const [filter, setFilter] = React.useState({ type: "", season: "", occasion: "" });
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Clothing | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    type: "TOP",
    seasons: [] as string[],
    occasions: [] as string[],
    color: "",
    image: "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setItems(clothes), [clothes]);
  React.useEffect(() => setFb(feedbacks), [feedbacks]);

  const suggestions = React.useMemo(() => {
    if (!weather) return [];
    return suggestOutfits(items, {
      temp: weather.temp,
      rain: weather.rain,
      occasion: occasion as any,
      feedbacks: fb,
    });
  }, [items, weather, occasion, fb]);

  const stats = React.useMemo(() => {
    const byType: Record<string, number> = {};
    const bySeason: Record<string, number> = {};
    const byOccasion: Record<string, number> = {};
    for (const c of items) {
      byType[c.type] = (byType[c.type] || 0) + 1;
      c.seasons.forEach((s) => (bySeason[s] = (bySeason[s] || 0) + 1));
      c.occasions.forEach((o) => (byOccasion[o] = (byOccasion[o] || 0) + 1));
    }
    return { total: items.length, byType, bySeason, byOccasion };
  }, [items]);

  const filtered = items.filter(
    (c) =>
      (!filter.type || c.type === filter.type) &&
      (!filter.season || c.seasons.includes(filter.season as Season)) &&
      (!filter.occasion || c.occasions.includes(filter.occasion as Occasion))
  );

  function openNew() {
    setEditing(null);
    setForm({ name: "", type: "TOP", seasons: [], occasions: [], color: "", image: "" });
    setOpen(true);
  }
  function openEdit(c: Clothing) {
    setEditing(c);
    setForm({
      name: c.name,
      type: c.type,
      seasons: c.seasons,
      occasions: c.occasions,
      color: c.color || "",
      image: c.image || "",
    });
    setOpen(true);
  }
  async function save() {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing) await updateClothing(editing.id, form);
      else await createClothing(form);
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("确认删除该衣物？")) return;
    await deleteClothing(id);
    router.refresh();
  }
  async function feedback(comboKey: string, adopted: boolean) {
    await addOutfitFeedback(comboKey, adopted);
    setFb((p) => [...p, { comboKey, adopted } as OutfitFeedback]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">衣橱 · 智能穿搭</h1>
          <p className="text-sm text-muted">衣物 {stats.total} 件</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> 添加衣物
        </Button>
      </div>

      {/* 今日推荐穿搭 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">今日推荐穿搭</h2>
        <WeatherBox onWeather={setWeather} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">场合：</span>
          <ChipSelect
            options={OCCASIONS}
            labels={OCCASION_LABEL}
            value={[occasion]}
            onChange={(v) => setOccasion(v[0] || "CASUAL")}
          />
        </div>
        {!weather && (
          <p className="text-sm text-muted">授权定位后，将根据温度与降水推荐搭配。</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {suggestions.map((s, i) => {
            const comboKey = s.items.map((c) => `${c.type}:${c.id}`).join("|");
            return (
              <Card key={i}>
                <div className="flex flex-wrap gap-1.5">
                  {s.items.map((c) => (
                    <span key={c.id} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                      {CLOTHING_TYPE_LABEL[c.type]}：{c.name}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">{s.reason}</p>
                <div className="mt-2 flex gap-2">
                  <Button className="px-3 py-1 text-xs" onClick={() => feedback(comboKey, true)}>
                    <Check size={14} /> 采纳
                  </Button>
                  <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => feedback(comboKey, false)}>
                    <X size={14} /> 跳过
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 统计面板 */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">衣物总数</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-muted">按类型</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.byType).map(([k, v]) => (
              <Badge key={k}>{CLOTHING_TYPE_LABEL[k]} {v}</Badge>
            ))}
          </div>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-muted">按季节</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.bySeason).map(([k, v]) => (
              <Badge key={k}>{SEASON_LABEL[k]} {v}</Badge>
            ))}
          </div>
        </Card>
      </section>

      {/* 筛选 */}
      <section className="flex flex-wrap gap-2">
        <Select
          className="w-auto"
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
        >
          <option value="">全部类型</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {CLOTHING_TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto"
          value={filter.season}
          onChange={(e) => setFilter({ ...filter, season: e.target.value })}
        >
          <option value="">全部季节</option>
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {SEASON_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto"
          value={filter.occasion}
          onChange={(e) => setFilter({ ...filter, occasion: e.target.value })}
        >
          <option value="">全部场合</option>
          {OCCASIONS.map((o) => (
            <option key={o} value={o}>
              {OCCASION_LABEL[o]}
            </option>
          ))}
        </Select>
      </section>

      {/* 衣物网格 */}
      {filtered.length === 0 ? (
        <EmptyState title="还没有衣物" hint="添加第一件衣物开始管理衣橱" action={<Button onClick={openNew}><Plus size={16} /> 添加</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((c) => (
            <Card key={c.id} className="card-hover overflow-hidden">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.name} className="h-32 w-full object-cover" />
              ) : (
                <div className="flex h-32 items-center justify-center bg-surface-2 text-muted">
                  <Shirt size={28} />
                </div>
              )}
              <div className="p-2">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-muted">
                  {CLOTHING_TYPE_LABEL[c.type]}
                  {c.color ? ` · ${c.color}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.seasons.slice(0, 3).map((s) => (
                    <Badge key={s}>{SEASON_LABEL[s]}</Badge>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="text-xs text-muted" onClick={() => openEdit(c)}>
                    <Pencil size={12} className="inline" /> 编辑
                  </button>
                  <button className="text-xs text-red-500" onClick={() => remove(c.id)}>
                    <Trash2 size={12} className="inline" /> 删除
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "编辑衣物" : "添加衣物"}>
        <div className="space-y-3">
          <Input placeholder="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm">类型</label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {CLOTHING_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm">季节（可多选）</label>
            <ChipSelect options={SEASONS} labels={SEASON_LABEL} value={form.seasons} onChange={(v) => setForm({ ...form, seasons: v })} />
          </div>
          <div>
            <label className="mb-1 block text-sm">场合（可多选）</label>
            <ChipSelect options={OCCASIONS} labels={OCCASION_LABEL} value={form.occasions} onChange={(v) => setForm({ ...form, occasions: v })} />
          </div>
          <Input placeholder="颜色" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm">照片</label>
            <ImageField value={form.image || undefined} onChange={(url) => setForm({ ...form, image: url || "" })} />
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
