"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";
import { addDiary, deleteDiary } from "@/lib/actions";
import { fmtDate } from "@/lib/utils";

type Entry = { id: string; content: string; createdAt: string };

export function DiaryClient({ initial }: { initial: Entry[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => setItems(initial), [initial]);

  const groups = React.useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const it of items) {
      const d = new Date(it.createdAt);
      const key = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    return Array.from(m.entries());
  }, [items]);

  async function add() {
    if (!draft.trim()) return;
    await addDiary(draft);
    setDraft("");
    router.refresh();
  }
  async function remove(id: string) {
    await deleteDiary(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">日记 · 碎碎念</h1>

      <Card>
        <textarea
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          rows={3}
          placeholder="写下今天…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={add}><Plus size={16} /> 记录</Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState title="还没有日记" hint="写下第一段文字吧" />
      ) : (
        groups.map(([key, list]) => (
          <section key={key}>
            <h2 className="mb-2 text-sm font-semibold text-muted">{key}</h2>
            <div className="space-y-2">
              {list.map((e) => (
                <Card key={e.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap text-sm">{e.content}</p>
                    <button className="shrink-0 text-red-500" onClick={() => remove(e.id)} aria-label="删除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted">{fmtDate(e.createdAt, "yyyy-MM-dd HH:mm")}</p>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
