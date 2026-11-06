import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * 物品档案码是后加的字段，且刻意允许为 NULL：生产库里已有的旧物品
 * 不能被「加一个非空唯一列」的迁移卡住。这里在页面首次读取时惰性补齐，
 * 带 code: null 条件更新，多个设备同时打开也不会互相覆盖。
 */
export async function ensureItemCodes(userId: string): Promise<number> {
  const missing = await prisma.storageItem.findMany({
    where: { userId, code: null },
    select: { id: true },
  });
  let done = 0;
  for (const it of missing) {
    const code = randomBytes(9).toString("base64url");
    const r = await prisma.storageItem.updateMany({
      where: { id: it.id, userId, code: null },
      data: { code },
    });
    done += r.count;
  }
  return done;
}
