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

export default async function BookDetail({ params }: { params: { id: string } }) {
  const uid = await getUserId();
  const book = await safe(
    () =>
      prisma.book.findFirst({
        where: { id: params.id, userId: uid! },
        include: { notes: { orderBy: { createdAt: "desc" } }, report: true },
      }),
    null
  );
  if (!book) notFound();
  return (
    <NoteDetail
      kind="book"
      id={book.id}
      title={book.title}
      initialNotes={book.notes.map((n) => ({ id: n.id, content: n.content, createdAt: n.createdAt.toISOString() }))}
      initialReport={book.report ? { content: book.report.content, score: book.report.score, summary: book.report.summary } : null}
    />
  );
}
