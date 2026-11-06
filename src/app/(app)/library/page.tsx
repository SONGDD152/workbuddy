import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { FuncGroup, FuncEntry } from "@/components/FunctionDirectory";
import { BookOpen, Clapperboard, GraduationCap, NotebookPen } from "lucide-react";

export const dynamic = "force-dynamic";

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

export default async function LibraryPage() {
  const uid = await getUserId();
  if (!uid) redirect("/login");

  const [book, movie, study, diary] = await Promise.all([
    safeCount(() => prisma.book.count({ where: { userId: uid } })),
    safeCount(() => prisma.movie.count({ where: { userId: uid } })),
    safeCount(() => prisma.study.count({ where: { userId: uid } })),
    safeCount(() => prisma.diary.count({ where: { userId: uid } })),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">图书馆</h1>
        <p className="text-sm text-muted">读书 · 观影 · 学习 · 日记</p>
      </header>

      {/* 功能导航：与仓储页一致的分组快捷入口目录 */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface/60 p-4">
        <FuncGroup title="阅读与学习">
          <FuncEntry icon={BookOpen} title="读书笔记" hint="笔记 + AI 读书报告" href="/library/books" badge={book} />
          <FuncEntry icon={GraduationCap} title="专业学习" hint="主题笔记 + 总结报告" href="/library/study" badge={study} />
        </FuncGroup>
        <FuncGroup title="记录与分享">
          <FuncEntry icon={Clapperboard} title="影评" hint="碎片记录 + 观影报告" href="/library/movies" badge={movie} />
          <FuncEntry icon={NotebookPen} title="日记" hint="纯文字时间线" href="/library/diary" badge={diary} />
        </FuncGroup>
      </div>
    </div>
  );
}
