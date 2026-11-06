import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 旧的文件上传接口，已停用。
 *
 * 站点跑在 Vercel：文件系统只读、实例无状态，往 public/uploads 写文件
 * 会直接 500；就算本地写成功，部署后文件也不存在。图片现在由
 * src/components/ImageField.tsx 在浏览器里压缩成 WebP data URL，
 * 随表单一起存进数据库，刷新与重新部署都不丢。
 *
 * 保留这个明确的 410，是为了让缓存了旧版 JS 的页面得到可读的原因，
 * 而不是一个看不懂的 500；新版本已不再请求这里。
 */
export async function POST() {
  return NextResponse.json(
    { error: "此上传方式已停用，请刷新页面后重新选图（新版本会直接压缩保存）" },
    { status: 410 }
  );
}
