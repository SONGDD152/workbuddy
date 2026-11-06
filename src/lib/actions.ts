"use server";
import { randomBytes } from "node:crypto";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseWarehouseCode, parseItemCode } from "@/lib/warehouse";
import { RETURN_WINDOW_HOURS, EXTENSION_OPTIONS } from "@/lib/storage-loan";

async function uid(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("未登录");
  return id;
}

// ===== 旅行 =====
export async function createTravel(input: any) {
  const userId = await uid();
  return prisma.travel.create({
    data: {
      userId,
      title: input.title,
      date: new Date(input.date),
      location: input.location || null,
      description: input.description || null,
      review: input.review || null,
      images: input.images || [],
      visibility: input.visibility || "PRIVATE",
    },
  });
}
export async function updateTravel(id: string, patch: any) {
  const userId = await uid();
  return prisma.travel.updateMany({
    where: { id, userId },
    data: {
      title: patch.title,
      date: patch.date ? new Date(patch.date) : undefined,
      location: patch.location,
      description: patch.description,
      review: patch.review,
      images: patch.images,
      visibility: patch.visibility,
    },
  });
}
export async function deleteTravel(id: string) {
  const userId = await uid();
  return prisma.travel.deleteMany({ where: { id, userId } });
}

// ===== 衣橱 =====
export async function createClothing(input: any) {
  const userId = await uid();
  return prisma.clothing.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      seasons: input.seasons || [],
      occasions: input.occasions || [],
      color: input.color || null,
      image: input.image || null,
    },
  });
}
export async function updateClothing(id: string, patch: any) {
  const userId = await uid();
  return prisma.clothing.updateMany({
    where: { id, userId },
    data: {
      name: patch.name,
      type: patch.type,
      seasons: patch.seasons,
      occasions: patch.occasions,
      color: patch.color,
      image: patch.image,
    },
  });
}
export async function deleteClothing(id: string) {
  const userId = await uid();
  return prisma.clothing.deleteMany({ where: { id, userId } });
}
export async function addOutfitFeedback(comboKey: string, adopted: boolean) {
  const userId = await uid();
  return prisma.outfitFeedback.create({ data: { userId, comboKey, adopted } });
}

// ===== 家庭仓储 · 仓库 =====
// 所有仓库操作都带 userId 约束；code 是二维码里编码的随机令牌，绝不暴露数据库 id。

/** 校验表单传来的仓库 id 确实属于当前账号，防止跨账号关联 */
async function ownedWarehouseId(userId: string, raw: any): Promise<string | null> {
  const id = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  if (!id) return null;
  const wh = await prisma.warehouse.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  return wh?.id ?? null;
}

function safeQuantity(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(9999, Math.floor(n)));
}

function newWarehouseCode(): string {
  return randomBytes(9).toString("base64url"); // 12 字符，二维码短、好扫
}

/** 物品档案码与仓库码同规格，但前缀不同，扫码时不会混淆 */
function newItemCode(): string {
  return randomBytes(9).toString("base64url");
}

export async function createWarehouse(input: any) {
  const userId = await uid();
  const name = String(input?.name ?? "").trim().slice(0, 40);
  if (!name) throw new Error("请填写仓库名称");
  const note = String(input?.note ?? "").trim().slice(0, 120) || null;
  const wh = await prisma.warehouse.create({
    data: { userId, name, note, code: newWarehouseCode() },
    select: { id: true, name: true, code: true, note: true },
  });
  return wh;
}

export async function renameWarehouse(id: string, patch: any) {
  const userId = await uid();
  const name = String(patch?.name ?? "").trim().slice(0, 40);
  if (!name) throw new Error("请填写仓库名称");
  const note = String(patch?.note ?? "").trim().slice(0, 120) || null;
  return prisma.warehouse.updateMany({ where: { id, userId }, data: { name, note } });
}

/** 二维码泄露 / 换贴纸时换一个令牌；已入库物品的归属不受影响 */
export async function regenerateWarehouseCode(id: string) {
  const userId = await uid();
  const code = newWarehouseCode();
  const r = await prisma.warehouse.updateMany({ where: { id, userId }, data: { code } });
  if (r.count === 0) throw new Error("仓库不存在");
  return { code };
}

