import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { WardrobeClient } from "@/components/life/WardrobeClient";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function WardrobePage() {
  const uid = await getUserId();
  const [clothes, feedbacks] = await Promise.all([
    safe(() => prisma.clothing.findMany({ where: { userId: uid! }, orderBy: { createdAt: "desc" } }), []),
    safe(() => prisma.outfitFeedback.findMany({ where: { userId: uid! } }), []),
  ]);
  return <WardrobeClient clothes={clothes} feedbacks={feedbacks} />;
}
