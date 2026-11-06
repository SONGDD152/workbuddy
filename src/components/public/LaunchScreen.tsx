"use client";
import * as React from "react";

/**
 * App / 网页共用的启动中转页。
 *
 * 服务端已经根据会话算好目标地址（/home 或 /login），这里只负责把
 * 「小狗和主人一起看日出」的画面稳定地展示一小会儿再跳过去：
 *  - 必须等插画加载完成，避免又出现一片空白；
 *  - 设最短展示时长，让画面真的被看见；
 *  - 设硬超时兜底，弱网或图片失败也绝不把人卡在这一页。
 * 用 location.replace 而不是 push，返回键不会退回中转页。
 */
const IMAGE = "/images/launch-sunrise.webp";
const MIN_VISIBLE_MS = 1500;
const HARD_TIMEOUT_MS = 5000;

export function LaunchScreen({ target }: { target: string }) {
  React.useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.replace(target);
    };

    const img = new Image();
    const imageReady = new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = IMAGE;
      if (img.complete) resolve();
    });
    const minWait = new Promise<void>((resolve) => {
      setTimeout(resolve, MIN_VISIBLE_MS);
    });

    Promise.all([imageReady, minWait]).then(go);
    const hard = setTimeout(go, HARD_TIMEOUT_MS);
    return () => {
      done = true;
      clearTimeout(hard);
    };
  }, [target]);

  return (
    <div className="login-theme launch-screen flex min-h-screen min-h-[100dvh] items-center justify-center px-5 py-8">
      <div className="w-full max-w-xs text-center">
        <div className="launch-art mx-auto overflow-hidden rounded-[28px]">
          {/* 本地静态图，用原始 img 以便精确控制加载完成时机 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMAGE}
            alt="小白狗靠着主人坐在草地上，一起看日出"
            width={720}
            height={991}
            className="block h-auto w-full"
          />
        </div>
        <h1 className="mt-6 text-xl font-bold tracking-tight">小白管家</h1>
        <p className="mt-1 text-sm text-muted">正在进入…</p>
        <div className="launch-progress mx-auto mt-5 h-1 w-28 overflow-hidden rounded-full bg-white/70">
          <span className="block h-full w-1/3 rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );
}
