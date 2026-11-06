import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/public/PwaRegister";

export const metadata: Metadata = {
  title: "我的频道 · 个人多频道平台",
  description: "生活 + 图书馆 + 工作（占位）",
  applicationName: "我的频道",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "我的频道",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: { telephone: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0b0a" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.theme;var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
