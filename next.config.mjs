/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 图片在浏览器压缩成 data URL 后随表单提交，默认 1MB 不够用。
    // 单张压到约 100KB，4MB 足够一次提交多张（Vercel 函数请求体上限约 4.5MB）。
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      // 点开头目录在部分部署环境下会被静态服务忽略，这里兜底映射到普通路径
      { source: "/.well-known/assetlinks.json", destination: "/assetlinks.json" },
    ];
  },
  async headers() {
    return [
      {
        // Service Worker 必须能被及时更新，不能被 CDN 长期缓存
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        // 图标带明确文件名，改图后需同时改文件名或刷新缓存
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        // 签名安装包：确保浏览器按文件下载，Android 能识别为可安装应用
        source: "/downloads/:path*",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "Content-Disposition", value: "attachment" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
