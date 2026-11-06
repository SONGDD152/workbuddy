import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TravelHistory } from "@/components/life/TravelHistory";
import type { TravelFormValue } from "@/components/life/TravelForm";
import type { TravelNoteValue } from "@/components/life/TravelView";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function TravelHistoryPage() {
  const uid = await getUserId();
  const items = await safe(
    () =>
      prisma.travel.findMany({
        where: { userId: uid! },
        orderBy: { date: "desc" },
      }),
    []
  );
  const notes = await safe(
    () =>
      prisma.travelNote.findMany({
        where: { userId: uid! },
        orderBy: { createdAt: "desc" },
      }),
    []
  );
  const initial: TravelFormValue[] = items.map((t) => ({
    id: t.id,
    title: t.title,
    date: t.date,
    location: t.location,
    description: t.description,
    review: (t as any).review ?? null,
    images: t.images,
    visibility: t.visibility,
  }));
  const noteList: TravelNoteValue[] = notes.map((n) => ({
    id: n.id,
    travelId: n.travelId,
    content: n.content,
    createdAt: n.createdAt,
  }));
  return <TravelHistory initial={initial} notes={noteList} />;
}
