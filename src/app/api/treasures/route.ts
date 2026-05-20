import { NextResponse } from "next/server";
import { prisma as db, tagsToArray } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  if (userId) {
    const skip = (page - 1) * limit;
    const [treasures, total] = await Promise.all([
      db.userTreasure.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.userTreasure.count({ where: { userId } }),
    ]);
    return NextResponse.json({
      treasures: treasures.map((t) => ({ ...t, tags: tagsToArray(t.tags) })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  // Public: all lootable modules with stats (also paginated)
  const skip = (page - 1) * limit;
  const [modules, total] = await Promise.all([
    db.lootableModule.findMany({
      include: { buriedProject: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.lootableModule.count(),
  ]);

  return NextResponse.json({
    modules: modules.map((m) => ({
      ...m,
      tags: tagsToArray(m.tags),
      projectName: m.buriedProject.name,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, moduleId, name, source, description, tags } = body;

  if (!userId || !moduleId || !name) {
    return NextResponse.json(
      { error: "userId, moduleId, and name are required" },
      { status: 400 }
    );
  }

  const lootModule = await db.lootableModule.findUnique({ where: { id: moduleId } });
  if (!lootModule) {
    return NextResponse.json(
      { error: "Module not found" },
      { status: 404 }
    );
  }

  try {
    const treasure = await db.userTreasure.create({
      data: {
        userId,
        moduleId,
        name,
        source,
        description,
        tags: tags?.join(",") || "",
      },
    });

    await db.lootableModule.update({
      where: { id: moduleId },
      data: { extractCount: { increment: 1 }, downloadCount: { increment: 1 } },
    });

    await db.necromancerProfile.updateMany({
      where: { userId },
      data: { lootedResources: { increment: 1 } },
    });

    return NextResponse.json(treasure);
  } catch (err) {
    console.error("POST /api/treasures error:", err);
    return NextResponse.json(
      { error: "Failed to create treasure" },
      { status: 500 }
    );
  }
}
