import { NextResponse } from "next/server";
import { prisma as db, tagsToArray, arrayToTags } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get real-time count of buried projects
  const actualBuriedCount = await db.buriedProject.count({
    where: { userId },
  });

  // Get real-time count of looted items
  const actualLootedCount = await db.lootedItem.count({
    where: { userId },
  });

  // Calculate level and rank based on actual buried count
  const newLevel = Math.max(1, actualBuriedCount);
  let newRank = "NOVICE";
  let newTitle = "APPRENTICE";
  
  if (actualBuriedCount >= 10) {
    newRank = "MASTER";
    newTitle = "ARCH-NECROMANCER";
  } else if (actualBuriedCount >= 5) {
    newRank = "APPRENTICE";
    newTitle = "NECROMANCER";
  } else if (actualBuriedCount >= 2) {
    newRank = "INITIATE";
    newTitle = "MORTICIAN";
  }

  const profile = user.profile;
  const result = {
    uid: user.id,
    userName: user.name
      ? user.name.toUpperCase().replace(/ /g, ".")
      : user.email?.toUpperCase() || "UNKNOWN",
    name: user.name || null,
    email: user.email,
    image: user.image || null,
    title: newTitle,
    level: newLevel,
    rank: newRank,
    totalBuried: actualBuriedCount,
    lootedResources: actualLootedCount,
    bio: profile?.bio || "ARCHITECT OF DEFUNCT MONOLITHS. SPECIALIST IN MEMORY LEAK PRESERVATION AND DEPRECATED API TAXIDERMY.",
    masteryTags: tagsToArray(profile?.masteryTags || ""),
    systemInsight: profile?.systemInsight || "",
    systemWhispers: profile?.systemWhispers ?? true,
  };

  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, image, title, bio, masteryTags, systemWhispers } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Update User-level fields
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(image !== undefined && { image }),
      },
    });

    // Upsert profile-level fields
    const profile = await db.necromancerProfile.upsert({
      where: { userId },
      create: {
        userId,
        bio: bio || "",
        masteryTags: arrayToTags(masteryTags || []),
        title: title || "APPRENTICE",
        systemWhispers: systemWhispers ?? true,
      },
      update: {
        ...(bio !== undefined && { bio }),
        ...(masteryTags && { masteryTags: arrayToTags(masteryTags) }),
        ...(title !== undefined && { title }),
        ...(systemWhispers !== undefined && { systemWhispers }),
      },
    });

    // Return both user and profile data so frontend can update properly
    return NextResponse.json({
      name: updatedUser.name,
      image: updatedUser.image,
      bio: profile.bio,
      title: profile.title,
      masteryTags: tagsToArray(profile.masteryTags),
      systemWhispers: profile.systemWhispers,
    });
  } catch (err) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete user — cascade removes profile, projects, modules, treasures, rituals, notifications, accounts, sessions
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: "All data erased" });
  } catch (err) {
    console.error("DELETE /api/profile error:", err);
    return NextResponse.json({ error: "Failed to erase data" }, { status: 500 });
  }
}
