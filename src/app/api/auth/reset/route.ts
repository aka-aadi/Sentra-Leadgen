import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { currentPassword, newPassword } = await req.json();
    
    const settings = await prisma.settings.findFirst();
    const actualCurrent = settings?.adminPassword || "Sentra@2026";

    if (currentPassword !== actualCurrent) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 401 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    // Update password
    await prisma.settings.update({
      where: { id: settings?.id || "default" },
      data: { adminPassword: newPassword }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
