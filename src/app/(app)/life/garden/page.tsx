import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { GardenClient } from "@/components/life/GardenClient";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function GardenPage() {
  const uid = await getUserId();
  const [vegetables, plants] = await Promise.all([
    safe(() => prisma.vegetable.findMany({ where: { userId: uid! }, orderBy: { name: "asc" } }), []),
    safe(
      () => prisma.gardenPlant.findMany({ where: { userId: uid! }, orderBy: { seedDate: "desc" } }),
      []
    ),
  ]);
  return <GardenClient vegetables={vegetables} plants={plants} />;
}