/** 删仓库只解绑物品，绝不连带删掉里面的东西 */
export async function deleteWarehouse(id: string) {
  const userId = await uid();
  const wh = await prisma.warehouse.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!wh) throw new Error("仓库不存在");
  return prisma.$transaction([
    prisma.storageItem.updateMany({
      where: { userId, warehouseId: id },
      data: { warehouseId: null },
    }),
    prisma.warehouse.deleteMany({ where: { id, userId } }),
  ]);
}

/** 扫码第一段：校验这确实是该账号的仓库码 */
export async function resolveWarehouse(raw: string) {
  const userId = await uid();
  const code = parseWarehouseCode(raw);
  if (!code) return null;
  return prisma.warehouse.findFirst({
    where: { userId, code },
    select: { id: true, name: true, code: true },
  });
}

/** 扫码第二段：物品条码 → 自动入库（新记录或同仓库同条码数量 +1） */
export async function autoStoreItem(warehouseQr: string, itemCode: string) {
  const userId = await uid();
  const code = parseWarehouseCode(warehouseQr);
  if (!code) throw new Error("请先扫仓库二维码");
  const wh = await prisma.warehouse.findFirst({
    where: { userId, code },
    select: { id: true, name: true },
  });
  if (!wh) throw new Error("找不到这个仓库，或它不属于当前账号");

  const barcode = String(itemCode ?? "").trim().slice(0, 200);
  if (!barcode) throw new Error("物品码为空");
  if (parseWarehouseCode(barcode)) throw new Error("扫到的是仓库码，请扫物品上的条码");

  // 扫的是自己打印的物品档案码：把这件物品归到当前仓库并数量 +1，
  // 而不是把「XBGJ-IT:...」当成商品条码新建一条占位记录。
  const itemToken = parseItemCode(barcode);
  if (itemToken) {
    const item = await prisma.storageItem.findFirst({
      where: { userId, code: itemToken },
      select: { id: true, name: true, quantity: true, warehouseId: true },
    });
    if (!item) throw new Error("这张物品码不属于当前账号，请先在物品档案里建档");
    const updated = await prisma.storageItem.update({
      where: { id: item.id },
      data: { warehouseId: wh.id, quantity: { increment: 1 } },
      select: { id: true, name: true, quantity: true },
    });
    return {
      mode: (item.warehouseId === wh.id ? "increment" : "restock") as "increment" | "restock",
      warehouse: wh.name,
      itemId: updated.id,
      name: updated.name,
      barcode,
      quantity: updated.quantity,
    };
  }

  const existing = await prisma.storageItem.findFirst({
    where: { userId, barcode, warehouseId: wh.id },
    select: { id: true, name: true, quantity: true },
  });
  if (existing) {
    const updated = await prisma.storageItem.update({
      where: { id: existing.id },
      data: { quantity: { increment: 1 } },
      select: { id: true, name: true, quantity: true },
    });
    return {
      mode: "increment" as const,
      warehouse: wh.name,
      itemId: updated.id,
      name: updated.name,
      barcode,
      quantity: updated.quantity,
    };
  }

  const created = await prisma.storageItem.create({
    data: {
      userId,
      name: `未命名物品 · ${barcode.slice(-6)}`,
      category: "DAILY",
      room: wh.name,
      position: null,
      barcode,
      warehouseId: wh.id,
      quantity: 1,
      visibility: "PRIVATE",
      code: newItemCode(),
    },
    select: { id: true, name: true, quantity: true },
  });
  return {
    mode: "created" as const,
    warehouse: wh.name,
    itemId: created.id,
    name: created.name,
    barcode,
    quantity: created.quantity,
  };
}

