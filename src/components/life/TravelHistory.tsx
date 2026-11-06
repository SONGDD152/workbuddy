"use client";

import * as React from "react";
import Link from "next/link";
import { Download, MapPin, CalendarDays, Sparkles } from "lucide-react";
import { Card, Button, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { TravelFormValue } from "@/components/life/TravelForm";

/**
 * 浏览历史旅行记录：顶部统计 + 一条条概述列表。
 * 概述可点开（跳到输入页编辑/看回看心得）；支持全部 CSV 导出。
 */
export function TravelHistory({ initial }: { initial: TravelFormValue[] }) {
  const stats = React.useMemo(() => {
    if (initial.length === 0) return { total: 0, from: null as Date | null, avg: 0 };
    const times = initial.map((t) => new Date(t.date ?? Date.now()).getTime());
    const min = new Date(Math.min(...times));
    const now = new Date();
    const span = now.getFullYear() - min.getFullYear() + 1; // 含当年
    const avg = initial.length / span;
    return { total: initial.length, from: min, avg };
  }, [initial]);

  function exportCsv() {
    const header = ["日期", "地点", "标题", "旅行记录", "回看心得"];
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = initial.map((t) => [
      fmtDate(t.date ?? ""),
      t.location ?? "",
      t.title ?? "",
      t.description ?? "",
      t.review ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "旅行记录.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">浏览历史旅行记录</h1>
          <p className="text-sm text-muted">统计与回看，点概述可回到输入页</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={initial.length === 0}>
          <Download size={16} /> 导出全部
        </Button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <CalendarDays size={16} className="text-brand" /> 一共旅行
          </div>
          <p className="mt-1 text-3xl font-bold">
            {stats.total} <span className="text-base font-normal text-muted">次</span>
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <MapPin size={16} className="text-brand" /> 起始于
          </div>
          <p className="mt-1 text-lg font-semibold">
            {stats.from ? fmtDate(stats.from) : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Sparkles size={16} className="text-brand" /> 平均每年
          </div>
          <p className="mt-1 text-3xl font-bold">
            {stats.avg.toFixed(1)} <span className="text-base font-normal text-muted">次</span>
          </p>
        </Card>
      </div>

      {/* 列表 */}
      {initial.length === 0 ? (
        <EmptyState
          title="还没有旅行记录"
          hint="去「增加旅行记录」记一段旅程吧"
          action={
            <Link
              href="/life/travel/new"
              className="tap inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-fg"
            >
              增加旅行记录
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {initial.map((t) => (
            <Link key={t.id} href={`/life/travel/${t.id}`} className="block">
              <Card className="card-hover p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {fmtDate(t.date ?? "")}
                      {t.location ? ` · ${t.location}` : ""}
                    </p>
                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{t.description}</p>
                    )}
                    {t.review && (
                      <p className="mt-1 flex items-start gap-1 text-sm text-brand">
                        <Sparkles size={13} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">回看：{t.review}</span>
                      </p>
                    )}
                  </div>
                  {t.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
