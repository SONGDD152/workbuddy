"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  PackageMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBeijing,
  formatRemaining,
  loanState,
  type LoanInfo,
} from "@/lib/storage-loan";

/**
 * 归还预警大屏（投屏用）。
 *
 * - 服务端给出活跃借出，客户端每 30 秒刷新一次，倒计时跟着走；
 * - 列表复制一遍做无缝垂直滚动，播放速度随条数变慢，条数很少时仍可读；
 * - 只展示，不在这里改数据：归还 / 延期都回仓储页操作，避免投屏时误触。
 * - 只显示当前登录账号的数据；不提供免登录公开链接（隐私优先）。
 */
export function AlertsBoard({ loans }: { loans: LoanInfo[] }) {
  const router = useRouter();
  const [now, setNow] = React.useState(() => Date.now());
  const [fullscreen, setFullscreen] = React.useState(false);

  React.useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    const reload = window.setInterval(() => router.refresh(), 30_000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(reload);
    };
  }, [router]);

  React.useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // 部分手机 WebView 不支持全屏 API，忽略即可，页面本身仍可投屏
    }
  }

  const rows = React.useMemo(
    () =>
      loans
        .filter((l) => l.type === "RETURNABLE" && !l.returnedAt)
        .sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || "")),
    [loans]
  );
  const overdue = rows.filter((l) => loanState(l, now) === "overdue").length;
  const urgent = rows.filter((l) => loanState(l, now) === "urgent").length;
  const duration = Math.max(22, rows.length * 7);

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes xbgj-alert-scroll {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
        .xbgj-alert-track { animation: xbgj-alert-scroll var(--alert-duration, 30s) linear infinite; }
        .xbgj-alert-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .xbgj-alert-track { animation: none; }
        }
      `}</style>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <AlertTriangle size={26} className="text-brand" /> 仓储归还预警
          </h1>
          <p className="mt-1 text-sm text-muted">
            归还类借出 8 小时内应还 · 超期自动进入滚动播放 · 每 30 秒自动刷新
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleFullscreen}
            className="tap inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm transition hover:bg-surface-2"
          >
            <Maximize2 size={16} /> {fullscreen ? "退出全屏" : "全屏播放"}
          </button>
          <button
            onClick={() => router.refresh()}
            className="tap inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm transition hover:bg-surface-2"
          >
            <RefreshCw size={16} /> 立即刷新
          </button>
          <Link
            href="/life/storage"
            className="tap inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-brand-fg"
          >
            <ArrowLeft size={16} /> 去处理
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "借出中", value: rows.length, tone: "text-fg" },
          { label: "已超期", value: overdue, tone: overdue > 0 ? "text-red-500" : "text-fg" },
          { label: "2 小时内到期", value: urgent, tone: "text-brand" },
          { label: "当前时间", value: formatBeijing(new Date(now)).slice(5), tone: "text-fg" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs text-muted sm:text-sm">{c.label}</p>
            <p className={cn("mt-1 text-2xl font-bold sm:text-4xl", c.tone)}>{c.value}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-[46vh] flex-col items-center justify-center rounded-3xl border border-border bg-surface-2 text-center">
          <CheckCircle2 size={56} className="text-brand" />
          <p className="mt-4 text-2xl font-semibold">一切正常，没有待归还的物品</p>
          <p className="mt-2 text-sm text-muted">有归还类借出时，这里会自动开始滚动播放预警</p>
          <Link href="/life/storage" className="mt-6 text-sm font-medium text-brand hover:underline">
            返回家庭仓储
          </Link>
        </div>
      ) : (
        <div className="relative h-[54vh] min-h-[360px] overflow-hidden rounded-3xl border border-border bg-surface-2">
          <div
            className="xbgj-alert-track"
            style={{ ["--alert-duration" as any]: `${duration}s` }}
          >
            {[...rows, ...rows].map((l, i) => {
              const state = loanState(l, now);
              const isOverdue = state === "overdue";
              return (
                <div key={`${l.id}-${i}`} className="px-3 pt-3">
                  <div
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-4 shadow-sm sm:px-6",
                      isOverdue ? "border-red-300" : state === "urgent" ? "border-brand/60" : "border-border"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold sm:text-2xl">{l.itemName} × {l.quantity}</span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            isOverdue ? "bg-red-50 text-red-600" : state === "urgent" ? "bg-surface-2 text-brand" : "bg-surface-2 text-muted"
                          )}
                        >
                          {isOverdue ? "已超期" : state === "urgent" ? "即将到期" : "借出中"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted sm:text-sm">
                        {l.warehouseName || "未归属仓库"} · {l.borrower ? `借给 ${l.borrower}` : "未填借用人"}
                        {l.extensionHours > 0 && ` · 已延期 ${l.extensionHours} 小时`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        借出 {formatBeijing(l.lentAt)} · 应还 {formatBeijing(l.dueAt)}
                        {l.note && ` · ${l.note}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xl font-bold sm:text-3xl", isOverdue ? "text-red-500" : "text-brand")}>
                        {formatRemaining(l, now)}
                      </p>
                      <p className="mt-1 text-xs text-muted">到仓库扫码归还即可解除</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface-2 to-transparent" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        <span className="flex items-center gap-2">
          <PackageMinus size={16} className="text-brand" />
          归还或延期（4 / 8 / 24 / 48 小时）请回仓储页操作；这里只做展示，避免投屏时误触。
        </span>
        <span className="flex items-center gap-1.5">
          <Clock3 size={14} /> 数据仅当前账号可见
        </span>
      </div>
    </div>
  );
}