// ===== 家庭仓储 · 物品 =====
export async function createStorageItem(input: any) {
  const userId = await uid();
  const warehouseId = await ownedWarehouseId(userId, input.warehouseId);
  return prisma.storageItem.create({
    data: {
      userId,
      name: input.name,
      category: input.category,
      room: input.room || null,
      position: input.position || null,
      barcode: input.barcode || null,
      warehouseId,
      quantity: safeQuantity(input.quantity),
      image: input.image || null,
      note: input.note || null,
      visibility: input.visibility || "PRIVATE",
      code: newItemCode(),
    },
  });
}
export async function updateStorageItem(id: string, patch: any) {
  const userId = await uid();
  // 编辑表单一定会传 warehouseId（可为空串 = 移出仓库）；undefined 表示不改
  const warehouseId =
    patch.warehouseId === undefined
      ? undefined
      : await ownedWarehouseId(userId, patch.warehouseId);
  return prisma.storageItem.updateMany({
    where: { id, userId },
    data: {
      name: patch.name,
      category: patch.category,
      room: patch.room,
      position: patch.position,
      barcode: patch.barcode,
      warehouseId,
      quantity: patch.quantity === undefined ? undefined : safeQuantity(patch.quantity),
      image: patch.image,
      note: patch.note,
      visibility: patch.visibility,
    },
  });
}
export async function deleteStorageItem(id: string) {
  const userId = await uid();
  return prisma.storageItem.deleteMany({ where: { id, userId } });
}

// ===== 家庭仓储 · 物品档案码 =====

/**
 * 旧数据在建码功能上线前没有 code，首次点「二维码」时补一枚。
 * updateMany 带 code: null 条件，避免两个设备同时补码互相覆盖。
 */
export async function ensureItemCode(itemId: string) {
  const userId = await uid();
  const item = await prisma.storageItem.findFirst({
    where: { id: itemId, userId },
    select: { code: true },
  });
  if (!item) throw new Error("物品不存在");
  if (item.code) return { code: item.code };
  const code = newItemCode();
  const r = await prisma.storageItem.updateMany({
    where: { id: itemId, userId, code: null },
    data: { code },
  });
  if (r.count > 0) return { code };
  const again = await prisma.storageItem.findFirst({
    where: { id: itemId, userId },
    select: { code: true },
  });
  return { code: again?.code || "" };
}

/** 贴纸丢了 / 码泄露时换一枚；旧贴纸立即失效，物品本身不受影响 */
export async function regenerateItemCode(itemId: string) {
  const userId = await uid();
  const code = newItemCode();
  const r = await prisma.storageItem.updateMany({
    where: { id: itemId, userId },
    data: { code },
  });
  if (r.count === 0) throw new Error("物品不存在");
  return { code };
}

/** 出库扫码：物品档案码或商品条码都能定位到自己的物品 */
export async function resolveItemByScan(text: string) {
  const userId = await uid();
  const raw = String(text ?? "").trim();
  if (!raw) throw new Error("扫码内容为空");
  if (parseWarehouseCode(raw)) throw new Error("扫到的是仓库二维码，出库请扫物品码或商品条码");
  const token = parseItemCode(raw);
  const item = await prisma.storageItem.findFirst({
    where: token ? { userId, code: token } : { userId, barcode: raw },
    select: { id: true, name: true, quantity: true, barcode: true, code: true, warehouseId: true },
  });
  if (!item) {
    throw new Error(token ? "这张物品码不属于当前账号" : `没有条码为 ${raw} 的物品，可在下拉框里手动选`);
  }
  return item;
}

// ===== 家庭仓储 · 出库 / 借还 =====

/**
 * 消耗性借出：直接扣库存，不产生应还时间；
 * 归还类借出：不扣库存，8 小时后应还，超期进预警大屏。
 * 校验与写流水放在同一事务里，避免同时点两次把同一件东西借超。
 */
