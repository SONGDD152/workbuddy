import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { FuncGroup, FuncEntry } from "@/components/FunctionDirectory";
import { Plane, Shirt, Boxes, Utensils, Heart, Sprout } from "lucide-react";

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

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">生活频道</h1>
        <p className="text-sm text-muted">记录日常 · 管理物品 · 二维码出入库</p>
      </header>

      {/* 功能导航：与仓储页一致的分组快捷入口目录 */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface/60 p-4">
        <FuncGroup title="生活记录">
          <FuncEntry icon={Plane} title="旅行摄影" hint="按年月归档的图文记录" href="/life/travel" badge={travel} />
          <FuncEntry icon={Utensils} title="餐饮" hint="节气家常菜 + 饮食记录" href="/life/food" badge={food} />
          <FuncEntry icon={Heart} title="兴趣爱好" hint="领域时间线 + 进度" href="/life/hobbies" badge={hobby} />
          <FuncEntry icon={Sprout} title="园艺种植" hint="节气种植 + 养护提醒" href="/life/garden" badge={garden} />
        </FuncGroup>
        <FuncGroup title="物品管理">
          <FuncEntry icon={Boxes} title="家庭仓储" hint="二维码出入库 · 借还超期预警" href="/life/storage" badge={storage} />
          <FuncEntry icon={Shirt} title="衣橱穿搭" hint="智能穿搭 + 天气推荐" href="/life/wardrobe" badge={clothing} />
        </FuncGroup>
      </div>
    </div>
  );
}
