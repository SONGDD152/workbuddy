"use client";
import * as React from "react";

/**
 * 软键盘占据的高度（px），键盘收起时为 0。
 *
 * Android WebView 设了 adjustResize，但 CSS 的 vh 往往仍按「不含键盘」的
 * layout viewport 计算。弹窗若用 90vh 作最大高度，键盘一弹出顶部就会被
 * 挤出屏幕（标题、第一个输入框的上边框看不见）。这里用 visualViewport
 * 实测差值，交给弹窗把容器 bottom 抬到键盘上沿。
 *
 * 没有 visualViewport 的旧 WebView 返回 0：那时 adjustResize 已让容器
 * 自身缩到键盘上方，弹窗用 max-h-full 同样安全。阈值 80px 是为了不把
 * 地址栏收起这类小幅布局变化误判成键盘。
 */
export function useKeyboardInset(active = true): number {
  const [inset, setInset] = React.useState(0);

  React.useEffect(() => {
    if (!active) {
      setInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const measure = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setInset(diff > 80 ? Math.round(diff) : 0);
    };

    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
    };
  }, [active]);

  return inset;
}