export async function createLoan(input: any) {
  const userId = await uid();
  const itemId = String(input?.itemId ?? "").trim();
  if (!itemId) throw new Error("请先选择或扫描物品");
  const type: "CONSUMABLE" | "RETURNABLE" =
    input?.type === "CONSUMABLE" ? "CONSUMABLE" : "RETURNABLE";
  const quantity = safeQuantity(input?.quantity);
  const borrower = String(input?.borrower ?? "").trim().slice(0, 40) || null;
  const note = String(input?.note ?? "").trim().slice(0, 200) || null;

  return prisma.$transaction(async (tx) => {
    const item = await tx.storageItem.findFirst({
      where: { id: itemId, userId },
      select: { id: true, name: true, quantity: true, warehouseId: true },
    });
    if (!item) throw new Error("物品不存在或不属于当前账号");

    if (type === "CONSUMABLE") {
      const dec = await tx.storageItem.updateMany({
        where: { id: itemId, userId, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (dec.count === 0) throw new Error("库存不足，不能出库这么多件");
    } else {
      const active = await tx.stockLoan.aggregate({
        where: { userId, itemId, type: "RETURNABLE", returnedAt: null },
        _sum: { quantity: true },
      });
      const loaned = active._sum.quantity ?? 0;
      if (item.quantity - loaned < quantity) {
        throw new Error(`可用量不足：共 ${item.quantity} 件，已借出 ${loaned} 件`);
      }
    }

    const wh = item.warehouseId
      ? await tx.warehouse.findFirst({
          where: { id: item.warehouseId, userId },
          select: { name: true },
        })
      : null;
    const lentAt = new Date();
    const dueAt = type === "RETURNABLE"
      ? new Date(lentAt.getTime() + RETURN_WINDOW_HOURS * 3600_000)
      : null;
    const loan = await tx.stockLoan.create({
      data: {
        userId, itemId, type, quantity, borrower, note, lentAt, dueAt,
        warehouseName: wh?.name ?? null,
        extensionHours: 0,
      },
      select: { id: true, dueAt: true },
    });
    return {
      id: loan.id,
      itemName: item.name,
      type,
      dueAt: dueAt?.toISOString() ?? null,
    };
  });
}

/** 归还：只关闭流水，不改库存（归还类出库本来就没扣） */
export async function returnLoan(id: string) {
  const userId = await uid();
  const r = await prisma.stockLoan.updateMany({
    where: { id, userId, type: "RETURNABLE", returnedAt: null },
    data: { returnedAt: new Date() },
  });
  if (r.count === 0) throw new Error("这条借出记录不存在或已经归还");
  return { ok: true };
}

/** 延期 4 / 8 / 24 / 48 小时；已超期时从「现在」顺延，避免延完还显示超期 */
export async function extendLoan(id: string, hoursRaw: number) {
  const userId = await uid();
  const hours = Number(hoursRaw);
  if (!(EXTENSION_OPTIONS as readonly number[]).includes(hours)) {
    throw new Error("延期时长只能是 4 / 8 / 24 / 48 小时");
  }
  return prisma.$transaction(async (tx) => {
    const loan = await tx.stockLoan.findFirst({
      where: { id, userId, type: "RETURNABLE", returnedAt: null },
      select: { id: true, dueAt: true, extensionHours: true },
    });
    if (!loan || !loan.dueAt) throw new Error("这条借出记录不存在或已归还");
    const base = Math.max(loan.dueAt.getTime(), Date.now());
    const dueAt = new Date(base + hours * 3600_000);
    await tx.stockLoan.update({
      where: { id: loan.id },
      data: { dueAt, extensionHours: { increment: hours } },
    });
    return { dueAt: dueAt.toISOString(), extensionHours: loan.extensionHours + hours };
  });
}

// ===== 餐饮 =====
export async function createFoodRecord(input: any) {
  const userId = await uid();
  return prisma.foodRecord.create({
    data: {
      userId,
      meal: input.meal,
      name: input.name,
      note: input.note || null,
      calories: input.calories ?? null,
      image: input.image || null,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
    },
  });
}
export async function deleteFoodRecord(id: string) {
  const userId = await uid();
  return prisma.foodRecord.deleteMany({ where: { id, userId } });
}

// ===== 兴趣爱好 =====
export async function createHobby(input: any) {
  const userId = await uid();
  return prisma.hobby.create({
    data: { userId, name: input.name, visibility: input.visibility || "PRIVATE" },
  });
}
export async function updateHobby(id: string, patch: any) {
  const userId = await uid();
  return prisma.hobby.updateMany({
    where: { id, userId },
    data: { name: patch.name, visibility: patch.visibility },
  });
}
export async function deleteHobby(id: string) {
  const userId = await uid();
  return prisma.hobby.deleteMany({ where: { id, userId } });
}
export async function createHobbyEntry(input: any) {
  const userId = await uid();
  const hobby = await prisma.hobby.findFirst({ where: { id: input.hobbyId, userId } });
  if (!hobby) throw new Error("领域不存在");
  return prisma.hobbyEntry.create({
    data: {
      hobbyId: input.hobbyId,
      content: input.content,
      status: input.status || "ONGOING",
      image: input.image || null,
    },
  });
}
export async function deleteHobbyEntry(id: string) {
  const userId = await uid();
  return prisma.hobbyEntry.deleteMany({
    where: { id, hobby: { userId } },
  });
}

// ===== 园艺 =====
export async function createVegetable(input: any) {
  const userId = await uid();
  return prisma.vegetable.create({
    data: {
      userId,
      name: input.name,
      growDays: input.growDays,
      suitableTerm: input.suitableTerm || null,
      tag: input.tag || null,
      isCustom: true,
    },
  });
}
export async function createGardenPlant(input: any) {
  const userId = await uid();
  const seed = input.seedDate ? new Date(input.seedDate) : new Date();
  const est = new Date(seed);
  est.setDate(est.getDate() + (input.growDays ?? 60));
  return prisma.gardenPlant.create({
    data: {
      userId,
      vegetable: input.vegetable,
      seedDate: seed,
      method: input.method || null,
      location: input.location || null,
      status: input.status || "GROWING",
      note: input.note || null,
      estHarvest: input.estHarvest ? new Date(input.estHarvest) : est,
    },
  });
}
export async function updateGardenPlant(id: string, patch: any) {
  const userId = await uid();
  return prisma.gardenPlant.updateMany({
    where: { id, userId },
    data: {
      vegetable: patch.vegetable,
      method: patch.method,
      location: patch.location,
      status: patch.status,
      note: patch.note,
      estHarvest: patch.estHarvest ? new Date(patch.estHarvest) : undefined,
    },
  });
}
export async function deleteGardenPlant(id: string) {
  const userId = await uid();
  return prisma.gardenPlant.deleteMany({ where: { id, userId } });
}

// ===== 公开范围：统一的可见性切换（带 userId 约束，只能改自己的记录） =====
export async function setContentVisibility(
  kind: string,
  id: string,
  visibility: "PUBLIC" | "PRIVATE"
) {
  const userId = await uid();
  const v = visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE";
  switch (kind) {
    case "travel":
      return prisma.travel.updateMany({ where: { id, userId }, data: { visibility: v } });
    case "storage":
      return prisma.storageItem.updateMany({ where: { id, userId }, data: { visibility: v } });
    case "hobby":
      return prisma.hobby.updateMany({ where: { id, userId }, data: { visibility: v } });
    case "book":
      return prisma.book.updateMany({ where: { id, userId }, data: { visibility: v } });
    case "movie":
      return prisma.movie.updateMany({ where: { id, userId }, data: { visibility: v } });
    case "study":
      return prisma.study.updateMany({ where: { id, userId }, data: { visibility: v } });
    default:
      throw new Error("不支持的内容类型");
  }
}

// ===== 读书 =====
export async function createBook(input: any) {
  const userId = await uid();
  return prisma.book.create({
    data: { userId, title: input.title, author: input.author || null, type: input.type || null, visibility: input.visibility || "PRIVATE" },
  });
}
export async function updateBook(id: string, patch: any) {
  const userId = await uid();
  return prisma.book.updateMany({ where: { id, userId }, data: { title: patch.title, author: patch.author, type: patch.type, visibility: patch.visibility } });
}
export async function deleteBook(id: string) {
  const userId = await uid();
  return prisma.book.deleteMany({ where: { id, userId } });
}
export async function addBookNote(input: any) {
  const userId = await uid();
  const book = await prisma.book.findFirst({ where: { id: input.bookId, userId } });
  if (!book) throw new Error("书籍不存在");
  return prisma.bookNote.create({ data: { bookId: input.bookId, content: input.content } });
}
export async function deleteBookNote(id: string) {
  const userId = await uid();
  return prisma.bookNote.deleteMany({ where: { id, book: { userId } } });
}
export async function saveBookReport(input: any) {
  const userId = await uid();
  const book = await prisma.book.findFirst({ where: { id: input.bookId, userId } });
  if (!book) throw new Error("书籍不存在");
  return prisma.bookReport.upsert({
    where: { bookId: input.bookId },
    create: { bookId: input.bookId, content: input.content, score: input.score ?? null, summary: input.summary ?? null },
    update: { content: input.content, score: input.score ?? null, summary: input.summary ?? null },
  });
}

// ===== 影评 =====
export async function createMovie(input: any) {
  const userId = await uid();
  return prisma.movie.create({ data: { userId, title: input.title, genre: input.genre || null, visibility: input.visibility || "PRIVATE" } });
}
export async function updateMovie(id: string, patch: any) {
  const userId = await uid();
  return prisma.movie.updateMany({ where: { id, userId }, data: { title: patch.title, genre: patch.genre, visibility: patch.visibility } });
}
export async function deleteMovie(id: string) {
  const userId = await uid();
  return prisma.movie.deleteMany({ where: { id, userId } });
}
export async function addMovieNote(input: any) {
  const userId = await uid();
  const m = await prisma.movie.findFirst({ where: { id: input.movieId, userId } });
  if (!m) throw new Error("影片不存在");
  return prisma.movieNote.create({ data: { movieId: input.movieId, content: input.content } });
}
export async function deleteMovieNote(id: string) {
  const userId = await uid();
  return prisma.movieNote.deleteMany({ where: { id, movie: { userId } } });
}
export async function saveMovieReport(input: any) {
  const userId = await uid();
  const m = await prisma.movie.findFirst({ where: { id: input.movieId, userId } });
  if (!m) throw new Error("影片不存在");
  return prisma.movieReport.upsert({
    where: { movieId: input.movieId },
    create: { movieId: input.movieId, content: input.content, score: input.score ?? null, summary: input.summary ?? null },
    update: { content: input.content, score: input.score ?? null, summary: input.summary ?? null },
  });
}

// ===== 专业学习 =====
export async function createStudy(input: any) {
  const userId = await uid();
  return prisma.study.create({ data: { userId, topic: input.topic, status: input.status || "ONGOING", visibility: input.visibility || "PRIVATE" } });
}
export async function updateStudy(id: string, patch: any) {
  const userId = await uid();
  return prisma.study.updateMany({ where: { id, userId }, data: { topic: patch.topic, status: patch.status, visibility: patch.visibility } });
}
export async function deleteStudy(id: string) {
  const userId = await uid();
  return prisma.study.deleteMany({ where: { id, userId } });
}
export async function addStudyNote(input: any) {
  const userId = await uid();
  const s = await prisma.study.findFirst({ where: { id: input.studyId, userId } });
  if (!s) throw new Error("主题不存在");
  return prisma.studyNote.create({ data: { studyId: input.studyId, content: input.content } });
}
export async function deleteStudyNote(id: string) {
  const userId = await uid();
  return prisma.studyNote.deleteMany({ where: { id, study: { userId } } });
}
export async function saveStudyReport(input: any) {
  const userId = await uid();
  const s = await prisma.study.findFirst({ where: { id: input.studyId, userId } });
  if (!s) throw new Error("主题不存在");
  return prisma.studyReport.upsert({
    where: { studyId: input.studyId },
    create: { studyId: input.studyId, content: input.content },
    update: { content: input.content },
  });
}

// ===== 日记 =====
export async function addDiary(content: string) {
  const userId = await uid();
  return prisma.diary.create({ data: { userId, content } });
}
export async function deleteDiary(id: string) {
  const userId = await uid();
  return prisma.diary.deleteMany({ where: { id, userId } });
}
