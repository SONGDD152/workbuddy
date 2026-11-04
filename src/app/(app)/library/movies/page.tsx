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

export default async function MoviesPage() {
  const uid = await getUserId();
  const movies = await safe(
    () =>
      prisma.movie.findMany({
        where: { userId: uid! },
        orderBy: { createdAt: "desc" },
        include: { notes: { select: { id: true } }, report: true },
      }),
    []
  );
  const items = movies.map((m) => ({
    id: m.id,
    title: m.title,
    subtitle: m.genre,
    type: m.genre,
    visibility: m.visibility,
    noteCount: m.notes.length,
    hasReport: !!m.report,
  }));
  return <LibraryList kind="movie" items={items} />;
}
