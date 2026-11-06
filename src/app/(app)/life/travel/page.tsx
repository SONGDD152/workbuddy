import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { FuncEntry, FuncGroup } from "@/components/FunctionDirectory";
import { Plus, History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TravelLanding() {
  const uid = await getUserId();
  const count = await prisma.travel.count({ where: { userId: uid! } }).catch(() => 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">旅行摄影</h1>
        <p className="text-sm text-muted">共 {count} 段旅程 · 图文记录与回看心得</p>
      </header>

      <FuncGroup title="开始">
        <FuncEntry
          icon={Plus}
          title="增加旅行记录"
          hint="上传照片、标记地点与日期，记录旅途"
          href="/life/travel/new"
        />
        <FuncEntry
          icon={History}
          title="浏览历史旅行记录"
          hint={`${count} 段旅程 · 统计与回看心得`}
          href="/life/travel/history"
        />
      </FuncGroup>
    </div>
  );
}
