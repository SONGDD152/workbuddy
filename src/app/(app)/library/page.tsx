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

export default async function LibraryPage() {
  const uid = await getUserId();
  if (!uid) redirect("/login");

  const [book, movie, study, diary] = await Promise.all([
    safeCount(() => prisma.book.count({ where: { userId: uid } })),
    safeCount(() => prisma.movie.count({ where: { userId: uid } })),
    safeCount(() => prisma.study.count({ where: { userId: uid } })),
    safeCount(() => prisma.diary.count({ where: { userId: uid } })),
  ]);

  const counts: Record<string, number> = {
    "/library/books": book,
    "/library/movies": movie,
    "/library/study": study,
    "/library/diary": diary,
  };

  const library = MODULES.find((m) => m.key === "library")!;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">图书馆</h1>
        <p className="text-sm text-muted">读书 · 观影 · 学习 · 日记</p>
      </header>

      {/* 功能导航：分组快捷入口目录，结构由 modules.tsx 单一提供 */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface/60 p-4">
        {library.groups.map((g) => (
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
