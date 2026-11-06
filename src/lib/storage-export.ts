/**
 * 家庭仓储「导出明细」的单一真源。
 * 网页预览 / 复制到剪贴板 / 服务端 CSV 下载共用这里的字段、筛选和编码规则，
 * 避免「看到的」和「导出的」对不上。此文件不得引入 server-only 依赖。
 */

export const STORAGE_EXPORT_COLUMNS = [
  { key: "name", label: "物品名称" },
  { key: "category", label: "类型" },
  { key: "warehouse", label: "所属仓库" },
  { key: "room", label: "房间 / 区域" },
  { key: "position", label: "存放位置" },
  { key: "quantity", label: "数量" },
  { key: "barcode", label: "条码" },
  { key: "note", label: "备注" },
  { key: "visibility", label: "可见性" },
  { key: "createdAt", label: "登记时间" },
] as const;

export type StorageExportColumnKey = (typeof STORAGE_EXPORT_COLUMNS)[number]["key"];

export type StorageExportRow = Record<StorageExportColumnKey, string | number>;

/**
 * 传的是「页面上看得到的显示值」而非数据库枚举 / id：
 * cat 为品类中文名（如「日用品」），wh 为仓库名（或 __none__）。
 * 网页与服务端都按同一套显示值过滤，导出结果与页面列表严格一致。
 */
export type StorageExportFilter = {
  q?: string;
  cat?: string;
  wh?: string;
};

export const STORAGE_EXPORT_HEADERS = STORAGE_EXPORT_COLUMNS.map((c) => c.label);

/** 与页面上搜索框、品类筛选、仓库筛选完全一致的判断 */
export function matchesStorageExportFilter(
  row: StorageExportRow,
  filter: StorageExportFilter
): boolean {
  const q = (filter.q || "").trim().toLowerCase();
  const hit =
    !q ||
    [row.name, row.category, row.warehouse, row.room, row.position, row.note, row.barcode]
      .filter(Boolean)
      .some((f) => String(f).toLowerCase().includes(q));
  const whHit =
    !filter.wh ||
    (filter.wh === "__none__" ? !row.warehouse : row.warehouse === filter.wh);
  // 服务端用仓库名匹配（导出 URL 只传筛选值，不传内部 id）
  return hit && (!filter.cat || String(row.category) === filter.cat) && whHit;
}

/**
 * CSV 单元格：一律加引号，内部双引号翻倍；
 * 以 = + @ 或制表符 / 回车开头的内容前置单引号，防止 Excel 把文本当公式执行。
 */
function csvCell(value: string | number): string {
  const raw = value == null ? "" : String(value);
  const safe = /^[=+@\t\r]/.test(raw) ? "'" + raw : raw;
  return `"${safe.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

/** 不含 BOM；BOM 由下载接口添加，方便 Excel 直接双击打开不乱码 */
export function buildStorageCsv(rows: StorageExportRow[]): string {
  const line = (cells: (string | number)[]) => cells.map(csvCell).join(",");
  return [line(STORAGE_EXPORT_HEADERS), ...rows.map((r) => line(STORAGE_EXPORT_COLUMNS.map((c) => r[c.key])))]
    .join("\r\n") + "\r\n";
}

/** 复制到剪贴板用制表符分隔，粘进 Excel / WPS 会自动分列 */
export function buildStorageTsv(rows: StorageExportRow[]): string {
  const cell = (v: string | number) => String(v ?? "").replace(/[\t\r\n]/g, " ");
  const line = (cells: (string | number)[]) => cells.map(cell).join("\t");
  return [line(STORAGE_EXPORT_HEADERS), ...rows.map((r) => line(STORAGE_EXPORT_COLUMNS.map((c) => r[c.key])))]
    .join("\n");
}

/** 纯 ASCII 文件名：Android DownloadManager 对中文 filename 解析不稳定 */
export function storageExportFileName(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `xiaobaiguanjia-storage-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.csv`;
}
