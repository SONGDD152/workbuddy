import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 上传接口必须要求登录，避免未授权写入
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

    const ext = file.name.split(".").pop() || "jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, name), buf);

    // 生产环境建议替换为 Vercel Blob / Cloudinary 上传，这里用本地目录作为开发态
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
