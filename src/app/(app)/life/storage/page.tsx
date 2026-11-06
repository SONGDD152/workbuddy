import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { StorageClient } from "@/components/life/StorageClient";
import type { WarehouseInfo } from "@/lib/warehouse";

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
  const [items, warehouses] = await Promise.all([
    safe(
      async () =>
        (
          await prisma.storageItem.findMany({
            where: { userId: uid! },
            orderBy: { createdAt: "desc" },
          })
        ).map((it) => ({ ...it, createdAt: it.createdAt.toISOString() })),
      []
    ),
    safe<WarehouseInfo[]>(
      async () =>
        (
          await prisma.warehouse.findMany({
            where: { userId: uid! },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              name: true,
              code: true,
              note: true,
              _count: { select: { items: true } },
            },
          })
        ).map((w) => ({
          id: w.id,
          name: w.name,
          code: w.code,
          note: w.note,
          itemCount: w._count.items,
        })),
      []
    ),
  ]);
  return <StorageClient initial={items} warehouses={warehouses} />;
}
