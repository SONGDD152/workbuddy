import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { streamReport, type ReportKind } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const uid = await getUserId();
  if (!uid) return new Response("unauthorized", { status: 401 });

  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") || "book") as ReportKind;
  const id = url.searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });

  try {
    let title = "";
    let notes: string[] = [];
    let related: string[] = [];

    if (kind === "book") {
      const book = await prisma.book.findFirst({ where: { id, userId: uid } });
      if (!book) return new Response("not found", { status: 404 });
      title = book.title;
      const ns = await prisma.bookNote.findMany({ where: { bookId: id }, orderBy: { createdAt: "asc" } });
      notes = ns.map((n) => n.content);
      const others = await prisma.book.findMany({ where: { userId: uid, NOT: { id } }, take: 10 });
      related = others.map((b) => b.title);
    } else if (kind === "movie") {
      const m = await prisma.movie.findFirst({ where: { id, userId: uid } });
      if (!m) return new Response("not found", { status: 404 });
      title = m.title;
      const ns = await prisma.movieNote.findMany({ where: { movieId: id }, orderBy: { createdAt: "asc" } });
      notes = ns.map((n) => n.content);
      const others = await prisma.movie.findMany({ where: { userId: uid, NOT: { id } }, take: 10 });
      related = others.map((b) => b.title);
    } else {
      const s = await prisma.study.findFirst({ where: { id, userId: uid } });
      if (!s) return new Response("not found", { status: 404 });
      title = s.topic;
      const ns = await prisma.studyNote.findMany({ where: { studyId: id }, orderBy: { createdAt: "asc" } });
      notes = ns.map((n) => n.content);
      const others = await prisma.study.findMany({ where: { userId: uid, NOT: { id } }, take: 10 });
      related = others.map((b) => b.topic);
    }

    if (notes.length === 0)
      return new Response("# 暂无笔记\n\n请先在碎片记录中添加内容，再生成报告。", {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });

    const stream = await streamReport({ kind, title, notes, related });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e: any) {
    return new Response("error: " + e.message, { status: 500 });
  }
}
