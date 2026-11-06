import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Github,
  Heart,
  Mail,
} from "lucide-react";
import { profile } from "@/content/profile";
import { PublicThemeToggle } from "@/components/public/ThemeToggle";

export const metadata: Metadata = {
  title: `${profile.name} · 个人主页`,
  description: profile.subtitle,
};

const navLinks = [
  { href: "#about", label: "关于" },
  { href: "#skills", label: "技能" },
  { href: "#channels", label: "频道" },
  { href: "#contact", label: "联系" },
];

const channelIcons: Record<string, LucideIcon> = {
  heart: Heart,
  book: BookOpen,
  briefcase: Briefcase,
};

export default function PublicHomePage() {
  const p = profile;

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* ================= 导航 ================= */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            {p.brand}
            <span className="text-brand">.</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hidden rounded-full px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-fg sm:inline-block"
              >
                {l.label}
              </a>
            ))}
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

      <main id="top" className="mx-auto max-w-4xl px-6">
        {/* ================= 首屏 ================= */}
        <section className="flex min-h-[80vh] flex-col justify-center py-20">
          <p className="animate-fade-in-up mb-4 text-sm font-medium tracking-widest text-brand uppercase">
            {p.role}
          </p>
          <h1 className="animate-fade-in-up mb-6 text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
            你好，我是 {p.name}
          </h1>
          <p className="animate-fade-in-up mb-4 max-w-2xl text-xl sm:text-2xl">{p.tagline}</p>
          <p className="animate-fade-in-up mb-10 max-w-2xl leading-relaxed text-muted">
            {p.subtitle}
          </p>
          <div className="animate-fade-in-up flex flex-wrap gap-4">
            <a
              href="#channels"
              className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-2.5 text-sm font-medium text-bg transition hover:opacity-85"
            >
              看看这里有什么 <ArrowRight size={16} />
            </a>
            <Link
              href="/login"
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium transition hover:bg-surface-2"
            >
              进入我的频道
            </Link>
          </div>
        </section>

        {/* ================= 关于 ================= */}
        <section id="about" className="scroll-mt-24 border-t border-border py-20">
          <h2 className="mb-10 text-3xl font-bold tracking-tight">关于</h2>
          <div className="max-w-2xl space-y-5 leading-relaxed text-muted">
            {p.about.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
          </div>
        </section>

        {/* ================= 技能 ================= */}
        <section id="skills" className="scroll-mt-24 border-t border-border py-20">
          <h2 className="mb-10 text-3xl font-bold tracking-tight">技能与工具</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {p.skills.map((group) => (
              <div key={group.category}>
                <h3 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
                  {group.category}
                </h3>
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 频道 ================= */}
        <section id="channels" className="scroll-mt-24 border-t border-border py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-bold tracking-tight">我的频道</h2>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
            >
              登录后查看完整内容 <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {p.channels.map((c) => {
              const Icon = channelIcons[c.icon] ?? Heart;
              return (
                <div
                  key={c.title}
                  className="rounded-2xl border border-border bg-surface p-6 transition hover:-translate-y-1 hover:border-brand"
                >
                  <Icon size={22} className="mb-4 text-brand" />
                  <h3 className="mb-2 text-lg font-semibold">{c.title}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-muted">{c.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= 联系 ================= */}
        <section id="contact" className="scroll-mt-24 border-t border-border py-20">
          <h2 className="mb-10 text-3xl font-bold tracking-tight">联系我</h2>
          <div className="rounded-2xl border border-border bg-surface p-8 sm:p-10">
            <p className="mb-8 max-w-xl leading-relaxed text-muted">
              有想法、合作机会，或者只是想打个招呼，都欢迎来找我。
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <a
                href={`mailto:${p.email}`}
                className="inline-flex items-center gap-2 font-medium text-brand hover:underline"
              >
                <Mail size={18} /> {p.email}
              </a>
              {p.github && (
                <a
                  href={p.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg"
                >
                  <Github size={17} /> GitHub
                </a>
              )}
              {p.gitee && (
                <a
                  href={p.gitee}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted transition hover:text-fg"
                >
                  Gitee
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <p className="text-center text-sm text-muted">{p.footerNote}</p>
      </footer>
    </div>
  );
}
