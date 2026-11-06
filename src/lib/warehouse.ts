/**
 * 仓库二维码的编解码规则（服务端 actions 与客户端页面共用，纯函数）。
 *
 * 二维码里放的是「固定前缀 + 随机令牌」，不是数据库 id：
 *   - 前缀用来和商品条码区分开，扫码时一眼就知道这是仓库还是物品；
 *   - 令牌可单独重新生成，二维码泄露或换贴纸时不用改物品归属；
 *   - 令牌本身不可猜，且服务端查库时一律带 userId 约束。
 */

export const WAREHOUSE_QR_PREFIX = "XBGJ-WH:";
/** 物品档案二维码：与仓库码前缀不同，扫码时能立刻区分该走入库还是出库 */
export const ITEM_QR_PREFIX = "XBGJ-IT:";

/** 传给仓储页面的仓库摘要（不含 createdAt / userId，避免序列化无关字段） */
export type WarehouseInfo = {
  id: string;
  name: string;
  code: string;
  note: string | null;
  itemCount: number;
};

/** 生成仓库二维码里要编码的文本 */
export function warehouseQrValue(code: string): string {
  return WAREHOUSE_QR_PREFIX + code;
}

/**
 * 从扫码文本里取出仓库令牌。兼容扫码结果被 URL 或说明文字包裹的情况。
 * 返回 null 表示这不是仓库码（多半是商品条码 / 商品二维码）。
 */
export function parseWarehouseCode(text: unknown): string | null {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const at = raw.toUpperCase().indexOf(WAREHOUSE_QR_PREFIX.toUpperCase());
  if (at < 0) return null;
  const token = raw
    .slice(at + WAREHOUSE_QR_PREFIX.length)
    .trim()
    .split(/[\s?#&]/)[0];
  return /^[A-Za-z0-9_-]{6,64}$/.test(token) ? token : null;
}

/** 判断一段扫码文本是否明确是仓库码（用于入库第二阶段切换仓库） */
export function isWarehouseQr(text: unknown): boolean {
  return parseWarehouseCode(text) !== null;
}

/** 物品档案二维码内容 */
export function itemQrValue(code: string): string {
  return ITEM_QR_PREFIX + code;
}

/** 从扫码文本里取出物品令牌；不是物品码时返回 null（可能是普通商品条码） */
export function parseItemCode(text: unknown): string | null {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const at = raw.toUpperCase().indexOf(ITEM_QR_PREFIX.toUpperCase());
  if (at < 0) return null;
  const token = raw
    .slice(at + ITEM_QR_PREFIX.length)
    .trim()
    .split(/[\s?#&]/)[0];
  return /^[A-Za-z0-9_-]{6,64}$/.test(token) ? token : null;
}

export function isItemQr(text: unknown): boolean {
  return parseItemCode(text) !== null;
}
