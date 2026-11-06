"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PackageMinus,
  ScanLine,
  Plus,
  Clock3,
  AlertTriangle,
  Check,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Button, Card, Modal, Input, Badge, EmptyState } from "@/components/ui";
import { Scanner } from "@/components/Scanner";
import { cn } from "@/lib/utils";
import {
  createLoan,
  returnLoan,
  extendLoan,
  resolveItemByScan,
} from "@/lib/actions";
import {
  EXTENSION_OPTIONS,
  RETURN_WINDOW_HOURS,
  formatBeijing,
  formatRemaining,
  loanState,
  loanedQuantity,
  type LoanInfo,
} from "@/lib/storage-loan";

export type LoanPanelItem = {
  id: string;
  name: string;
  quantity: number;
  code: string | null;
  barcode: string | null;
};

type Form = {
  itemId: string;
  type: "CONSUMABLE" | "RETURNABLE";
  quantity: string;
  borrower: string;
  note: string;
};

const EMPTY: Form = {
  itemId: "",
  type: "RETURNABLE",
  quantity: "1",
  borrower: "",
  note: "",
};

/**
 * 出库 / 借还面板。
 *
 * 消耗性借出 = 用完就没了，直接扣库存；
 * 归还类借出 = 东西还在、只是暂时不在库，8 小时应还，超期进预警大屏。
 * 归还类不扣库存，账面数量始终表示「一共拥有多少」，避免漏点归还把数字弄乱；
 * 可用量 = 拥有量 - 借出中，导出明细里也是这个口径。
 */
