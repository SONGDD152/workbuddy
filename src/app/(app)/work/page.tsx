import { Construction } from "lucide-react";
import { Card } from "@/components/ui";

export default function WorkPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">工作频道</h1>
        <p className="text-sm text-muted">预留模块位，后续迭代填充，不阻塞当前开发</p>
      </header>

      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Construction size={40} className="text-muted" />
        <p className="text-lg font-semibold">建设中</p>
        <p className="max-w-md text-sm text-muted">
          工作频道入口已就绪，侧边栏可正常切换。以下两个一级模块预留位置，将在后续阶段填充：
        </p>
        <div className="mt-2 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-dashed border-border p-4 text-sm">
            <p className="font-medium">工作日程进度</p>
            <p className="text-muted">（预留）</p>
          </div>
          <div className="rounded-xl border border-dashed border-border p-4 text-sm">
            <p className="font-medium">具体操作技能类</p>
            <p className="text-muted">（预留）</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
