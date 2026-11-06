import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Info,
  Laptop,
  Monitor,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";
import { profile } from "@/content/profile";
import { PublicThemeToggle } from "@/components/public/ThemeToggle";
import { InstallGuide } from "@/components/public/InstallGuide";
import { ApkDownload } from "@/components/public/ApkDownload";

export const metadata: Metadata = {
  title: `安装到手机与电脑 · ${profile.name}`,
  description:
    "推荐在浏览器里一键安装网页应用，全平台通用、不用下载文件；Android 也可下载签名安装包 APK。手机电脑共用同一份数据。",
};

const steps = [
  {
    platform: "Android 手机",
    icon: Smartphone,
    lines: [
      "用 Chrome / Edge / 三星浏览器打开本页",
      "点「立即安装到设备」，或菜单里的「安装应用」",
      "也可以往下翻，下载 APK 得到独立的 App 图标",
      "确认后主屏幕出现「小白管家」图标",
    ],
  },
  {
    platform: "iPhone / iPad",
    icon: QrCode,
    lines: [
      "必须用 Safari 打开本页（微信内请先跳浏览器）",
      "点底部「分享」→「添加到主屏幕」",
      "点「添加」，图标就出现在主屏幕",
    ],
  },
  {
    platform: "电脑（Win / Mac）",
    icon: Monitor,
    lines: [
      "用 Chrome 或 Edge 打开本页",
      "点地址栏右侧的安装图标，或本页安装按钮",
      "确认后得到独立窗口，可从开始菜单 / 程序坞启动",
    ],
  },
];

const gains = [
  "桌面独立图标、全屏运行，没有地址栏",
  "手机和电脑用同一个网址、同一份账号和数据",
  "静态资源本地缓存，页面打开更快",
  "每次 push 后自动更新，不用手动升级",
];

const limits = [
  "网页应用不需要 APK / IPA，也没有上架商店；Android 安装包在下方单独下载",
  "APK 仅支持 Android 7.0+，iPhone 和电脑请用网页应用方式",
  "登录、同步、发动态、点赞都需要联网",
  "微信内置浏览器不能直接安装或下载 APK，要先「在浏览器打开」",
  "iOS 上无法后台推送；通知、蓝牙等原生能力受限",
];

export default function InstallPage() {
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
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-full px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-fg sm:inline-block"
            >
              个人主页
            </Link>
            <Link
              href="/explore"
              className="hidden rounded-full px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-fg sm:inline-block"
            >
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
        {/* ================= 首屏 ================= */}
        <section className="border-b border-border py-16 sm:py-20">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
          >
            <ArrowLeft size={14} /> 返回主页
          </Link>
          <p className="mb-4 text-sm font-medium tracking-widest text-brand uppercase">
            Install · 手机 &amp; 电脑
          </p>
          <h1 className="mb-5 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            把它装进手机和电脑
          </h1>
          <p className="max-w-2xl leading-relaxed text-muted">
            推荐第一种：在浏览器里点一下，就把网页应用装到桌面，
            <strong className="font-medium text-fg">不用下载任何文件</strong>，手机、iPhone、电脑都能用。
            如果确实需要独立的 Android 安装包，再往下看第二种。两者打开的是同一个网站、同一份账号和数据。
          </p>
        </section>

        {/* ================= 方式一：安装网页应用（推荐，全平台） ================= */}
        <section className="border-b border-border py-14">
          <div className="mb-8">
            <p className="mb-3 text-sm font-medium tracking-widest text-brand uppercase">
              方式一 · 推荐 · 全平台通用
            </p>
            <h2 className="text-2xl font-bold tracking-tight">扫这个码，点一下就装好</h2>
          </div>
          <div className="grid items-start gap-8 sm:grid-cols-[240px_1fr]">
            <div className="mx-auto w-full max-w-[240px] sm:mx-0">
              <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                {/* 二维码必须保持原始 PNG，不能走图片优化的有损压缩，否则会影响识别 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/qr-install.png"
                  alt="扫码打开安装页的二维码"
                  width={240}
                  height={240}
                  className="h-auto w-full"
                />
              </div>
              <p className="mt-3 text-center text-sm font-medium">扫一扫，打开安装页</p>
              <a
                href="/qr-install.png"
                download="小白管家-安装二维码.png"
                className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted transition hover:text-brand"
              >
                <Download size={13} /> 保存二维码图片
              </a>
            </div>

            <div className="space-y-5">
              <InstallGuide />
              <div className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck size={17} className="text-brand" /> 关于「安装网页应用」
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  这种方式是 PWA（可安装网页应用）：装的是你现有的这个网站，不下载文件、
                  不占用几十 MB、不用申请权限、不用商店审核，也不会有第二个版本要维护。
                  装好后从图标打开，体验接近原生应用；内容始终来自 songdd.online。
                  想要真正的 Android 安装包，往下看方式二。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 方式二：Android 安装包 ================= */}
        <section className="border-b border-border py-14">
          <div className="mb-7">
            <p className="mb-3 text-sm font-medium tracking-widest text-brand uppercase">
              方式二 · 仅 Android · 需要下载文件
            </p>
            <h2 className="text-2xl font-bold tracking-tight">下载签名安装包 APK</h2>
          </div>
          <ApkDownload />
        </section>

        {/* ================= 三平台步骤 ================= */}
        <section className="border-b border-border py-14">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">按你的设备操作</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.platform} className="rounded-2xl border border-border bg-surface p-5">
                  <Icon size={20} className="mb-3 text-brand" />
                  <h3 className="mb-4 text-base font-semibold">{s.platform}</h3>
                  <ol className="space-y-2.5">
                    {s.lines.map((line, i) => (
                      <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-medium text-brand">
                          {i + 1}
                        </span>
                        {line}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= 能做什么 / 边界 ================= */}
        <section className="border-b border-border py-14">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-2 font-semibold">
                <Check size={18} className="text-brand" /> 装好以后
              </div>
              <ul className="space-y-2.5">
                {gains.map((g) => (
                  <li key={g} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-2 font-semibold">
                <Info size={18} className="text-brand" /> 需要知道边界
              </div>
              <ul className="space-y-2.5">
                {limits.map((l) => (
                  <li key={l} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-surface-2 px-6 py-4 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <Wifi size={16} className="text-brand" /> 断网时显示离线提示，登录态与私密数据不会被缓存
            </span>
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={16} className="text-brand" /> 网站更新后自动生效，无需重新下载
            </span>
            <span className="inline-flex items-center gap-2">
              <Laptop size={16} className="text-brand" /> 电脑端同样支持独立窗口
            </span>
          </div>
        </section>

        {/* ================= 只想打开网站 ================= */}
        <section className="flex flex-wrap items-center gap-6 py-14">
          <div className="flex-1">
            <h2 className="mb-2 text-xl font-bold tracking-tight">只想打开网站？扫这个</h2>
            <p className="text-sm leading-relaxed text-muted">
              第二个二维码直接指向首页，适合印在名片或分享给只想看看的人。安装页的二维码则会带对方走完整个安装引导。
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              直接打开 songdd.online <ArrowRight size={15} />
            </Link>
          </div>
          <div className="w-[150px] rounded-2xl border border-border bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/qr-site.png"
              alt="扫码直接打开网站首页的二维码"
              width={150}
              height={150}
              className="h-auto w-full"
            />
            <p className="mt-2 text-center text-xs text-stone-500">网站首页</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <p className="text-center text-sm text-muted">{p.footerNote}</p>
      </footer>
    </div>
  );
}
