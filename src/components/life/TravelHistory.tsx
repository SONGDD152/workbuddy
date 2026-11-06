"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Download, MapPin, CalendarDays, Sparkles, Quote, MessageSquare } from "lucide-react";
import { Card, Button, EmptyState, Select } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";
import type { TravelFormValue } from "@/components/life/TravelForm";
import type { TravelNoteValue } from "@/components/life/TravelView";

/**
 * 浏览历史旅行记录：顶部统计 + 分段切换（旅行记录 / 回看心得）+ 年份/地点筛选。
 * - 旅行记录：可筛选的概述列表，点开跳「心得展示页」。
 * - 回看心得：时间线视图，合并「旅行时写下的初记」与展示页评论区补写的回看，按年份分组。
 * 支持全部 CSV 导出（含回看评论）。
 */
export function TravelHistory({
  initial,
  notes = [],
}: {
  initial: TravelFormValue[];
  notes?: TravelNoteValue[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // 初始值从 URL 读取，使筛选/分区可分享、刷新不丢
  const [tab, setTab] = React.useState<"records" | "reviews">(
    sp.get("tab") === "reviews" ? "reviews" : "records"
  );
  const [year, setYear] = React.useState<string>(sp.get("year") || "all");
  const [loc, setLoc] = React.useState<string>(sp.get("loc") || "all");

  // 把筛选/分区状态同步回 URL（replace 不污染历史栈）
  function syncUrl(y: string, l: string, t: "records" | "reviews") {
    const params = new URLSearchParams();
    if (y !== "all") params.set("year", y);
    if (l !== "all") params.set("loc", l);
    if (t !== "records") params.set("tab", t);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }
  const changeTab = (t: "records" | "reviews") => {
    setTab(t);
    syncUrl(year, loc, t);
  };
  const changeYear = (y: string) => {
    setYear(y);
    syncUrl(y, loc, tab);
  };
  const changeLoc = (l: string) => {
    setLoc(l);
    syncUrl(year, l, tab);
  };
  const clearFilters = () => {
    setYear("all");
    setLoc("all");
    syncUrl("all", "all", tab);
  };

  const stats = React.useMemo(() => {
    if (initial.length === 0) return { total: 0, from: null as Date | null, avg: 0 };
    const times = initial.map((t) => new Date(t.date ?? Date.now()).getTime());
    const min = new Date(Math.min(...times));
    const now = new Date();
    const span = now.getFullYear() - min.getFullYear() + 1; // 含当年
    const avg = initial.length / span;
    return { total: initial.length, from: min, avg };
  }, [initial]);

  const years = React.useMemo(() => {
    const set = new Set(initial.map((t) => new Date(t.date ?? Date.now()).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [initial]);

  const locations = React.useMemo(() => {
    const set = new Set(initial.map((t) => (t.location ?? "").trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "zh"));
  }, [initial]);

  const filtered = React.useMemo(() => {
    return initial.filter((t) => {
      const y = new Date(t.date ?? Date.now()).getFullYear().toString();
      const l = (t.location ?? "").trim();
      return (year === "all" || y === year) && (loc === "all" || l === loc);
    });
  }, [initial, year, loc]);

  // 回看心得时间线条目：合并「初记 review」与展示页评论区补写的 notes
  const reviewEntries = React.useMemo(() => {
    const byId = new Map(initial.map((t) => [t.id as string, t]));
    const entries: {
      key: string;
      date: Date;
      location: string;
      text: string;
      when: string;
      href: string;
    }[] = [];
    for (const t of initial) {
      if ((t.review ?? "").trim()) {
        entries.push({
          key: `r-${t.id}`,
          date: new Date(t.date ?? Date.now()),
          location: (t.location ?? "").trim(),
          text: (t.review ?? "").trim(),
          when: "旅行时写下",
          href: `/life/travel/${t.id}`,
        });
      }
    }
    for (const n of notes) {
      const t = n.travelId ? byId.get(n.travelId) : undefined;
      entries.push({
        key: `n-${n.id}`,
        date: new Date(n.createdAt),
        location: (t?.location ?? "").trim(),
        text: n.content,
        when: "回看",
        href: n.travelId ? `/life/travel/${n.travelId}` : "/life/travel/history",
      });
    }
    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [initial, notes]);

  // 心得时间线同样受年份/地点筛选（年份取回看发生的时间）
  const filteredReviewEntries = React.useMemo(() => {
    return reviewEntries.filter(
      (e) =>
        (year === "all" || e.date.getFullYear().toString() === year) &&
        (loc === "all" || e.location === loc)
    );
  }, [reviewEntries, year, loc]);

  // 心得时间线按年份分组
  const reviewGroups = React.useMemo(() => {
    const map = new Map<number, typeof filteredReviewEntries>();
    for (const e of filteredReviewEntries) {
      const y = e.date.getFullYear();
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filteredReviewEntries]);

  function exportCsv() {
    const header = ["日期", "地点", "标题", "旅行记录", "回看心得"];
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const locById = new Map(initial.map((t) => [t.id as string, (t.location ?? "").trim()]));
    const rows = [
      ...initial.map((t) => [
        fmtDate(t.date ?? ""),
        t.location ?? "",
        t.title ?? "",
        t.description ?? "",
        t.review ?? "",
      ]),
      // 回看评论：日期列为评论时间（含时分），便于与初记区分
      ...notes.map((n) => [
        fmtDate(n.createdAt, "yyyy-MM-dd HH:mm"),
        n.travelId ? locById.get(n.travelId) ?? "" : "",
        "",
        "",
        n.content,
      ]),
    ];
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
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
          <p className="text-sm text-muted">统计与回看，点概述打开心得展示页</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={initial.length === 0}>
          <Download size={16} /> 导出全部
        </Button>
      </div>

      {/* 统计（始终反映全部数据） */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <CalendarDays size={16} className="text-brand" /> 一共旅行
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-3xl font-bold">
              {stats.total} <span className="text-base font-normal text-muted">次</span>
            </p>
            <p className="text-sm text-muted">
              平均每年 <span className="text-lg font-semibold text-fg">{stats.avg.toFixed(1)}</span> 次
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <MapPin size={16} className="text-brand" /> 起始于
          </div>
          <p className="mt-1 text-lg font-semibold">
            {stats.from ? fmtDate(stats.from) : "—"}
          </p>
        </Card>
      </div>

      {/* 分段切换 */}
      <div className="inline-flex rounded-xl border border-border bg-surface p-1 text-sm">
        <button
          type="button"
          onClick={() => changeTab("records")}
          className={cn(
            "rounded-lg px-4 py-1.5 font-medium transition",
            tab === "records" ? "bg-brand text-brand-fg" : "text-muted hover:text-fg"
          )}
        >
          旅行记录
        </button>
        <button
          type="button"
          onClick={() => changeTab("reviews")}
          className={cn(
            "rounded-lg px-4 py-1.5 font-medium transition",
            tab === "reviews" ? "bg-brand text-brand-fg" : "text-muted hover:text-fg"
          )}
        >
          回看心得
        </button>
      </div>

      {/* 筛选（两个 tab 共用，且持久化到 URL） */}
      <div className="flex flex-wrap gap-2">
        <Select value={year} onChange={(e) => changeYear(e.target.value)} className="sm:w-40">
          <option value="all">全部年份</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y} 年
            </option>
          ))}
        </Select>
        <Select value={loc} onChange={(e) => changeLoc(e.target.value)} className="sm:w-48">
          <option value="all">全部地点</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        {(year !== "all" || loc !== "all") && (
          <Button variant="ghost" onClick={clearFilters}>
            清除筛选
          </Button>
        )}
      </div>

      {/* 内容区 */}
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
      ) : tab === "records" ? (
        filtered.length === 0 ? (
          <EmptyState title="没有符合条件的记录" hint="试试放宽筛选条件" />
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
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
        )
      ) : filteredReviewEntries.length === 0 ? (
        <EmptyState
          title="还没有回看心得"
          hint="在心得展示页的评论区像留言一样，写下你的回看感想"
        />
      ) : (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 px-1 text-xs text-muted">
            <MessageSquare size={13} /> 回看心得按时间陈列：旅行时写下的初记 + 展示页评论区补写的回看
          </p>
          <div className="relative space-y-6 pl-5 pt-3">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
            {reviewGroups.map(([yr, items]) => (
              <div key={yr} className="space-y-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-muted">
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5">{yr} 年</span>
                  <span className="text-xs font-normal">共 {items.length} 条心得</span>
                </p>
                {items.map((e) => (
                  <div key={e.key} className="relative">
                    <span className="absolute -left-5 top-2 h-3 w-3 rounded-full border-2 border-amber-400 bg-surface" />
                    <Link href={e.href} className="block">
                      <Card className="border-l-4 border-l-amber-400 p-4 transition hover:border-l-amber-500">
                        <p className="text-xs text-muted">
                          {fmtDate(e.date, e.when === "回看" ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd")}
                          {e.location ? ` · ${e.location}` : ""} · {e.when}
                        </p>
                        <p className="mt-1.5 flex gap-1.5 text-sm leading-relaxed">
                          <Quote size={15} className="mt-0.5 shrink-0 text-amber-500" />
                          <span className="line-clamp-4">{e.text}</span>
                        </p>
                      </Card>
                    </Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
