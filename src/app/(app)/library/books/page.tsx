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

export default async function BooksPage() {
  const uid = await getUserId();
  const books = await safe(
    () =>
      prisma.book.findMany({
        where: { userId: uid! },
        orderBy: { createdAt: "desc" },
        include: { notes: { select: { id: true } }, report: true },
      }),
    []
  );
  const items = books.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.author,
    type: b.type,
    visibility: b.visibility,
    noteCount: b.notes.length,
    hasReport: !!b.report,
  }));
  return <LibraryList kind="book" items={items} />;
}
