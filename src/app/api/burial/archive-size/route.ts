import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function formatSize(kb: number): string {
  if (kb < 1024) {
    return `${kb} KB`;
  } else if (kb < 1024 * 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  } else {
    return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const burials = await prisma.buriedProject.findMany({
    where: { userId },
    select: { repoUrl: true, name: true },
  });

  if (burials.length === 0) {
    return NextResponse.json({
      totalSizeKb: 0,
      formattedSize: "0 KB",
      repoCount: 0,
    });
  }

  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "github",
    },
  });

  if (!account?.access_token) {
    return NextResponse.json({
      totalSizeKb: 0,
      formattedSize: "0 KB",
      repoCount: burials.length,
      connected: false,
    });
  }

  let totalSizeKb = 0;

  for (const burial of burials) {
    if (!burial.repoUrl) continue;

    const urlParts = burial.repoUrl.replace("https://github.com/", "").split("/");
    if (urlParts.length < 2) continue;

    const owner = urlParts[0];
    const repo = urlParts[1];

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.ok) {
        const repoData = await response.json() as { size: number };
        totalSizeKb += repoData.size || 0;
      }
    } catch {
      // Skip repos that fail to fetch
    }
  }

  return NextResponse.json({
    totalSizeKb,
    formattedSize: formatSize(totalSizeKb),
    repoCount: burials.length,
    connected: true,
  });
}