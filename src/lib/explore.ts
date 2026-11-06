import "server-only";
import { prisma } from "@/lib/db";
import { STORAGE_CATEGORY_LABEL, PROGRESS_LABEL } from "@/lib/constants";

/**
 * ============================================================
 *  公开内容广场 —— 跨账号查询
 * ============================================================
 *  隐私约定（改动前请先读完，别把这几条简化掉）：
 *
 *  1. 只取 visibility === "PUBLIC" 的记录，默认 PRIVATE 的内容永远不出现。
 *  2. 一律用 select 白名单取字段，绝不 select email / passwordHash / userId。
 *  3. 作者只取 user.name，并做脱敏；空值或疑似邮箱一律显示「匿名记录者」。
 *  4. 家庭仓储不公开 room / position / barcode —— 家里东西放在哪儿属于隐私。
 *  5. 不公开笔记、读书/影评/学习报告、日记等正文；只公开条目元数据。
 *  6. 每个模型单独容错，某张表或某列缺失时该类返回空，不让整页 500。
 *  7. 每类最多 24 条，避免数据量变大后拖垮公开页。
 * ============================================================
 */

export const EXPLORE_KINDS = [
  "travel",
  "storage",
  "hobby",
  "book",
  "movie",
  "study",
] as const;

export type ExploreKind = (typeof EXPLORE_KINDS)[number];

export const EXPLORE_KIND_LABEL: Record<ExploreKind, string> = {
  travel: "旅行",
  storage: "收纳",
  hobby: "爱好",
  book: "读书",
  movie: "影音",
  study: "学习",
};

export type PublicItem = {
  id: string;
  kind: ExploreKind;
  title: string;
  subtitle: string | null;
  description: string | null;
  author: string;
  date: string;
};

const PUBLIC = "PUBLIC" as const;
const PER_KIND = 24;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** 作者名脱敏：不展示邮箱、不展示过长的名字 */
function author(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n || n.includes("@")) return "匿名记录者";
  return n.slice(0, 24);
}

/** 统一成 YYYY-MM-DD，避免 SSR 时区差异 */
function day(d: Date | null | undefined): string {
  if (!d) return "";
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString().slice(0, 10);
}

export async function getPublicItems(): Promise<PublicItem[]> {
  const [travels, storages, hobbies, books, movies, studies] = await Promise.all([
    safe(
      () =>
        prisma.travel.findMany({
          where: { visibility: PUBLIC },
          select: {
            id: true,
            title: true,
            location: true,
            description: true,
            date: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_KIND,
        }),
      []
    ),
    safe(
      () =>
        prisma.storageItem.findMany({
          where: { visibility: PUBLIC },
          select: {
            id: true,
            name: true,
            category: true,
            note: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_KIND,
        }),
      []
    ),
    safe(
      () =>
        prisma.hobby.findMany({
          where: { visibility: PUBLIC },
          select: {
            id: true,
            name: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_KIND,
        }),
      []
    ),
    safe(
      () =>
        prisma.book.findMany({
          where: { visibility: PUBLIC },
          select: {
            id: true,
            title: true,
            author: true,
            type: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_KIND,
        }),
      []
    ),
    safe(
      () =>
        prisma.movie.findMany({
          where: { visibility: PUBLIC },
          select: {
            id: true,
            title: true,
            genre: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_KIND,
        }),
      []
    ),
    safe(
      () =>
        prisma.study.findMany({
          where: { visibility: PUBLIC },
          select: {
            id: true,
            topic: true,
            status: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: PER_KIND,
        }),
      []
    ),
  ]);

  const items: PublicItem[] = [];

  for (const t of travels) {
    items.push({
      id: t.id,
      kind: "travel",
      title: t.title,
      subtitle: t.location ?? null,
      description: t.description ?? null,
      author: author(t.user?.name),
      date: day(t.date ?? t.createdAt),
    });
  }

  for (const s of storages) {
    items.push({
      id: s.id,
      kind: "storage",
      title: s.name,
      subtitle: STORAGE_CATEGORY_LABEL[s.category] ?? "其他",
      description: s.note ?? null,
      author: author(s.user?.name),
      date: day(s.createdAt),
    });
  }

  for (const h of hobbies) {
    items.push({
      id: h.id,
      kind: "hobby",
      title: h.name,
      subtitle: null,
      description: null,
      author: author(h.user?.name),
      date: day(h.createdAt),
    });
  }

  for (const b of books) {
    items.push({
      id: b.id,
      kind: "book",
      title: b.title,
      subtitle: b.author ?? null,
      description: b.type ?? null,
      author: author(b.user?.name),
      date: day(b.createdAt),
    });
  }

  for (const m of movies) {
    items.push({
      id: m.id,
      kind: "movie",
      title: m.title,
      subtitle: m.genre ?? null,
      description: null,
      author: author(m.user?.name),
      date: day(m.createdAt),
    });
  }

  for (const s of studies) {
    items.push({
      id: s.id,
      kind: "study",
      title: s.topic,
      subtitle: PROGRESS_LABEL[s.status] ?? null,
      description: null,
      author: author(s.user?.name),
      date: day(s.createdAt),
    });
  }

  return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
