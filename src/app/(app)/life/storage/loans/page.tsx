import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { LoanListClient } from "@/components/life/LoanListClient";
import type { LoanInfo } from "@/lib/storage-loan";

export const dynamic = "force-dynamic";

/**
 * 借出清单：拉当前账号全部出库 / 借还流水（不限状态、不限数量），
 * 由前端按「借出中 / 超期 / 已归还 / 消耗性」筛选。只查 userId，不暴露其它账号数据。
 */
export default async function LoanListPage() {
  const uid = await getUserId();
  let loans: LoanInfo[] = [];
  if (uid) {
    try {
      const list = await prisma.stockLoan.findMany({
        where: { userId: uid },
        orderBy: { lentAt: "desc" },
        take: 1000,
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
  return <LoanListClient loans={loans} />;
}
