import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { profile } from "@/content/profile";
import { PublicThemeToggle } from "@/components/public/ThemeToggle";
import { MomentsFeed } from "@/components/moments/MomentsFeed";
import { getMoments } from "@/lib/moments";

/** 每次请求读库：发完动态、点赞、评论后刷新即可看到 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `朋友圈 · ${profile.name}`,
  description: "随手记录生活片段，公开动态所有人可见，私密动态只有自己看得到。",
};

const navLinks = [
  { href: "/#about", label: "关于" },
  { href: "/#channels", label: "频道" },
  { href: "/explore", label: "广场" },
];

export default async function MomentsPage() {
  const p = profile;
  const data = await getMoments();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            {p.brand}
            <span className="text-brand">.</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`hidden rounded-full px-3 py-1.5 text-sm transition sm:inline-block ${
                  l.href === "/moments"
                    ? "font-medium text-brand"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/moments"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-brand sm:hidden"
            >
              朋友圈
            </Link>
            <PublicThemeToggle />
            <Link
              href="/login"
              className="ml-1 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-fg transition hover:opacity-90"
            >
              登录
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6">
        <section className="border-b border-border py-12 sm:py-16">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
          >
            <ArrowLeft size={14} /> 返回主页
          </Link>
          <p className="mb-4 text-sm font-medium tracking-widest text-brand uppercase">
            Moments · 朋友圈
          </p>
          <h1 className="mb-5 text-4xl font-bold tracking-tight sm:text-5xl">朋友圈</h1>
          <p className="max-w-xl leading-relaxed text-muted">
            随手记点什么。公开的动态所有人可见，也会出现在公开内容广场；私密动态只有你自己看得到。点赞和评论需要登录。
          </p>
        </section>

        <div className="py-8">
          <MomentsFeed data={data} />
        </div>

        <div className="mb-16 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-muted">
          <p className="mb-2 font-medium text-fg">关于图片</p>
          <p>
            动态支持贴图片链接（每行一条，最多 9 张）。站点目前的本地上传在 Vercel 上不会持久保存，所以先用外链；接入 Vercel Blob 后可直接上传。
          </p>
        </div>
      </main>

      <footer className="border-t border-border py-10">
        <p className="text-center text-sm text-muted">{p.footerNote}</p>
      </footer>
    </div>
  );
}
