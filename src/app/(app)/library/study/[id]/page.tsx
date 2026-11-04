import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { NoteDetail } from "@/components/library/NoteDetail";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function StudyDetail({ params }: { params: { id: string } }) {
  const uid = await getUserId();
  const study = await safe(
    () =>
      prisma.study.findFirst({
        where: { id: params.id, userId: uid! },
        include: { notes: { orderBy: { createdAt: "desc" } }, report: true },
      }),
    null
  );
  if (!study) notFound();
  return (
    <NoteDetail
      kind="study"
      id={study.id}
      title={study.topic}
      initialNotes={study.notes.map((n) => ({ id: n.id, content: n.content, createdAt: n.createdAt.toISOString() }))}
      initialReport={study.report ? { content: study.report.content, score: null, summary: null } : null}
    />
  );
}
