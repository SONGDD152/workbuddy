import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { HobbiesClient } from "@/components/life/HobbiesClient";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function HobbiesPage() {
  const uid = await getUserId();
  const hobbies = await safe(
    () =>
      prisma.hobby.findMany({
        where: { userId: uid! },
        orderBy: { createdAt: "desc" },
        include: { entries: { orderBy: { createdAt: "desc" } } },
      }),
    []
  );
  return <HobbiesClient initial={hobbies} />;
}
