import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  console.log("[LOOT API] Session:", session ? "exists" : "null");
  console.log("[LOOT API] UserId:", userId);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized", details: "No session found" }, { status: 401 });
  }

  const body = await request.json();
  const { repoName, repoOwner, itemName, itemPath, type } = body;

  if (!repoName || !repoOwner || !itemName || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const lootedItem = await prisma.lootedItem.create({
      data: {
        userId,
        repoName,
        repoOwner,
        itemName,
        itemPath: itemPath || "",
        type,
      },
    });

    console.log("[LOOT API] Created item:", lootedItem.id);

    await prisma.necromancerProfile.upsert({
      where: { userId },
      create: {
        userId,
        lootedResources: 1,
      },
      update: {
        lootedResources: { increment: 1 },
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        title: "Module Extracted",
        message: `Module "${itemName}" has been extracted from ${repoOwner}/${repoName}.`,
      },
    });

    return NextResponse.json(lootedItem);
  } catch (error) {
    console.error("Error creating looted item:", error);
    return NextResponse.json({ error: "Failed to track loot" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  let userId: string | undefined = session?.user?.id;

  // Fallback to query parameter if session userId is not available
  if (!userId) {
    const { searchParams } = new URL(request.url);
    userId = searchParams.get("userId") || undefined;
  }

  console.log("[LOOT API GET] Session:", session ? "exists" : "null");
  console.log("[LOOT API GET] UserId:", userId);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized", details: "No session found" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  try {
    const [items, total] = await Promise.all([
      prisma.lootedItem.findMany({
        where: { userId },
        orderBy: { downloadedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.lootedItem.count({ where: { userId } }),
    ]);

    console.log("[LOOT API GET] Found items:", items.length);

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching looted items:", error);
    return NextResponse.json({ error: "Failed to fetch looted items" }, { status: 500 });
  }
}