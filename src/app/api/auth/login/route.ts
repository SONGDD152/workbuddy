import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash)))
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.issues?.[0]?.message || e.message || "登录失败" },
      { status: 400 }
    );
  }
}
