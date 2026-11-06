import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { ensureItemCodes } from "@/lib/storage-codes";
import { StorageClient } from "@/components/life/StorageClient";
import type { WarehouseInfo } from "@/lib/warehouse";
import type { LoanInfo } from "@/lib/storage-loan";

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
  if (uid) await safe(() => ensureItemCodes(uid), 0);

  const [items, warehouses, loans] = await Promise.all([
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
    safe<LoanInfo[]>(
      async () =>
        (
          await prisma.stockLoan.findMany({
            where: { userId: uid! },
            orderBy: { lentAt: "desc" },
            take: 200,
            select: {
              id: true,
              itemId: true,
              warehouseName: true,
              type: true,
              quantity: true,
              borrower: true,
              note: true,
              lentAt: true,
              dueAt: true,
              returnedAt: true,
              extensionHours: true,
              item: { select: { name: true } },
            },
          })
        ).map((l) => ({
          id: l.id,
          itemId: l.itemId,
          itemName: l.item.name,
          warehouseName: l.warehouseName,
          type: l.type,
          quantity: l.quantity,
          borrower: l.borrower,
          note: l.note,
          lentAt: l.lentAt.toISOString(),
          dueAt: l.dueAt?.toISOString() ?? null,
          returnedAt: l.returnedAt?.toISOString() ?? null,
          extensionHours: l.extensionHours,
        })),
      []
    ),
  ]);
  return <StorageClient initial={items} warehouses={warehouses} loans={loans} />;
}
