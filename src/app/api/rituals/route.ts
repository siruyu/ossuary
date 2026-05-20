import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const skip = (page - 1) * limit;

  const [rituals, total] = await Promise.all([
    db.burialRitual.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.burialRitual.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    rituals,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function DELETE(request: Request) {
  let ritualId: string | null = null;
  let uid: string | null = null;

  const contentType = request.headers.get("content-type") || "";
  
  if (contentType.includes("application/json")) {
    const body = await request.json();
    ritualId = body.ritualId;
    uid = body.userId;
  } else {
    const { searchParams } = new URL(request.url);
    ritualId = searchParams.get("ritualId");
    uid = searchParams.get("userId");
  }

  if (!ritualId || !uid) {
    return NextResponse.json({ error: "ritualId and userId required" }, { status: 400 });
  }

  const ritual = await db.burialRitual.findFirst({
    where: { id: ritualId, userId: uid },
  });
  if (!ritual) {
    return NextResponse.json({ error: "Ritual not found" }, { status: 404 });
  }

  // Delete associated buried project by repoName (repoId won't match the CUID id)
  if (ritual.repoName) {
    await db.buriedProject.deleteMany({
      where: { name: ritual.repoName, userId: uid },
    });
  }

  // Delete the ritual record
  await db.burialRitual.delete({ where: { id: ritualId } });
  return NextResponse.json({ message: "Ritual record deleted" });
}
