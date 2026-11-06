/* ==========================================================================
 * Service Worker —— 只做「静态资源缓存 + 离线兜底」
 *
 * 隐私边界（重要，改动前请先读）：
 *  - 绝不缓存任何 HTML 页面响应。/home、/moments、/life/* 等页面含登录态
 *    与账号私有数据，缓存后可能被下一个使用者看到，也可能显示过期的公开内容。
 *  - 绝不拦截 /api/* 请求（登录、发布、点赞、上传等全部走网络）。
 *  - 只缓存带内容哈希的 /_next/static/ 与 public 下的静态图片。
 *  - 离线时导航请求返回一个纯静态的离线提示页，不读任何用户数据。
 *
 * 修改本文件后请递增 CACHE 版本号，旧缓存会在 activate 时清理。
 * ========================================================================== */

const CACHE = "songdd-static-v5";
const STATIC_PATHS = [
  "/_next/static/",
  "/icons/",
  "/favicon.ico",
];
// 二维码不进缓存：换域名或换码后，老用户也应立刻拿到新图片。

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(pathname) {
  return STATIC_PATHS.some((p) =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname === p
  );
}

function offlinePage() {
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>暂时离线 · 小白管家</title>
<style>
  :root{color-scheme:light}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
       background:#eef8ff;color:#1c1917;padding:24px;text-align:center}
  .box{max-width:28rem}
  .mark{font-size:2.5rem;color:#5aa9e6}
  h1{font-size:1.35rem;margin:1rem 0 .5rem}
  p{color:#6d8799;line-height:1.8;font-size:.95rem;margin:.25rem 0}
  button{margin-top:1.75rem;padding:.7rem 1.6rem;border:0;border-radius:999px;
         background:#5aa9e6;color:#fff;font-size:.95rem;cursor:pointer}
</style></head>
<body><div class="box">
  <div class="mark">◆</div>
  <h1>现在没有网络</h1>
  <p>站点内容、登录和同步都需要联网。</p>
  <p>网络恢复后点下面的按钮重试即可。</p>
  <button onclick="location.reload()">重新加载</button>
</div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // 静态资源：缓存优先。这些文件不可变，缓存不会带来隐私或过期问题。
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && res.type === "basic") {
          await cache.put(req, res.clone());
        }
        return res;
      })()
    );
    return;
  }

  // 页面导航：始终走网络，不缓存响应；断网时给静态离线页。
  // 这样登录态、私密动态、被改回私密的广场内容都不会留在缓存里。
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => offlinePage()));
    return;
  }

  // 其余请求（RSC 数据、图片代理等）完全不拦截。
});
