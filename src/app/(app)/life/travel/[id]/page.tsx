import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TravelView } from "@/components/life/TravelView";
import type { TravelFormValue } from "@/components/life/TravelForm";

export const dynamic = "force-dynamic";

/** 旅游心得展示页：历史概述点进来先看成文（图片+文字），编辑需点「编辑」进表单。 */
export default async function TravelViewPage({ params }: { params: { id: string } }) {
  const uid = await getUserId();
  const t = await prisma.travel.findFirst({ where: { id: params.id, userId: uid! } });
  if (!t) notFound();

  const notes = await prisma.travelNote.findMany({
    where: { travelId: t.id, userId: uid! },
    orderBy: { createdAt: "asc" },
  });

  const data: TravelFormValue = {
    id: t.id,
    title: t.title,
    date: t.date,
    location: t.location,
    description: t.description,
    review: (t as any).review ?? null,
    images: t.images,
    visibility: t.visibility,
  };
  return (
    <TravelView
      data={data}
      notes={notes.map((n) => ({
        id: n.id,
        travelId: n.travelId,
        content: n.content,
        createdAt: n.createdAt,
      }))}
    />
  );
}
