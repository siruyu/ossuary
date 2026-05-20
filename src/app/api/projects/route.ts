import { NextResponse } from "next/server";
import { prisma as db, tagsToArray, arrayToTags } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const causeOfDeath = searchParams.get("causeOfDeath") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 12;
  const offset = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { tags: { contains: search } },
      { techStack: { contains: search } },
    ];
  }
  if (causeOfDeath && causeOfDeath !== "ALL") {
    where.failureMode = { contains: causeOfDeath };
  }

  const [projects, total] = await Promise.all([
    db.buriedProject.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    db.buriedProject.count({ where }),
  ]);

  return NextResponse.json({
    projects: projects.map((p) => ({
      ...p,
      tags: tagsToArray(p.tags),
      techStack: tagsToArray(p.techStack),
      conceived: p.createdAt.toISOString(),
      terminated: p.updatedAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, name, description, failureMode, nodeRef, tags, techStack, stars, forks, lastCommit, repoUrl, imageUrl, obituary, modules } = body;

  const project = await db.buriedProject.create({
    data: {
      userId,
      name,
      description,
      failureMode,
      nodeRef: nodeRef || `#${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      tags: arrayToTags(tags || []),
      techStack: arrayToTags(techStack || []),
      stars: stars || 0,
      forks: forks || 0,
      lastCommit: lastCommit || null,
      repoUrl: repoUrl || null,
      imageUrl: imageUrl || null,
      obituary: obituary || null,
    },
  });
//get modules on request call 
  // Create associated lootable modules
  if (modules && Array.isArray(modules) && modules.length > 0) {
    for (const mod of modules) {
      await db.lootableModule.create({
        data: {
          buriedProjectId: project.id,
          name: mod.name,
          source: mod.source || project.name,
          tags: arrayToTags(mod.tags || []),
          description: mod.description || `Module extracted from ${name}`,
        },
      });
    }
  }

  return NextResponse.json(project);
}
