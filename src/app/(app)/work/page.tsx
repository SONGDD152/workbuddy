import { Briefcase, CalendarClock, Wrench } from "lucide-react";
import { FuncGroup, FuncEntry } from "@/components/FunctionDirectory";

export default function WorkPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">工作频道</h1>
        <p className="text-sm text-muted">模块规划中，以下为预留入口</p>
      </header>

      {/* 功能导航：与仓储页一致的分组快捷入口目录（预留项置灰） */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface/60 p-4">
        <FuncGroup title="规划中">
          <FuncEntry icon={CalendarClock} title="工作日程进度" hint="（预留）" disabled />
          <FuncEntry icon={Wrench} title="具体操作技能类" hint="（预留）" disabled />
        </FuncGroup>
      </div>

      <p className="text-sm text-muted">
        侧边栏与底部导航已就绪，待后续阶段填充具体内容，不阻塞当前开发。
      </p>
    </div>
  );
}
