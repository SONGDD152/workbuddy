"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Utensils, Trash2, Flame, Leaf } from "lucide-react";
import { Button, Card, Modal, Input, Select, Badge, Toggle, EmptyState } from "@/components/ui";
import { ImageField } from "@/components/ImageField";
import { WeatherBox } from "@/components/WeatherBox";
import { createFoodRecord, deleteFoodRecord } from "@/lib/actions";
import { suggestDishes } from "@/lib/food";
import { currentSolarTerm, fmtDate, MEAL_LABEL } from "@/lib/utils";

type Rec = {
  id: string;
  meal: string;
  name: string;
  note: string | null;
  calories: number | null;
  image: string | null;
  recordedAt: string | Date;
};

const MEALS = ["BREAKFAST", "LUNCH", "DINNER"];

export function FoodClient({ initial }: { initial: Rec[] }) {
  const router = useRouter();
  const [records, setRecords] = React.useState(initial);
  const [weather, setWeather] = React.useState<{ temp: number; rain: boolean } | null>(null);
  const [reduceFat, setReduceFat] = React.useState(false);
  const [meal, setMeal] = React.useState("LUNCH");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ meal: "LUNCH", name: "", note: "", calories: "", image: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setRecords(initial), [initial]);
  const term = currentSolarTerm();

  const dishes = suggestDishes({
    meal: meal as any,
    term,
    temp: weather?.temp ?? 20,
    rain: weather?.rain ?? false,
    reduceFat,
  });

  const isToday = (s: string | Date) => fmtDate(s) === fmtDate(new Date());
  const today = records.filter((r) => isToday(r.recordedAt));
  const history = records.filter((r) => !isToday(r.recordedAt));

  const todayByMeal = MEALS.map((m) => ({ m, list: today.filter((r) => r.meal === m) }));
  const totalCal = today.reduce((a, r) => a + (r.calories || 0), 0);
  const redLine = reduceFat && totalCal > 1800;

  async function save() {
    if (!form.name) return;
    setSaving(true);
    try {
      await createFoodRecord({
        meal: form.meal,
        name: form.name,
        note: form.note || null,
        calories: form.calories ? Number(form.calories) : null,
        image: form.image || null,
      });
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    await deleteFoodRecord(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">餐饮 · 智能饮食</h1>
          <p className="text-sm text-muted">当前节气：{term}</p>
        </div>
        <div className="flex items-center gap-2">
          <Leaf size={16} className={reduceFat ? "text-green-500" : "text-muted"} />
          <Toggle checked={reduceFat} onChange={setReduceFat} label="减脂期" />
        </div>
      </div>

      <Card>
        <WeatherBox onWeather={setWeather} />
      </Card>

      {/* 智能推荐 */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Utensils size={18} className="text-brand" />
          <h2 className="font-semibold">家常菜推荐</h2>
          <div className="ml-auto flex gap-1">
            {MEALS.map((m) => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={`rounded-full px-3 py-1 text-xs ${meal === m ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted"}`}
              >
                {MEAL_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dishes.map((d) => (
            <Card key={d.name}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{d.name}</p>
                <Badge className={d.burden === "高" ? "bg-red-500/15 text-red-500" : d.burden === "中" ? "bg-amber-500/15 text-amber-600" : "bg-green-500/15 text-green-600"}>
                  油糖负担 {d.burden}
                </Badge>
              </div>
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-muted">
                {d.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {reduceFat && d.burden === "高" && (
                <p className="mt-2 text-xs text-red-500">减脂期建议少吃</p>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* 今日饮食记录 */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">今日饮食记录</h2>
          <Button onClick={() => { setForm({ ...form, meal }); setOpen(true); }}>
            <Plus size={16} /> 记录一餐
          </Button>
        </div>
        <div className="space-y-3">
          {todayByMeal.map(({ m, list }) => (
            <div key={m}>
              <p className="mb-1 text-sm font-medium text-muted">{MEAL_LABEL[m]}</p>
              {list.length === 0 ? (
                <p className="text-xs text-muted">未记录</p>
              ) : (
                <div className="space-y-2">
                  {list.map((r) => (
                    <Card key={r.id} className="flex items-center gap-3 py-2">
                      {r.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="h-14 w-14 rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.name}</p>
                        {r.note && <p className="line-clamp-1 text-xs text-muted">{r.note}</p>}
                        {r.calories != null && <p className="text-xs text-muted">{r.calories} kcal</p>}
                      </div>
                      <button className="text-red-500" onClick={() => remove(r.id)} aria-label="删除">
                        <Trash2 size={14} />
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 每日小结 */}
      <Card className="flex items-center gap-3">
        <Flame size={20} className="text-orange-500" />
        <div>
          <p className="font-medium">今日摄入概览</p>
          <p className="text-sm text-muted">{totalCal} kcal · {today.length} 餐记录</p>
        </div>
        {redLine && (
          <span className="ml-auto rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-500">
            ⚠ 已踩减脂红线
          </span>
        )}
      </Card>

      {/* 历史 */}
      {history.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">历史记录</h2>
          <div className="space-y-2">
            {history.map((r) => (
              <Card key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted">
                    {fmtDate(r.recordedAt, "yyyy-MM-dd HH:mm")} · {MEAL_LABEL[r.meal]}
                    {r.calories != null ? ` · ${r.calories}kcal` : ""}
                  </p>
                </div>
                <button className="text-red-500" onClick={() => remove(r.id)} aria-label="删除">
                  <Trash2 size={14} />
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="记录一餐">
        <div className="space-y-3">
          <Select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })}>
            {MEALS.map((m) => (
              <option key={m} value={m}>{MEAL_LABEL[m]}</option>
            ))}
          </Select>
          <Input placeholder="食物名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="做法备注（可选）" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <Input type="number" placeholder="热量 kcal（可选）" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm">拍餐盘</label>
            <ImageField capture value={form.image || undefined} onChange={(url) => setForm({ ...form, image: url || "" })} />
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
