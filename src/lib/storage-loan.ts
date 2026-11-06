/**
 * 出库 / 借还与预警的共享规则（网页、导出接口、预警大屏共用，纯函数）。
 *
 * 设计取舍：
 *  - 消耗性借出直接扣库存、不产生应还时间，也不进预警；
 *  - 归还类借出不扣库存（账面数量表示「拥有多少」），另算「借出中」与「可用量」，
 *    归还时只需结束流水，不会因为漏点归还把库存数字弄乱；
 *  - 默认 8 小时应还，延期按 4/8/24/48 小时累加，可多次延期。
 */

export const RETURN_WINDOW_HOURS = 8;
export const URGENT_WINDOW_HOURS = 2;
export const EXTENSION_OPTIONS = [4, 8, 24, 48] as const;

export type LoanTypeValue = "CONSUMABLE" | "RETURNABLE";

export type LoanInfo = {
  id: string;
  itemId: string;
  itemName: string;
  warehouseName: string | null;
  type: LoanTypeValue;
  quantity: number;
  borrower: string | null;
  note: string | null;
  lentAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  extensionHours: number;
};

export type LoanState = "overdue" | "urgent" | "normal" | "done";

export const LOAN_TYPE_LABEL: Record<LoanTypeValue, string> = {
  CONSUMABLE: "消耗性借出",
  RETURNABLE: "归还类借出",
};

export function loanRemainingMs(loan: Pick<LoanInfo, "dueAt">, now = Date.now()): number {
  if (!loan.dueAt) return Number.POSITIVE_INFINITY;
  return new Date(loan.dueAt).getTime() - now;
}

export function loanState(
  loan: Pick<LoanInfo, "dueAt" | "returnedAt">,
  now = Date.now()
): LoanState {
  if (loan.returnedAt || !loan.dueAt) return "done";
  const ms = loanRemainingMs(loan, now);
  if (ms <= 0) return "overdue";
  if (ms <= URGENT_WINDOW_HOURS * 3600_000) return "urgent";
  return "normal";
}

/** 大屏 / 列表都要显示的人话倒计时 */
export function formatRemaining(loan: Pick<LoanInfo, "dueAt" | "returnedAt">, now = Date.now()): string {
  if (loan.returnedAt) return "已归还";
  if (!loan.dueAt) return "无需归还";
  const ms = loanRemainingMs(loan, now);
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  const tail = h > 0 ? `${h} 小时 ${m} 分` : `${m} 分`;
  return ms <= 0 ? `已超期 ${tail}` : `还剩 ${tail}`;
}

/** 统一按北京时间（UTC+8）显示，避免网页 / 服务端时区不一致 */
export function formatBeijing(value: string | Date | null | undefined): string {
  if (!value) return "";
  const t = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(t.getTime())) return "";
  const b = new Date(t.getTime() + 8 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${b.getUTCFullYear()}-${p(b.getUTCMonth() + 1)}-${p(b.getUTCDate())} ${p(b.getUTCHours())}:${p(b.getUTCMinutes())}`;
}

/** 某物品当前尚未归还的数量，用于「可用量」与出库时库存校验 */
export function loanedQuantity(loans: Pick<LoanInfo, "itemId" | "type" | "returnedAt" | "quantity">[], itemId: string): number {
  return loans
    .filter((l) => l.itemId === itemId && l.type === "RETURNABLE" && !l.returnedAt)
    .reduce((sum, l) => sum + l.quantity, 0);
}
