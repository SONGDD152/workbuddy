import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { FoodClient } from "@/components/life/FoodClient";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function FoodPage() {
  const uid = await getUserId();
  const records = await safe(
    () => prisma.foodRecord.findMany({ where: { userId: uid! }, orderBy: { recordedAt: "desc" }, take: 300 }),
    []
  );
  return <FoodClient initial={records} />;
}
