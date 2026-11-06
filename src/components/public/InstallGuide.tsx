"use client";
import * as React from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Info,
  Monitor,
  Share2,
  Smartphone,
} from "lucide-react";

const INSTALL_URL = "https://songdd.online/install";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Phase =
  | "checking"
  | "installed"
  | "wechat"
  | "installable"
  | "ios"
  | "manual";

/** 按设备与浏览器给出对应的安装方式；Android / 桌面 Chrome 可直接唤起原生安装弹窗。 */
export function InstallGuide() {
  const [phase, setPhase] = React.useState<Phase>("checking");
  const [justInstalled, setJustInstalled] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const promptRef = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    const ua = navigator.userAgent;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const inWechat = /MicroMessenger/i.test(ua);
    const isIOS =
      /iPad|iPhone|iPod/i.test(ua) ||
      (ua.includes("Mac") && "ontouchend" in document);

    if (standalone) setPhase("installed");
    else if (inWechat) setPhase("wechat");
    else if (isIOS) setPhase("ios");
    else setPhase("manual");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      if (!standalone && !inWechat) setPhase("installable");
    };
    const onInstalled = () => {
      setJustInstalled(true);
      setPhase("installed");
      promptRef.current = null;
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const p = promptRef.current;
    if (!p) return;
    try {
      await p.prompt();
      const choice = await p.userChoice;
      if (choice.outcome === "accepted") {
        setJustInstalled(true);
        setPhase("installed");
      }
    } catch {
      // 用户或浏览器取消，保持原状态即可
    }
    promptRef.current = null;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(INSTALL_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  if (phase === "installed") {
    return (
      <div className="rounded-2xl border border-brand/40 bg-surface-2 p-5">
        <div className="flex items-center gap-2 font-medium text-brand">
          <CheckCircle2 size={20} /> {justInstalled ? "安装完成" : "已经装好了"}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {justInstalled
            ? "回到桌面就能看到新图标，之后从图标打开，没有浏览器地址栏。"
            : "你正在用应用窗口浏览。数据、登录状态和网页版完全同步，不用重复登录。"}
        </p>
      </div>
    );
  }

  if (phase === "wechat") {
    return (
      <div className="rounded-2xl border border-border bg-surface-2 p-5">
        <div className="flex items-center gap-2 font-medium">
          <Share2 size={19} className="text-brand" /> 请先在系统浏览器里打开
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          微信内置浏览器不支持安装网页应用。点右上角「···」→「在浏览器打开」，再回到这个页面点安装即可。
        </p>
        <button
          onClick={copyLink}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm transition hover:border-brand"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "链接已复制" : "复制安装页链接"}
        </button>
      </div>
    );
  }

  if (phase === "installable") {
    return (
      <div className="rounded-2xl border border-brand/40 bg-surface-2 p-5">
        <div className="flex items-center gap-2 font-medium">
          <Download size={19} className="text-brand" /> 当前浏览器可以直接安装
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          点下面的按钮，在弹窗里确认，桌面或主屏幕就会多一个独立图标。
        </p>
        <button
          onClick={install}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg transition hover:opacity-90"
        >
          <Download size={16} /> 立即安装到设备
        </button>
      </div>
    );
  }

  if (phase === "ios") {
    return (
      <div className="rounded-2xl border border-border bg-surface-2 p-5">
        <div className="flex items-center gap-2 font-medium">
          <Smartphone size={19} className="text-brand" /> iPhone / iPad：用 Safari 添加
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          点底部「分享」按钮 <Share2 size={14} className="inline align-[-2px]" /> →
          下滑找到「添加到主屏幕」→ 右上角「添加」。注意要在 Safari 里操作，其他 iOS 浏览器不支持。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5">
      <div className="flex items-center gap-2 font-medium">
        {phase === "checking" ? (
          <Info size={19} className="text-brand" />
        ) : (
          <Monitor size={19} className="text-brand" />
        )}
        在浏览器菜单里安装
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        如果没自动弹出安装提示，打开浏览器菜单，找「安装应用 / 添加到主屏幕 / 创建快捷方式」。
        Chrome、Edge、三星浏览器都支持；地址栏右侧通常也有一个安装图标。
      </p>
      <button
        onClick={copyLink}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm transition hover:border-brand"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? "链接已复制" : "复制安装页链接"}
      </button>
    </div>
  );
}