export function StockLoanPanel({
  items,
  loans,
  open,
  setOpen,
  show,
}: {
  items: LoanPanelItem[];
  loans: LoanInfo[];
  open: boolean;
  setOpen: (v: boolean) => void;
  show: (text: string, tone?: "ok" | "warn") => void;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<Form>({ ...EMPTY });
  const [saving, setSaving] = React.useState(false);
  const [scan, setScan] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [extendFor, setExtendFor] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const active = loans
    .filter((l) => l.type === "RETURNABLE" && !l.returnedAt)
    .sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || ""));
  const overdue = active.filter((l) => loanState(l, now) === "overdue").length;
  const urgent = active.filter((l) => loanState(l, now) === "urgent").length;
  const consumed = loans.filter((l) => l.type === "CONSUMABLE").slice(0, 5);

  function openForm(itemId?: string) {
    setForm({ ...EMPTY, itemId: itemId || "" });
    setOpen(true);
  }

  async function submit() {
    if (!form.itemId) {
      show("请先选择或扫描要出库的物品", "warn");
      return;
    }
    setSaving(true);
    try {
      const r = await createLoan({
        ...form,
        quantity: Number(form.quantity) || 1,
      });
      show(
        r.type === "RETURNABLE"
          ? `已借出「${r.itemName}」，${RETURN_WINDOW_HOURS} 小时内应还；超期会出现在预警大屏`
          : `已消耗出库「${r.itemName}」，库存已扣减`
      );
      setOpen(false);
      setForm({ ...EMPTY });
      router.refresh();
    } catch (e: any) {
      show(e?.message || "出库失败，请重试", "warn");
    } finally {
      setSaving(false);
    }
  }

  async function onScan(text: string) {
    setScan(false);
    try {
      const it = await resolveItemByScan(text);
      setForm((f) => ({ ...f, itemId: it.id }));
      show(`已定位「${it.name}」，确认数量与出库类型后提交`);
      setOpen(true);
    } catch (e: any) {
      show(e?.message || "没找到对应物品", "warn");
    }
  }

  async function doReturn(loan: LoanInfo) {
    setBusyId(loan.id);
    try {
      await returnLoan(loan.id);
      router.refresh();
      show("已归还，预警自动解除");
    } catch (e: any) {
      show(e?.message || "归还失败，请重试", "warn");
    } finally {
      setBusyId(null);
    }
  }

  async function doExtend(loan: LoanInfo, hours: number) {
    setBusyId(loan.id);
    try {
      const r = await extendLoan(loan.id, hours);
      setExtendFor(null);
      router.refresh();
      show(`已延期 ${hours} 小时，新的应还时间 ${formatBeijing(r.dueAt)}（累计延期 ${r.extensionHours} 小时）`);
    } catch (e: any) {
      show(e?.message || "延期失败，请重试", "warn");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section id="stock-loans" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <PackageMinus size={18} className="text-brand" /> 出库 / 借还
            </h2>
            <p className="text-xs text-muted">
              消耗性借出直接扣库存；归还类借出 {RETURN_WINDOW_HOURS} 小时内应还，超期自动预警
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setScan(true)}>
              <ScanLine size={16} /> 扫码出库
            </Button>
            <Button onClick={() => openForm()}>
              <Plus size={16} /> 新建出库
            </Button>
            <Link
              href="/life/storage/alerts"
              className="tap inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm transition hover:bg-surface-2"
            >
              <ExternalLink size={15} /> 预警大屏
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted">借出中</p>
            <p className="text-2xl font-bold">{active.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted">即将到期</p>
            <p className="text-2xl font-bold text-brand">{urgent}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted">已超期</p>
            <p className={cn("text-2xl font-bold", overdue > 0 ? "text-red-500" : "")}>{overdue}</p>
          </Card>
        </div>

        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border">
            <EmptyState
              title="目前没有借出中的物品"
              hint="扫物品二维码或点「新建出库」，选择归还类借出即开始 8 小时计时"
              action={<Button onClick={() => openForm()}><Plus size={16} /> 新建出库</Button>}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {active.map((l) => {
              const state = loanState(l, now);
              const overdueNow = state === "overdue";
              return (
                <Card key={l.id} className={cn(overdueNow && "border-red-300")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.itemName} × {l.quantity}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {l.warehouseName || "未归属仓库"} · {l.borrower ? `借给 ${l.borrower}` : "未填借用人"}
                      </p>
                    </div>
                    <Badge className={cn(
                      overdueNow ? "text-red-500" : state === "urgent" ? "text-brand" : "text-muted"
                    )}>
                      {overdueNow ? "已超期" : state === "urgent" ? "即将到期" : "借出中"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-sm font-medium">
                    <Clock3 size={15} className={cn(overdueNow ? "text-red-500" : "text-brand")} />
                    <span className={cn(overdueNow ? "text-red-500" : "text-brand")}>
                      {formatRemaining(l, now)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    借出 {formatBeijing(l.lentAt)} · 应还 {formatBeijing(l.dueAt)}
                    {l.extensionHours > 0 && ` · 已延期 ${l.extensionHours} 小时`}
                  </p>
                  {l.note && <p className="mt-1 text-xs text-muted">备注：{l.note}</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => doReturn(l)}
                      disabled={busyId === l.id}
                      className="px-3 py-1.5 text-xs"
                    >
                      <Check size={14} /> 归还
                    </Button>
                    <button
                      className="tap inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs hover:bg-surface-2"
                      onClick={() => setExtendFor(extendFor === l.id ? null : l.id)}
                    >
                      延期 <ChevronDown size={13} />
                    </button>
                  </div>
                  {extendFor === l.id && (
                    <div className="mt-2 rounded-xl border border-border bg-surface-2 p-2">
                      <p className="mb-1.5 text-xs text-muted">选择延期时长（可多次延期）</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {EXTENSION_OPTIONS.map((h) => (
                          <button
                            key={h}
                            disabled={busyId === l.id}
                            onClick={() => doExtend(l, h)}
                            className="tap rounded-lg border border-border bg-surface px-1 py-1.5 text-xs font-medium text-brand disabled:opacity-50"
                          >
                            +{h}h
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {consumed.length > 0 && (
          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted">最近消耗性出库</p>
            <div className="space-y-1">
              {consumed.map((l) => (
                <p key={l.id} className="flex justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{l.itemName} × {l.quantity}{l.borrower ? ` · ${l.borrower}` : ""}</span>
                  <span className="shrink-0">{formatBeijing(l.lentAt)}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 出库表单 */}
      <Modal open={open} onClose={() => setOpen(false)} title="新建出库 / 借出">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">物品</label>
            <div className="flex gap-2">
              <select
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                value={form.itemId}
                onChange={(e) => setForm({ ...form, itemId: e.target.value })}
              >
                <option value="">选择物品（或先扫码）</option>
                {items.map((it) => {
                  const loaned = loanedQuantity(loans, it.id);
                  return (
                    <option key={it.id} value={it.id}>
                      {it.name} · 共 {it.quantity} / 可用 {Math.max(0, it.quantity - loaned)}
                    </option>
                  );
                })}
              </select>
              <Button variant="outline" onClick={() => setScan(true)} className="shrink-0 px-3">
                <ScanLine size={16} />
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">出库类型</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "CONSUMABLE", title: "消耗性借出", desc: "用完即扣库存，无需归还" },
                  { key: "RETURNABLE", title: "归还类借出", desc: `${RETURN_WINDOW_HOURS} 小时内应还，超期预警` },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setForm({ ...form, type: t.key })}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-xs transition",
                    form.type === t.key ? "border-brand bg-surface-2" : "border-border"
                  )}
                >
                  <span className={cn("block text-sm font-medium", form.type === t.key && "text-brand")}>
                    {t.title}
                  </span>
                  <span className="mt-0.5 block leading-relaxed text-muted">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">数量</label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">借用人（可选）</label>
              <Input
                placeholder="如 家人 / 自己"
                value={form.borrower}
                onChange={(e) => setForm({ ...form, borrower: e.target.value })}
              />
            </div>
          </div>
          <Input
            placeholder="备注（可选，会显示在预警大屏）"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <Button className="w-full" onClick={submit} disabled={saving}>
            {saving ? "提交中…" : form.type === "RETURNABLE" ? "确认借出并开始计时" : "确认消耗出库"}
          </Button>
          <p className="flex gap-2 text-xs leading-relaxed text-muted">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-brand" />
            <span>
              归还类借出不会扣减账面数量，只记「借出中」，归还后可用量自动恢复；
              消耗性借出会立即扣减库存，且不能撤销。超期从「现在」顺延，延期只影响应还时间。
            </span>
          </p>
        </div>
      </Modal>

      {scan && (
        <Scanner
          title="扫码出库"
          hint="扫物品档案二维码或商品条码，自动定位到你要出库的东西"
          onResult={onScan}
          onClose={() => setScan(false)}
        />
      )}
    </>
  );
}
