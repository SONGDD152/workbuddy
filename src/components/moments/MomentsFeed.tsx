"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Heart, Lock, MessageCircle, Send, Trash2, X } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import {
  addMomentComment,
  createMoment,
  deleteMoment,
  deleteMomentComment,
  toggleMomentLike,
  updateMyName,
} from "@/lib/moment-actions";
import type { MomentsPayload } from "@/lib/moments";

/** 固定时区，避免 SSR 与浏览器时区不同造成 hydration 不一致 */
const fmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function time(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : fmt.format(d);
}

export function MomentsFeed({ data }: { data: MomentsPayload }) {
  const router = useRouter();
  const [content, setContent] = React.useState("");
  const [imageText, setImageText] = React.useState("");
  const [visibility, setVisibility] = React.useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [name, setName] = React.useState(data.myName);
  const [nameBusy, setNameBusy] = React.useState(false);
  const [comments, setComments] = React.useState<Record<string, string>>({});

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "操作失败，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  function needLogin() {
    if (data.loggedIn) return false;
    router.push("/login");
    return true;
  }

  async function publish() {
    if (!content.trim() || needLogin()) return;
    const images = imageText
      .split(/[\n,，]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    await run(async () => {
      await createMoment({ content, images, visibility });
      setContent("");
      setImageText("");
    });
  }

  async function saveName() {
    if (!name.trim()) return;
    setNameBusy(true);
    setError("");
    try {
      await updateMyName(name);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "保存失败");
    } finally {
      setNameBusy(false);
    }
  }

  async function submitComment(id: string) {
    const text = (comments[id] || "").trim();
    if (!text || needLogin()) return;
    await run(async () => {
      await addMomentComment(id, text);
      setComments((s) => ({ ...s, [id]: "" }));
    });
  }

  return (
    <div className="space-y-5">
      {data.unavailable && (
        <div className="rounded-2xl border border-brand/40 bg-surface p-5 text-sm text-muted">
          朋友圈正在初始化，稍后刷新即可。
        </div>
      )}

      {!data.loggedIn && (
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
          公开动态无需登录就能浏览；
          <Link href="/login" className="mx-1 font-medium text-brand hover:underline">
            登录
          </Link>
          后可以发动态、点赞和评论。
        </div>
      )}

      {data.loggedIn && !data.myName && (
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="mb-3 text-muted">还没设置昵称，别人会看到「匿名用户」。</p>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="给自己起个名字"
            />
            <Button variant="outline" onClick={saveName} disabled={nameBusy || !name.trim()}>
              {nameBusy ? "保存中…" : "保存"}
            </Button>
          </div>
        </div>
      )}

      {data.loggedIn && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-brand">
              {(data.myName || "我").slice(0, 1)}
            </div>
            <span className="text-sm font-medium">{data.myName || "我"}</span>
          </div>
          <Textarea
            rows={3}
            maxLength={2000}
            placeholder="这一刻的想法…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted hover:text-fg">
              添加图片链接（可选，每行一条，最多 9 张）
            </summary>
            <Textarea
              className="mt-2"
              rows={2}
              placeholder="https://example.com/photo.jpg"
              value={imageText}
              onChange={(e) => setImageText(e.target.value)}
            />
          </details>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Select
              className="w-auto"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "PRIVATE")}
            >
              <option value="PUBLIC">公开 · 所有人可见</option>
              <option value="PRIVATE">私密 · 仅自己可见</option>
            </Select>
            <Button onClick={publish} disabled={busy || !content.trim()}>
              {busy ? "发布中…" : "发布"}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </Card>
      )}

      {data.items.length === 0 && !data.unavailable ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <MessageCircle size={26} className="mx-auto mb-3 text-muted" />
          <p className="text-sm text-muted">还没有动态，来发第一条吧。</p>
        </div>
      ) : (
        data.items.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-brand">
                {m.author.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold">{m.author}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    {m.visibility === "PUBLIC" ? <Globe size={11} /> : <Lock size={11} />}
                    {m.visibility === "PUBLIC" ? "公开" : "仅自己可见"}
                  </span>
                  <span className="ml-auto text-xs text-muted">{time(m.createdAt)}</span>
                </div>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {m.content}
                </p>

                {m.images.length > 0 && (
                  <div
                    className={`mt-3 grid gap-2 ${m.images.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}
                  >
                    {m.images.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt=""
                        loading="lazy"
                        className={`w-full rounded-xl border border-border bg-surface-2 object-cover ${
                          m.images.length === 1 ? "max-h-96" : "aspect-square"
                        }`}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-5 border-t border-border pt-3 text-xs text-muted">
                  <button
                    className={`inline-flex items-center gap-1.5 transition hover:text-fg disabled:opacity-50 ${
                      m.liked ? "text-red-500" : ""
                    }`}
                    onClick={() => {
                      if (!needLogin()) run(() => toggleMomentLike(m.id));
                    }}
                    disabled={busy}
                  >
                    <Heart size={15} fill={m.liked ? "currentColor" : "none"} />
                    {m.likeCount} 赞
                  </button>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle size={15} /> {m.comments.length} 评论
                  </span>
                  {m.mine && (
                    <button
                      className="ml-auto inline-flex items-center gap-1 text-red-500 disabled:opacity-50"
                      onClick={() => {
                        if (!confirm("删除这条动态？点赞和评论也会一起删除。")) return;
                        run(() => deleteMoment(m.id));
                      }}
                      disabled={busy}
                    >
                      <Trash2 size={13} /> 删除
                    </button>
                  )}
                </div>

                {(m.comments.length > 0 || data.loggedIn) && (
                  <div className="mt-3 space-y-2 rounded-xl bg-surface-2 px-3 py-3">
                    {m.comments.map((c) => (
                      <div key={c.id} className="text-xs leading-relaxed">
                        <span className="font-medium text-brand">{c.author}</span>
                        <span className="text-muted">：{c.content}</span>
                        <span className="ml-2 text-muted">{time(c.createdAt)}</span>
                        {c.mine && (
                          <button
                            className="ml-1 align-middle text-muted hover:text-red-500"
                            onClick={() => run(() => deleteMomentComment(c.id))}
                            disabled={busy}
                            aria-label="删除评论"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                    {data.loggedIn && (
                      <form
                        className="flex gap-2 pt-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitComment(m.id);
                        }}
                      >
                        <Input
                          className="h-8 flex-1 bg-surface py-1 text-xs"
                          placeholder="写条评论…"
                          maxLength={500}
                          value={comments[m.id] || ""}
                          onChange={(e) =>
                            setComments((s) => ({ ...s, [m.id]: e.target.value }))
                          }
                        />
                        <Button
                          className="h-8 px-3 text-xs"
                          type="submit"
                          disabled={busy || !(comments[m.id] || "").trim()}
                        >
                          <Send size={12} /> 发送
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
