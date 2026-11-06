import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STORAGE_CATEGORY_LABEL, VISIBILITY_LABEL } from "@/lib/constants";
import {
  buildStorageCsv,
  matchesStorageExportFilter,
  storageExportFileName,
  type StorageExportRow,
} from "@/lib/storage-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 服务器在 UTC，明细按北京时间（UTC+8）呈现，免得看起来差 8 小时 */
function beijing(d: Date) {
  const t = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())} ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

/**
 * 导出当前登录账号的仓储明细。
 * 只按会话里的 userId 查询，不接受任意 userId / 物品 id，
 * 因此不会把其它账号的数据带出来；未登录直接 401。
 * 查询参数 q / cat / wh 是页面筛选的显示值，与 StorageClient 的筛选同源。
 */
export async function GET(req: Request) {
  const uid = await getUserId();
  if (!uid) {
    return new Response(JSON.stringify({ error: "请先登录后再导出" }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const url = new URL(req.url);
  const filter = {
    q: url.searchParams.get("q") || "",
    cat: url.searchParams.get("cat") || "",
    wh: url.searchParams.get("wh") || "",
  };

  const [records, activeLoans] = await Promise.all([
    prisma.storageItem.findMany({
      where: { userId: uid },
      include: { warehouse: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stockLoan.findMany({
      where: { userId: uid, type: "RETURNABLE", returnedAt: null },
      select: { itemId: true, quantity: true },
    }),
  ]);

  const loanedByItem = new Map<string, number>();
  for (const l of activeLoans) {
    loanedByItem.set(l.itemId, (loanedByItem.get(l.itemId) || 0) + l.quantity);
  }

  const rows: StorageExportRow[] = records.map((it) => {
    const whName = it.warehouse?.name || "";
    const loaned = loanedByItem.get(it.id) || 0;
    return {
      name: it.name,
      category: STORAGE_CATEGORY_LABEL[it.category] || it.category,
      warehouse: whName,
      // 自动入库时房间字段会写成仓库名，导出时避免和「所属仓库」重复
      room: it.room && it.room !== whName ? it.room : "",
      position: it.position || "",
      quantity: it.quantity,
      loaned,
      available: Math.max(0, it.quantity - loaned),
      barcode: it.barcode || "",
      note: it.note || "",
      visibility: VISIBILITY_LABEL[it.visibility] || it.visibility,
      createdAt: beijing(it.createdAt),
    };
  });

  const csv = "\uFEFF" + buildStorageCsv(rows.filter((r) => matchesStorageExportFilter(r, filter)));
  const filename = storageExportFileName();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // 纯 ASCII 文件名，兼容 Android DownloadManager 与旧版浏览器
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
