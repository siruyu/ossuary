import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

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
  const { searchParams } = new URL(request.url);
  
  // Accept userId from query param (primary method, same as burial/rituals APIs)
  let userId = searchParams.get("userId");

  // Fallback to session if no userId in query
  if (!userId) {
    try {
      const session = await auth();
      userId = session?.user?.id || null;
    } catch {
      // auth() may fail if session cookie is corrupted
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized", details: "No userId provided" }, { status: 401 });
  }

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
