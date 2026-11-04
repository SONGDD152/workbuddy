import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { StorageClient } from "@/components/life/StorageClient";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fb;
  }
}

export default async function StoragePage() {
  const uid = await getUserId();
  const items = await safe(
    () => prisma.storageItem.findMany({ where: { userId: uid! }, orderBy: { createdAt: "desc" } }),
    []
  );
  return <StorageClient initial={items} />;
}
