import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Boxes,
  Clapperboard,
  Globe,
  GraduationCap,
  Heart,
  MessageCircle,
  Plane,
  UserRound,
} from "lucide-react";
import { profile } from "@/content/profile";
import { PublicThemeToggle } from "@/components/public/ThemeToggle";
import {
  EXPLORE_KINDS,
  EXPLORE_KIND_LABEL,
  getPublicItems,
  type ExploreKind,
} from "@/lib/explore";

/** 公开页每次请求读库，切换「公开」后刷新即可看到，不做静态缓存 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `公开内容广场 · ${profile.name}`,
  description: "各账号主动公开的旅行、收纳、爱好、读书、影音与学习条目。",
};

const kindIcons: Record<ExploreKind, LucideIcon> = {
  moment: MessageCircle,
  travel: Plane,
  storage: Boxes,
  hobby: Heart,
  book: BookOpen,
  movie: Clapperboard,
  study: GraduationCap,
};

const navLinks = [
  { href: "/#about", label: "关于" },
  { href: "/#skills", label: "技能" },
  { href: "/#channels", label: "频道" },
  { href: "/#contact", label: "联系" },
  { href: "/install", label: "安装 APP" },
];

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const p = profile;
  const raw = searchParams?.type;
  const type = typeof raw === "string" ? raw : "";
  const active: ExploreKind | null = (EXPLORE_KINDS as readonly string[]).includes(
    type
  )
    ? (type as ExploreKind)
    : null;

  const items = await getPublicItems();
  const shown = active ? items.filter((i) => i.kind === active) : items;
  const countOf = (k: ExploreKind) => items.filter((i) => i.kind === k).length;

  const pill = (on: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm transition ${
      on
        ? "bg-brand text-brand-fg"
        : "bg-surface-2 text-muted hover:text-fg"
    }`;

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* ================= 导航（与公开主页保持一致） ================= */}
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
            <Link href="/explore" className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-brand sm:inline-block">
              广场
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

      <main className="mx-auto max-w-4xl px-6">
        {/* ================= 页头 ================= */}
        <section className="border-b border-border py-16 sm:py-20">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
          >
            <ArrowLeft size={14} /> 返回主页
          </Link>
          <p className="mb-4 text-sm font-medium tracking-widest text-brand uppercase">
            Explore · 公开广场
          </p>
          <h1 className="mb-5 text-4xl font-bold tracking-tight sm:text-5xl">
            公开内容广场
          </h1>
          <p className="max-w-2xl leading-relaxed text-muted">
            这里汇总各个账号主动标记为「公开」的条目。默认所有内容都是私密的，只有本人手动切换后才会出现在这里；未登录也能浏览。
          </p>
        </section>

        {/* ================= 类型筛选（纯服务端，无客户端 JS） ================= */}
        <section className="py-10">
          <div className="mb-8 flex flex-wrap gap-2">
            <Link href="/explore" className={pill(active === null)}>
              全部 <span className="ml-1 opacity-70">{items.length}</span>
            </Link>
            {EXPLORE_KINDS.map((k) => (
              <Link key={k} href={`/explore?type=${k}`} className={pill(active === k)}>
                {EXPLORE_KIND_LABEL[k]}
                <span className="ml-1 opacity-70">{countOf(k)}</span>
              </Link>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <Globe size={28} className="mx-auto mb-4 text-muted" />
              <h2 className="mb-2 text-xl font-semibold">
                {active ? `还没有公开的${EXPLORE_KIND_LABEL[active]}条目` : "这里还安静着"}
              </h2>
              <p className="mx-auto mb-7 max-w-md px-4 text-sm leading-relaxed text-muted">
                登录后进入对应模块，把条目上的小锁切换为「公开」，刷新本页就会出现在这里。私密内容不会被任何人看到。
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-2.5 text-sm font-medium text-bg transition hover:opacity-85"
              >
                登录并发布公开内容 <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {shown.map((it) => {
                const Icon = kindIcons[it.kind];
                return (
                  <article
                    key={`${it.kind}-${it.id}`}
                    className="flex flex-col rounded-2xl border border-border bg-surface p-6 transition hover:border-brand"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
                        <Icon size={12} /> {EXPLORE_KIND_LABEL[it.kind]}
                      </span>
                      {it.date && <span className="text-xs text-muted">{it.date}</span>}
                    </div>
                    <h3 className="mb-1 text-lg font-semibold leading-snug">{it.title}</h3>
                    {it.subtitle && (
                      <p className="text-sm text-brand">{it.subtitle}</p>
                    )}
                    {it.description && (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                        {it.description}
                      </p>
                    )}
                    <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted">
                      <UserRound size={12} /> {it.author}
                      <span className="ml-auto inline-flex items-center gap-1">
                        <Globe size={12} /> 公开
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ================= 公开范围说明 ================= */}
        <section className="mb-20 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="mb-4 text-lg font-semibold">公开范围说明</h2>
          <ul className="space-y-2.5 text-sm leading-relaxed text-muted">
            <li>· 只展示条目本身（标题、分类、备注等元数据），<strong className="font-medium text-fg">笔记、报告、日记正文一律不公开</strong>。</li>
            <li>· 家庭收纳的房间、具体位置与条码不会公开。</li>
            <li>· 不展示账号邮箱；未填写昵称的作者显示为「匿名记录者」。</li>
            <li>· 每类最多展示最近 24 条；把条目切回「私密」后会立即从广场消失。</li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <p className="text-center text-sm text-muted">{p.footerNote}</p>
      </footer>
    </div>
  );
}
