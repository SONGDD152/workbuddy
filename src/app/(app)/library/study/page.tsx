import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { LibraryList } from "@/components/library/LibraryList";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function StudyPage() {
  const uid = await getUserId();
  const studies = await safe(
    () =>
      prisma.study.findMany({
        where: { userId: uid! },
        orderBy: { createdAt: "desc" },
        include: { notes: { select: { id: true } }, report: true },
      }),
    []
  );
  const items = studies.map((s) => ({
    id: s.id,
    title: s.topic,
    subtitle: null,
    type: s.status === "DONE" ? "已完成" : s.status === "PAUSED" ? "搁置" : "进行中",
    visibility: s.visibility,
    noteCount: s.notes.length,
    hasReport: !!s.report,
  }));
  return <LibraryList kind="study" items={items} />;
}
