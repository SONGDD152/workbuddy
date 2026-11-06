import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TravelForm, type TravelFormValue } from "@/components/life/TravelForm";

export const dynamic = "force-dynamic";

export default async function EditTravelPage({ params }: { params: { id: string } }) {
  const uid = await getUserId();
  const t = await prisma.travel.findFirst({ where: { id: params.id, userId: uid! } });
  if (!t) notFound();

  const initial: TravelFormValue = {
    id: t.id,
    title: t.title,
    date: t.date,
    location: t.location,
    description: t.description,
    review: (t as any).review ?? null,
    images: t.images,
    visibility: t.visibility,
  };
  return <TravelForm initial={initial} />;
}
