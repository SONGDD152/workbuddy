import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { ensureItemCodes } from "@/lib/storage-codes";
import { LabelsClient } from "@/components/life/LabelsClient";

export const dynamic = "force-dynamic";

/** 打印页只取标签需要的字段，不把位置 / 备注 / 条码明文带进前端 */
export default async function LabelsPage() {
  const uid = await getUserId();
  if (!uid) return null; // (app)/layout 已做登录跳转
  await ensureItemCodes(uid);
  const [items, warehouses] = await Promise.all([
    prisma.storageItem.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, category: true, code: true, warehouseId: true },
    }),
    prisma.warehouse.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);
  return <LabelsClient items={items} warehouses={warehouses} />;
}
