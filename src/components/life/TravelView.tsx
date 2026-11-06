"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  MapPin,
  CalendarDays,
  Globe,
  Lock,
  Quote,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  Loader2,
  Trash2,
} from "lucide-react";
import { Card, Button, Textarea } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { addTravelNote, deleteTravelNote } from "@/lib/actions";
import type { TravelFormValue } from "@/components/life/TravelForm";

export type TravelNoteValue = {
  id: string;
  travelId?: string;
  content: string;
  createdAt: string | Date;
};

/**
 * 旅游心得展示页（图片 + 文字的成文视图，只读）：
 * - 历史概述点进来看到的就是这个页面，不再直接进编辑表单
 * - 照片画廊可点击放大（全屏查看器，支持左右切换）
 * - 底部「回看心得」评论区：像留言一样随时补写带时间的回看，可逐条删除
 */
export function TravelView({
  data,
  notes = [],
}: {
  data: TravelFormValue;
  notes?: TravelNoteValue[];
}) {
  const router = useRouter();
  const id = data.id!;
  const imgs = data.images ?? [];
  const [viewIdx, setViewIdx] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const title =
    (data.title ?? "").trim() ||
    `${fmtDate(data.date ?? "")}${data.location ? ` · ${data.location}` : ""}`;
  const hasReview = (data.review ?? "").trim().length > 0;

  function step(d: number) {
    setViewIdx((i) => (i === null ? i : (i + d + imgs.length) % imgs.length));
  }

  async function post() {
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    try {
      await addTravelNote(id, text);
      setDraft("");
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "发表失败，请重试");
    } finally {
      setPosting(false);
    }
  }

  async function remove(noteId: string) {
    setDeletingId(noteId);
    try {
      await deleteTravelNote(noteId);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/life/travel/history"
          className="tap inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
        >
          <ArrowLeft size={16} /> 返回历史
        </Link>
        <Link href={`/life/travel/${id}/edit`}>
          <Button variant="outline">
            <Pencil size={16} /> 编辑
          </Button>
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold leading-snug">{title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={15} className="text-brand" /> {fmtDate(data.date ?? "")}
          </span>
          {data.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} className="text-brand" /> {data.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            {data.visibility === "PUBLIC" ? <Globe size={15} /> : <Lock size={15} />}
            {data.visibility === "PUBLIC" ? "公开" : "私密"}
          </span>
        </div>
      </header>

      {/* 照片画廊 */}
      {imgs.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {imgs.map((src, i) => (
            <button
              key={i}
              type="button"
              className="tap overflow-hidden rounded-xl"
              onClick={() => setViewIdx(i)}
              aria-label={`查看第 ${i + 1} 张照片`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`照片 ${i + 1}`}
                className="aspect-[4/3] w-full object-cover transition hover:opacity-90"
              />
            </button>
          ))}
        </div>
      )}

      {/* 旅行记录 */}
      {(data.description ?? "").trim() ? (
        <Card className="p-5">
          <h2 className="mb-2 text-base font-semibold">旅行记录</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-fg/90">
            {data.description}
          </p>
        </Card>
      ) : (
        imgs.length === 0 && (
          <Card className="p-5 text-sm text-muted">
            这条记录还没有写旅行记录，点右上角「编辑」补充吧
          </Card>
        )
      )}

      {/* 回看心得 · 评论区（像留言一样，每次回看随时补写一条） */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-base font-semibold">
          <MessageSquare size={16} className="text-amber-500" /> 回看心得
          <span className="text-xs font-normal text-muted">
            {notes.length + (hasReview ? 1 : 0)} 条
          </span>
        </h2>

        <div className="space-y-3">
          {hasReview && (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-muted">{fmtDate(data.date ?? "")} · 旅行时写下</span>
                <Link href={`/life/travel/${id}/edit`} className="text-xs text-brand">
                  编辑
                </Link>
              </div>
              <p className="flex gap-1.5 whitespace-pre-wrap text-sm leading-6">
                <Quote size={14} className="mt-1 shrink-0 text-amber-500" />
                {data.review}
              </p>
            </div>
          )}
          {notes.map((n) => (
            <div key={n.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-muted">
                  {fmtDate(n.createdAt, "yyyy-MM-dd HH:mm")} · 回看
                </span>
                <button
                  type="button"
                  className="tap rounded-lg p-1 text-muted transition hover:text-red-500"
                  onClick={() => remove(n.id)}
                  disabled={deletingId === n.id}
                  aria-label="删除这条回看"
                >
                  {deletingId === n.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6">{n.content}</p>
            </div>
          ))}
          {notes.length === 0 && !hasReview && (
            <p className="px-1 text-xs text-muted">还没有回看心得，在下面写下第一条吧</p>
          )}
        </div>

        {/* 写回看 */}
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
          <Textarea
            rows={3}
            placeholder="回看这段旅程，写点什么…（像留言一样随时补一条）"
            className="resize-y"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={post} disabled={posting || !draft.trim()}>
              {posting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              {posting ? "发表中…" : "发表回看"}
            </Button>
          </div>
        </div>
      </section>

      {/* 全屏照片查看器 */}
      {viewIdx !== null && imgs[viewIdx] !== undefined && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setViewIdx(null)}
        >
          {imgs.length > 1 && (
            <button
              type="button"
              className="tap absolute left-3 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              aria-label="上一张"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgs[viewIdx]}
            alt={`照片 ${viewIdx + 1}`}
            className="max-h-[86vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {imgs.length > 1 && (
            <button
              type="button"
              className="tap absolute right-3 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              aria-label="下一张"
            >
              <ChevronRight size={20} />
            </button>
          )}
          <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
            {viewIdx + 1} / {imgs.length}
          </span>
        </div>
      )}
    </div>
  );
}
