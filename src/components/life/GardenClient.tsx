"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Sprout, MapPin, Droplets, AlertTriangle } from "lucide-react";
import { Button, Card, Modal, Input, Select, Badge, EmptyState } from "@/components/ui";
import { WeatherBox } from "@/components/WeatherBox";
import { createVegetable, createGardenPlant, updateGardenPlant, deleteGardenPlant } from "@/lib/actions";
import { getWeatherByCoords, getRainNext48h } from "@/lib/weather";
import { DEFAULT_VEGETABLES } from "@/lib/vegetables";
import { currentSolarTerm, fmtDate, PLANT_STATUS_LABEL } from "@/lib/utils";

type Veg = { id: string; name: string; growDays: number; suitableTerm: string | null; tag: string | null };
type Plant = {
  id: string;
  vegetable: string;
  seedDate: string | Date;
  method: string | null;
  location: string | null;
  status: string;
  note: string | null;
  estHarvest: string | Date | null;
};

export function GardenClient({ vegetables, plants }: { vegetables: Veg[]; plants: Plant[] }) {
  const router = useRouter();
  const [vegs, setVegs] = React.useState(vegetables);
  const [plantList, setPlantList] = React.useState(plants);
  const [weather, setWeather] = React.useState<{ temp: number; rain: boolean; rain48: number } | null>(null);
  const [openVeg, setOpenVeg] = React.useState(false);
  const [openPlant, setOpenPlant] = React.useState(false);
  const [vegForm, setVegForm] = React.useState({ name: "", growDays: 60, suitableTerm: "", tag: "" });
  const [plantForm, setPlantForm] = React.useState({
    vegetable: "",
    seedDate: fmtDate(new Date()),
    method: "播种",
    location: "",
    status: "GROWING",
    note: "",
    estHarvest: "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setVegs(vegetables), [vegetables]);
  React.useEffect(() => setPlantList(plants), [plants]);

  // 天气 + 48h 降雨（养护提醒）
  React.useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const w = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        const rain48 = await getRainNext48h(pos.coords.latitude, pos.coords.longitude);
        setWeather({ temp: w.temperature, rain: false, rain48 });
      } catch {
        /* ignore */
      }
    });
  }, []);

  const term = currentSolarTerm();
  const library = React.useMemo(
    () => [...DEFAULT_VEGETABLES.map((v) => ({ ...v, id: "def-" + v.name })), ...vegs],
    [vegs]
  );
  const recommended = library.filter((v) => v.suitableTerm === term);

  function reminder(p: Plant): string | null {
    if (!weather) return null;
    const days = Math.floor((Date.now() - new Date(p.seedDate).getTime()) / 86400000);
    if (weather.rain48 > 5) return "未来 48h 降雨 >5mm，暂缓浇水";
    if (weather.temp >= 30 && weather.rain48 <= 1) return "连续高温无雨，建议清晨浇水";
    const veg = library.find((v) => v.name === p.vegetable);
    if (veg && veg.growDays > 0 && days > 0 && days % Math.max(1, Math.floor(veg.growDays * 0.3)) === 0)
      return "进入追肥节点，可适量追肥";
    if (p.status === "GROWING" && veg && days >= veg.growDays - 7) return "临近成熟，注意采收";
    return null;
  }

  async function saveVeg() {
    if (!vegForm.name) return;
    setSaving(true);
    try {
      await createVegetable({ ...vegForm, growDays: Number(vegForm.growDays) });
      router.refresh();
      setOpenVeg(false);
    } finally {
      setSaving(false);
    }
  }
  async function savePlant() {
    if (!plantForm.vegetable) return;
    setSaving(true);
    try {
      const veg = library.find((v) => v.name === plantForm.vegetable);
      await createGardenPlant({
        ...plantForm,
        growDays: veg?.growDays ?? 60,
        estHarvest: plantForm.estHarvest || undefined,
      });
      router.refresh();
      setOpenPlant(false);
    } finally {
      setSaving(false);
    }
  }
  async function removePlant(id: string) {
    if (!confirm("确认删除该种植记录？")) return;
    await deleteGardenPlant(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">园艺 · 蔬菜种植</h1>
          <p className="text-sm text-muted">当前节气：{term} · 内置菜库 {library.length} 种</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenVeg(true)}><Plus size={16} /> 加菜种</Button>
          <Button onClick={() => setOpenPlant(true)}><Plus size={16} /> 记录种植</Button>
        </div>
      </div>

      <Card>
        <WeatherBox onWeather={(w) => w && setWeather((p) => ({ ...(p || { rain48: 0 }), temp: w.temp, rain: w.rain }))} />
      </Card>

      {/* 节气种植推荐 */}
      <section>
        <h2 className="mb-2 font-semibold">本月（{term}）适合种</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {recommended.length === 0 && <p className="text-sm text-muted">本月暂无匹配菜种，可在菜库查看全部。</p>}
          {recommended.map((v) => (
            <Card key={v.id} className="py-3">
              <p className="font-medium">{v.name}</p>
              <p className="text-xs text-muted">生长 {v.growDays} 天 · {v.tag}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 种植记录 */}
      <section>
        <h2 className="mb-2 font-semibold">种植记录</h2>
        {plantList.length === 0 ? (
          <EmptyState title="还没有种植记录" hint="从菜库选一种蔬菜开始记录吧" action={<Button onClick={() => setOpenPlant(true)}><Plus size={16} /> 记录</Button>} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {plantList.map((p) => {
              const r = reminder(p);
              return (
                <Card key={p.id}>
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1 font-medium"><Sprout size={16} className="text-brand" /> {p.vegetable}</p>
                    <Badge>{PLANT_STATUS_LABEL[p.status]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    播种 {fmtDate(p.seedDate)} · 预计成熟 {p.estHarvest ? fmtDate(p.estHarvest) : "—"}
                  </p>
                  {(p.location || p.method) && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <MapPin size={12} /> {[p.location, p.method].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {p.note && <p className="mt-1 line-clamp-2 text-sm">{p.note}</p>}
                  {r && (
                    <p className="mt-2 flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-600">
                      <AlertTriangle size={12} /> {r}
                    </p>
                  )}
                  <button className="mt-2 text-xs text-red-500" onClick={() => removePlant(p.id)}>
                    <Trash2 size={12} className="inline" /> 删除
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 菜库 */}
      <section>
        <h2 className="mb-2 font-semibold">菜库</h2>
        <div className="flex flex-wrap gap-2">
          {library.map((v) => (
            <Badge key={v.id} className="bg-surface-2">{v.name}（{v.growDays}天）</Badge>
          ))}
        </div>
      </section>

      <Modal open={openVeg} onClose={() => setOpenVeg(false)} title="新增菜种">
        <div className="space-y-3">
          <Input placeholder="蔬菜名" value={vegForm.name} onChange={(e) => setVegForm({ ...vegForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="生长天数" value={vegForm.growDays} onChange={(e) => setVegForm({ ...vegForm, growDays: Number(e.target.value) })} />
            <Input placeholder="适宜节气，如 春" value={vegForm.suitableTerm} onChange={(e) => setVegForm({ ...vegForm, suitableTerm: e.target.value })} />
          </div>
          <Input placeholder="标签，如 喜温/耐寒" value={vegForm.tag} onChange={(e) => setVegForm({ ...vegForm, tag: e.target.value })} />
          <Button className="w-full" onClick={saveVeg} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
        </div>
      </Modal>

      <Modal open={openPlant} onClose={() => setOpenPlant(false)} title="记录种植">
        <div className="space-y-3">
          <Select value={plantForm.vegetable} onChange={(e) => setPlantForm({ ...plantForm, vegetable: e.target.value })}>
            <option value="">选择蔬菜（来自菜库）</option>
            {library.map((v) => (<option key={v.id} value={v.name}>{v.name}</option>))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={plantForm.seedDate} onChange={(e) => setPlantForm({ ...plantForm, seedDate: e.target.value })} />
            <Select value={plantForm.method} onChange={(e) => setPlantForm({ ...plantForm, method: e.target.value })}>
              <option value="播种">播种</option>
              <option value="移栽苗">移栽苗</option>
            </Select>
          </div>
          <Input placeholder="位置：阳台/露台/菜地/盆编号" value={plantForm.location} onChange={(e) => setPlantForm({ ...plantForm, location: e.target.value })} />
          <Select value={plantForm.status} onChange={(e) => setPlantForm({ ...plantForm, status: e.target.value })}>
            {Object.entries(PLANT_STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </Select>
          <Input type="date" placeholder="预计成熟（可空，自动推算）" value={plantForm.estHarvest} onChange={(e) => setPlantForm({ ...plantForm, estHarvest: e.target.value })} />
          <Input placeholder="时间线备注（发芽/间苗/搭架…）" value={plantForm.note} onChange={(e) => setPlantForm({ ...plantForm, note: e.target.value })} />
          <Button className="w-full" onClick={savePlant} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
        </div>
      </Modal>
    </div>
  );
}
