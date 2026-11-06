"use client";
import * as React from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Info,
  Package,
} from "lucide-react";

/**
 * Android 安装包下载区（客户端组件）。
 * 微信会把 .apk 改名成 .apk.1，导致系统识别不出、显示成「?」文件，
 * 因此在微信内不渲染下载按钮，改为引导到系统浏览器。
 *
 * v1.1.0 起改用原生 WebView 外壳：不依赖 Chrome / Custom Tabs，
 * 国产安卓机打开也是独立全屏窗口，不会退化成浏览器标签页。
 *
 * 版本升级时同步改三处：public/downloads/ 下的文件、下面的 APK 常量、
 * scripts/generate-pwa-assets.py 的 APK_URL（并重跑二维码）。
 */
const APK = {
  file: "xiaobaiguanjia-v1.1.0.apk",
  href: "/downloads/xiaobaiguanjia-v1.1.0.apk",
  version: "1.1.0",
  size: "164 KB",
  packageId: "online.songdd.xbgj",
  releaseUrl:
    "https://github.com/SONGDD152/workbuddy/releases/download/v1.1.0/xiaobaiguanjia-v1.1.0.apk",
};

const INSTALL_URL = "https://songdd.online/install";

const apkSteps = [
  "点「下载 APK 安装包」或扫左侧二维码，等文件下载完成",
  "打开下载的文件，系统提示「未知来源」时允许本次安装",
  "装过旧版可直接覆盖，不用卸载；主屏幕点「小白管家」打开",
];

export function ApkDownload() {
  const [inWechat, setInWechat] = React.useState<boolean | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setInWechat(/MicroMessenger/i.test(navigator.userAgent));
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(INSTALL_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  // 检测完成前不渲染下载按钮，避免微信用户抢先点到必然失败的文件
  if (inWechat === null) {
    return (
      <div className="h-[280px] animate-pulse rounded-2xl border border-border bg-surface-2" />
    );
  }

  if (inWechat) {
    return (
      <div className="rounded-2xl border border-brand/50 bg-surface-2 p-6">
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <Info size={19} className="text-brand" /> 你现在在微信里，先别下载
        </div>
        <p className="text-sm leading-relaxed text-muted">
          微信会把安装包改名成 <code className="rounded bg-surface px-1">.apk.1</code>，
          手机就认不出来了，只会显示成一个「?」文件，点开装不了。
          <strong className="font-medium text-fg">这不是安装包坏了</strong>，绕开微信就行：
        </p>
        <ol className="mt-4 space-y-2.5">
          {[
            "点右上角「···」→「在浏览器打开」，用系统浏览器打开这个页面",
            "在浏览器里点「下载 APK 安装包」，或用系统相机扫页面上的二维码",
          ].map((line, i) => (
            <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-muted">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-medium text-brand">
                {i + 1}
              </span>
              {line}
            </li>
          ))}
        </ol>
        <button
          onClick={copyLink}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm transition hover:border-brand"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "链接已复制" : "复制安装页链接"}
        </button>
        <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs leading-relaxed text-muted">
          <p>
            <strong className="font-medium text-fg">更省事的做法：</strong>
            在浏览器里打开本页后点「立即安装到设备」，不用下载任何文件，几秒钟桌面就有「小白管家」图标。
          </p>
          <p>
            已经下成 <code className="rounded bg-surface px-1">.apk.1</code> 了？到手机「文件管理」里找到它，
            长按重命名去掉末尾的 <code className="rounded bg-surface px-1">.1</code>，再点开即可安装。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 sm:grid-cols-[220px_1fr]">
      <div className="mx-auto w-full max-w-[220px] sm:mx-0">
        <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
          {/* 二维码必须保持原始 PNG，不能走图片优化的有损压缩，否则会影响识别 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/qr-apk.png"
            alt="扫码直接下载 Android 安装包的二维码"
            width={220}
            height={220}
            className="h-auto w-full"
          />
        </div>
        <p className="mt-3 text-center text-sm font-medium">扫一扫，直接下载</p>
        <a
          href="/qr-apk.png"
          download="小白管家-安装包二维码.png"
          className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted transition hover:text-brand"
        >
          <Download size={13} /> 保存二维码图片
        </a>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-brand/30 bg-surface-2 p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Package size={18} className="text-brand" />
            <span className="font-semibold">小白管家 v{APK.version}</span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
              {APK.size} · Android 7.0+ · 无需 Chrome
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            这一版是<strong className="font-medium text-fg">原生外壳安装包</strong>：启动有品牌画面，
            打开就是独立全屏窗口，没有地址栏，也不会跳到浏览器，国产手机不装 Chrome 也能用。
            内容仍来自 songdd.online，网页一更新 App 里同步生效，不用重新下载。
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href={APK.href}
              download={APK.file}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg transition hover:opacity-90"
            >
              <Download size={16} /> 下载 APK 安装包
            </a>
            <a
              href={APK.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-brand"
            >
              <ExternalLink size={14} /> 备用下载地址
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold">安装步骤</h3>
          <ol className="space-y-2.5">
            {apkSteps.map((line, i) => (
              <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-medium text-brand">
                  {i + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
          <p className="mt-4 flex gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted">
            <Info size={14} className="mt-0.5 shrink-0 text-brand" />
            <span>
              请用系统浏览器或相机扫码，微信内下载会被改名成 .apk.1 而装不上；首次安装系统提示「未知来源」时允许本次即可。
              外壳是原生窗口，但里面的界面仍是网站本身（不是原生控件）——不会有地址栏，也不会跳浏览器。
              包名 {APK.packageId}，签名一致时新版本可直接覆盖安装。
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
