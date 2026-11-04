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

export default async function MovieDetail({ params }: { params: { id: string } }) {
  const uid = await getUserId();
  const movie = await safe(
    () =>
      prisma.movie.findFirst({
        where: { id: params.id, userId: uid! },
        include: { notes: { orderBy: { createdAt: "desc" } }, report: true },
      }),
    null
  );
  if (!movie) notFound();
  return (
    <NoteDetail
      kind="movie"
      id={movie.id}
      title={movie.title}
      initialNotes={movie.notes.map((n) => ({ id: n.id, content: n.content, createdAt: n.createdAt.toISOString() }))}
      initialReport={movie.report ? { content: movie.report.content, score: movie.report.score, summary: movie.report.summary } : null}
    />
  );
}
