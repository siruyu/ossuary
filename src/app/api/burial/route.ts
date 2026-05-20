import { NextResponse } from "next/server";
import { prisma as db, tagsToArray, arrayToTags } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const skip = (page - 1) * limit;

  const [burials, total] = await Promise.all([
    db.buriedProject.findMany({
      where: { userId },
      include: { lootedModules: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.buriedProject.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    burials: burials.map((b) => ({
      ...b,
      tags: tagsToArray(b.tags),
      techStack: tagsToArray(b.techStack),
      lootedModules: b.lootedModules.map((m) => ({
        ...m,
        tags: tagsToArray(m.tags),
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, repo, failureMode, obituary } = body;

  if (!userId || !repo || !failureMode || !obituary) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const repoName = repo.name.toUpperCase();
  const existingBurial = await db.buriedProject.findFirst({
    where: { userId, name: repoName },
  });

  if (existingBurial) {
    return NextResponse.json({ error: `Repository "${repo.name}" has already been buried` }, { status: 409 });
  }

  const project = await db.buriedProject.create({
    data: {
      userId,
      name: repoName,
      description: repo.description,
      failureMode,
      obituary,
      lastCommit: repo.lastCommit,
      repoUrl: repo.html_url,
      stars: repo.stars,
      forks: repo.forks,
      tags: arrayToTags(repo.language ? [repo.language] : []),
      techStack: arrayToTags(repo.topics || []),
    },
  });

  // Create default lootable modules from the project
  if (repo.language) {
    await db.lootableModule.create({
      data: {
        buriedProjectId: project.id,
        name: `${repo.name.toUpperCase()}_CORE`,
        source: repo.name,
        description: `Core module extracted from ${repo.name}.`,
        tags: repo.language ? arrayToTags([repo.language]) : "",
      },
    });
  }

  // Update necromancer profile stats
  const profile = await db.necromancerProfile.findFirst({ where: { userId } });

  let newRank = profile?.rank || "NOVICE";
  const newLevel = (profile?.level || 0) + 1;
  if (newLevel >= 10) newRank = "MASTER";
  else if (newLevel >= 5) newRank = "APPRENTICE";

  await db.necromancerProfile.updateMany({
    where: { userId },
    data: {
      totalBuried: { increment: 1 },
      level: newLevel,
      rank: newRank,
    },
  });

  // Create ritual record
  await db.burialRitual.create({
    data: {
      userId,
      repoId: repo.id,
      repoName: repo.name,
      repoDescription: repo.description,
      repoLastCommit: repo.lastCommit,
      repoTags: arrayToTags(repo.topics || []),
      failureMode,
      obituary,
    },
  });

  await db.notification.create({
      data: {
        userId,
        title: "Repository Buried",
        message: `Repository "${repo.name}" has been buried in the mausoleum.`,
      },
    });

    return NextResponse.json(project);
}

export async function DELETE(request: Request) {
  let projectId: string | null = null;
  let uid: string | null = null;

  const contentType = request.headers.get("content-type") || "";
  
  if (contentType.includes("application/json")) {
    const body = await request.json();
    projectId = body.projectId;
    uid = body.userId;
  } else {
    const { searchParams } = new URL(request.url);
    projectId = searchParams.get("projectId");
    uid = searchParams.get("userId");
  }

  if (!uid || !projectId) {
    return NextResponse.json({ error: "userId and projectId required" }, { status: 400 });
  }

  const project = await db.buriedProject.findFirst({
    where: { id: projectId, userId: uid },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Delete associated lootable modules (cascades to userTreasures)
  await db.lootableModule.deleteMany({ where: { buriedProjectId: projectId } });

  // Delete associated ritual records by repoId or repoName
  await db.burialRitual.deleteMany({
    where: {
      userId: uid,
      OR: [
        { repoId: projectId },
        { repoName: project.name },
      ],
    },
  });

  // Delete the buried project
  await db.buriedProject.delete({ where: { id: projectId } });

  return NextResponse.json({ message: "Burial record deleted" });
}
