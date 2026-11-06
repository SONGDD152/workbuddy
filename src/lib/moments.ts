import "server-only";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

/**
 * 朋友圈数据读取。
 * 隐私约定：
 *  - 未登录只能看到 visibility=PUBLIC 的动态
 *  - 登录后可额外看到自己发布的 PRIVATE 动态，别人的私密动态永远查不到
 *  - 不向客户端传 email / passwordHash / userId，只传计算好的 mine / liked 布尔值
 *  - 查询整体容错，表未建好时返回空列表而不是让公开页 500
 */

export type MomentCommentView = {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  mine: boolean;
};

export type MomentView = {
  id: string;
  content: string;
  images: string[];
  visibility: "PUBLIC" | "PRIVATE";
  createdAt: string;
  author: string;
  mine: boolean;
  likeCount: number;
  liked: boolean;
  comments: MomentCommentView[];
};

export type MomentsPayload = {
  items: MomentView[];
  loggedIn: boolean;
  myName: string;
  /** true 表示数据库查询失败（通常是表还没同步），用于提示而不是伪装成空状态 */
  unavailable: boolean;
};

const PUBLIC = "PUBLIC" as const;
const PAGE_SIZE = 30;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function displayName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n || n.includes("@")) return "匿名用户";
  return n.slice(0, 24);
}

/** 只接受 https 图片外链，挡掉 javascript: / data: 等 */
function safeImageUrl(u: string): string {
  return /^https:\/\//i.test(u.trim()) ? u.trim() : "";
}

export async function getMoments(): Promise<MomentsPayload> {
  const uid = await getUserId();

  const rows = await safe(
    () =>
      prisma.moment.findMany({
        where: uid
          ? { OR: [{ visibility: PUBLIC }, { userId: uid }] }
          : { visibility: PUBLIC },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        select: {
          id: true,
          userId: true,
          content: true,
          images: true,
          visibility: true,
          createdAt: true,
          user: { select: { name: true } },
          likes: { select: { userId: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              userId: true,
              content: true,
              createdAt: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
    []
  );

  // findMany 失败时 rows 为 []; 用一次额外的轻量探测区分「空」与「表不存在」
  const unavailable =
    rows.length === 0 &&
    !(await safe(async () => {
      await prisma.moment.count();
      return true;
    }, false));

  const me = uid
    ? await safe(
        () => prisma.user.findUnique({ where: { id: uid }, select: { name: true } }),
        null
      )
    : null;

  const items: MomentView[] = rows.map((m) => ({
    id: m.id,
    content: m.content,
    images: (m.images ?? []).map(safeImageUrl).filter(Boolean),
    visibility: m.visibility as "PUBLIC" | "PRIVATE",
    createdAt: m.createdAt.toISOString(),
    author: displayName(m.user?.name),
    mine: !!uid && m.userId === uid,
    likeCount: m.likes.length,
    liked: !!uid && m.likes.some((l) => l.userId === uid),
    comments: m.comments.map((c) => ({
      id: c.id,
      content: c.content,
      author: displayName(c.user?.name),
      createdAt: c.createdAt.toISOString(),
      mine: !!uid && c.userId === uid,
    })),
  }));

  return {
    items,
    loggedIn: !!uid,
    myName: me?.name ?? "",
    unavailable,
  };
}
