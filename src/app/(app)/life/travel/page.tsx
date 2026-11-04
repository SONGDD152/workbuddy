import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TravelClient } from "@/components/life/TravelClient";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function TravelPage() {
  const uid = await getUserId();
  const items = await safe(
    () =>
      prisma.travel.findMany({
        where: { userId: uid! },
        orderBy: { date: "desc" },
      }),
    []
  );
  return <TravelClient initial={items} />;
}
