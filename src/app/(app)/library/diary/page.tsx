import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { DiaryClient } from "@/components/library/DiaryClient";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function DiaryPage() {
  const uid = await getUserId();
  const items = await safe(
    () => prisma.diary.findMany({ where: { userId: uid! }, orderBy: { createdAt: "desc" }, take: 500 }),
    []
  );
  return <DiaryClient initial={items.map((d) => ({ id: d.id, content: d.content, createdAt: d.createdAt.toISOString() }))} />;
}
