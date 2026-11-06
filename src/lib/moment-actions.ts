"use server";
import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 所有写操作都强制登录，且用 where: { id, userId } 限制只能改自己的数据 */
async function uid(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("请先登录");
  return id;
}

/** 只接受 https 外链，最多 9 张，挡掉 javascript: / data: 等协议 */
function cleanImages(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length <= 2000 && /^https:\/\//i.test(s))
    .slice(0, 9);
}

/** 判断一条动态对当前账号是否可见（公开，或本人私密） */
async function visibleMoment(momentId: string, userId: string) {
  return prisma.moment.findFirst({
    where: { id: momentId, OR: [{ visibility: "PUBLIC" }, { userId }] },
    select: { id: true },
  });
}

function refresh() {
  revalidatePath("/moments");
  revalidatePath("/explore");
}

export async function createMoment(input: {
  content: string;
  images: string[];
  visibility: "PUBLIC" | "PRIVATE";
}) {
  const userId = await uid();
  const content = String(input.content ?? "").trim().slice(0, 2000);
  if (!content) throw new Error("说点什么再发布吧");
  await prisma.moment.create({
    data: {
      userId,
      content,
      images: cleanImages(input.images),
      visibility: input.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    },
  });
  refresh();
}

export async function deleteMoment(id: string) {
  const userId = await uid();
  await prisma.moment.deleteMany({ where: { id, userId } });
  refresh();
}

export async function toggleMomentLike(momentId: string) {
  const userId = await uid();
  const moment = await visibleMoment(momentId, userId);
  if (!moment) throw new Error("动态不存在或不可见");

  const existing = await prisma.momentLike.findUnique({
    where: { momentId_userId: { momentId, userId } },
  });
  if (existing) {
    await prisma.momentLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.momentLike.create({ data: { momentId, userId } });
  }
  revalidatePath("/moments");
}

export async function addMomentComment(momentId: string, content: string) {
  const userId = await uid();
  const text = String(content ?? "").trim().slice(0, 500);
  if (!text) throw new Error("评论不能为空");
  const moment = await visibleMoment(momentId, userId);
  if (!moment) throw new Error("动态不存在或不可见");

  await prisma.momentComment.create({
    data: { momentId, userId, content: text },
  });
  revalidatePath("/moments");
}

export async function deleteMomentComment(id: string) {
  const userId = await uid();
  await prisma.momentComment.deleteMany({ where: { id, userId } });
  revalidatePath("/moments");
}

/** 老账号注册时可能没填昵称，这里补一个入口；禁止把邮箱当昵称公开 */
export async function updateMyName(name: string) {
  const userId = await uid();
  const n = String(name ?? "").trim().slice(0, 24);
  if (!n || n.includes("@")) throw new Error("昵称不能为空，也不要包含邮箱");
  await prisma.user.update({ where: { id: userId }, data: { name: n } });
  refresh();
}
