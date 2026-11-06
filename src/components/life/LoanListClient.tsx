"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  PackageMinus,
  Clock3,
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  Copy,
} from "lucide-react";
import { Button, Card, Badge, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { returnLoan, extendLoan } from "@/lib/actions";
import {
  EXTENSION_OPTIONS,
  LOAN_TYPE_LABEL,
  formatBeijing,
  formatRemaining,
  loanState,
  loanStatusLabel,
  buildLoanCsv,
  LOAN_EXPORT_HEADERS,
  type LoanInfo,
} from "@/lib/storage-loan";

type Tab = "all" | "out" | "overdue" | "returned" | "consumable";

/**
 * 借出清单（全量台账）。
 * 想知道「哪些东西借出去了」看这里：归还类借出（含已超期 / 已归还）和消耗性出库都列出来，
 * 支持按状态筛选、CSV 导出、原地归还与延期，和出库面板共用同一套动作与口径。
 */
export function LoanListClient({ loans }: { loans: LoanInfo[] }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("all");
  const [extendFor, setExtendFor] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  function show(text: string, tone: "ok" | "warn" = "ok") {
    setFlash({ text, tone });
    window.setTimeout(() => setFlash(null), 3200);
  }

  const active = loans.filter((l) => l.type === "RETURNABLE" && !l.returnedAt);
  const overdue = active.filter((l) => loanState(l, now) === "overdue");
  const returnedList = loans.filter((l) => l.returnedAt);
  const consumable = loans.filter((l) => l.type === "CONSUMABLE");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "全部", count: loans.length },
    { key: "out", label: "借出中", count: active.length },
    { key: "overdue", label: "已超期", count: overdue.length },
    { key: "returned", label: "已归还", count: returnedList.length },
    { key: "consumable", label: "消耗性", count: consumable.length },
  ];

  const filtered = React.useMemo(() => {
    switch (tab) {
      case "out":
        return active;
      case "overdue":
        return overdue;
      case "returned":
        return returnedList;
      case "consumable":
        return consumable;
      default:
        return loans;
    }
  }, [tab, loans, active, overdue, returnedList, consumable]);

  async function doReturn(loan: LoanInfo) {
    setBusyId(loan.id);
    try {
      await returnLoan(loan.id);
      router.refresh();
      show("已归还，可用量与预警同步更新");
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

  function downloadCsv() {
    const csv = buildLoanCsv(filtered, now);
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const name = `xiaobaiguanjia-loan-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.csv`;
    try {
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      show("借出清单已开始下载（Excel 双击打开不乱码）");
    } catch {
      show("当前环境不支持直接下载，请用「复制明细」", "warn");
    }
  }

  async function copyTsv() {
    const cell = (v: string | number) => String(v ?? "").replace(/[\t\r\n]/g, " ");
    const rows = filtered.map((l) =>
      [
        l.itemName,
        LOAN_TYPE_LABEL[l.type],
        l.quantity,
        l.borrower || "",
        l.warehouseName || "",
        formatBeijing(l.lentAt),
        formatBeijing(l.dueAt),
        formatBeijing(l.returnedAt),
        loanStatusLabel(l, now),
        l.extensionHours,
        l.note || "",
      ]
        .map(cell)
        .join("\t")
    );
    const tsv = [LOAN_EXPORT_HEADERS.join("\t"), ...rows].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      show("已复制借出清单，可粘贴到 Excel / WPS（App 内若下载无反应用这个）");
    } catch {
      show("复制失败，请手动选择文字", "warn");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/life/storage"
            className="tap inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:bg-surface-2"
            aria-label="返回仓储"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold">
              <PackageMinus size={18} className="text-brand" /> 借出清单
            </h1>
            <p className="text-xs text-muted">哪些东西借出去了，一眼看清</p>
          </div>
        </div>
        <Link
          href="/life/storage"
          className="tap inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2"
        >
          去出库
        </Link>
      </header>

      {flash && (
        <div
          className={cn(
            "rounded-xl border px-3 py-2 text-sm",
            flash.tone === "ok"
              ? "border-brand/40 bg-brand/5 text-brand"
              : "border-red-300 bg-red-50 text-red-600"
          )}
        >
          {flash.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted">借出中</p>
          <p className="text-2xl font-bold">{active.length}</p>
        </Card>
        <Card className={cn("p-3", overdue.length > 0 && "border-red-300")}>
          <p className="text-xs text-muted">已超期</p>
          <p className={cn("text-2xl font-bold", overdue.length > 0 ? "text-red-500" : "")}>{overdue.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">已归还</p>
          <p className="text-2xl font-bold">{returnedList.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">消耗性出库</p>
          <p className="text-2xl font-bold">{consumable.length}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "tap rounded-full border px-3 py-1.5 text-xs font-medium transition",
                tab === t.key
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-surface text-muted hover:bg-surface-2"
              )}
            >
              {t.label}
              <span className={cn("ml-1", tab === t.key ? "text-brand" : "text-muted")}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyTsv} className="px-3 py-1.5 text-xs">
            <Copy size={14} /> 复制明细
          </Button>
          <Button onClick={downloadCsv} className="px-3 py-1.5 text-xs">
            <Download size={14} /> 下载 CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            title="这一栏还没有记录"
            hint="去「出库 / 借还」登记一笔借出，就会出现在清单里"
            action={
              <Link href="/life/storage" className="tap inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white">
                去出库
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => {
            const isReturnable = l.type === "RETURNABLE";
            const state = loanState(l, now);
            const returned = !!l.returnedAt;
            const overdueNow = isReturnable && state === "overdue";
            const canAct = isReturnable && !returned;
            return (
              <Card key={l.id} className={cn(overdueNow && "border-red-300")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {l.itemName} <span className="text-muted">× {l.quantity}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {l.warehouseName || "未归属仓库"}
                      {l.borrower ? ` · 借给 ${l.borrower}` : " · 未填借用人"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      className={cn(
                        isReturnable
                          ? returned
                            ? "text-muted"
                            : overdueNow
                            ? "text-red-500"
                            : state === "urgent"
                            ? "text-brand"
                            : "text-brand"
                          : "text-muted"
                      )}
                    >
                      {loanStatusLabel(l, now)}
                    </Badge>
                    <span className="text-[11px] text-muted">{LOAN_TYPE_LABEL[l.type]}</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Clock3 size={14} className={cn(overdueNow ? "text-red-500" : "text-brand")} />
                    <span className={cn(overdueNow ? "text-red-500" : isReturnable && !returned ? "text-brand" : "text-muted")}>
                      {isReturnable && !returned ? formatRemaining(l, now) : returned ? "已归还" : "无需归还"}
                    </span>
                  </span>
                  <span className="text-xs text-muted">借出 {formatBeijing(l.lentAt)}</span>
                  {l.dueAt && (
                    <span className="text-xs text-muted">应还 {formatBeijing(l.dueAt)}</span>
                  )}
                  {returned && l.returnedAt && (
                    <span className="text-xs text-muted">归还 {formatBeijing(l.returnedAt)}</span>
                  )}
                  {l.extensionHours > 0 && (
                    <span className="text-xs text-muted">已延期 {l.extensionHours}h</span>
                  )}
                </div>

                {l.note && <p className="mt-1 text-xs text-muted">备注：{l.note}</p>}

                {canAct && (
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
                )}
                {canAct && extendFor === l.id && (
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

      <p className="flex gap-2 px-1 text-xs leading-relaxed text-muted">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-brand" />
        <span>
          归还类借出不扣账面数量，只记「借出中」，清单里的「借出中」就是当前还没拿回来的；
          已归还的会留痕方便对账。清单只显示你自己的账号数据。
        </span>
      </p>
    </div>
  );
}
