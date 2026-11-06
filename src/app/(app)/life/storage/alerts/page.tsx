import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { AlertsBoard } from "@/components/life/AlertsBoard";
import type { LoanInfo } from "@/lib/storage-loan";

export const dynamic = "force-dynamic";

/** 预警大屏：只查当前账号「未归还的归还类借出」，不做任何公开出口 */
export default async function AlertsPage() {
  const uid = await getUserId();
  let loans: LoanInfo[] = [];
  if (uid) {
    try {
      const list = await prisma.stockLoan.findMany({
        where: { userId: uid, type: "RETURNABLE", returnedAt: null },
        orderBy: { dueAt: "asc" },
        take: 100,
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
      });
      loans = list.map((l) => ({
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
      }));
    } catch {
      loans = [];
    }
  }
  return <AlertsBoard loans={loans} />;
}
