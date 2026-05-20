import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, title, message } = body;

  const notification = await db.notification.create({
    data: { userId, title, message },
  });

  return NextResponse.json(notification);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { notificationId, read } = body;

  if (notificationId) {
    const updated = await db.notification.update({
      where: { id: notificationId },
      data: { read },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "notificationId required" }, { status: 400 });
}
