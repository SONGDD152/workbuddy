import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { FuncGroup, FuncEntry } from "@/components/FunctionDirectory";
import { MODULES } from "@/lib/modules";

export const dynamic = "force-dynamic";

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

export default async function LifePage() {
  const uid = await getUserId();
  if (!uid) redirect("/login");

  const [travel, clothing, storage, food, hobby, garden] = await Promise.all([
    safeCount(() => prisma.travel.count({ where: { userId: uid } })),
    safeCount(() => prisma.clothing.count({ where: { userId: uid } })),
    safeCount(() => prisma.storageItem.count({ where: { userId: uid } })),
    safeCount(() => prisma.foodRecord.count({ where: { userId: uid } })),
    safeCount(() => prisma.hobby.count({ where: { userId: uid } })),
    safeCount(() => prisma.gardenPlant.count({ where: { userId: uid } })),
  ]);

  const counts: Record<string, number> = {
    "/life/travel": travel,
    "/life/food": food,
    "/life/hobbies": hobby,
    "/life/garden": garden,
    "/life/storage": storage,
    "/life/wardrobe": clothing,
  };

  const life = MODULES.find((m) => m.key === "life")!;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">生活频道</h1>
        <p className="text-sm text-muted">记录日常 · 管理物品 · 二维码出入库</p>
      </header>

      {/* 功能导航：分组快捷入口目录，结构由 modules.tsx 单一提供 */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface/60 p-4">
        {life.groups.map((g) => (
          <FuncGroup key={g.title} title={g.title}>
            {g.items.map((it) => (
              <FuncEntry
                key={it.href}
                icon={it.icon}
                title={it.label}
                hint={it.hint}
                href={it.href}
                badge={counts[it.href]}
              />
            ))}
          </FuncGroup>
        ))}
      </div>
    </div>
  );
}
