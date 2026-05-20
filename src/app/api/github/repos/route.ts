import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "github",
    },
  });

  if (!account?.access_token) {
    return NextResponse.json({
      connected: false,
      repos: [],
      buriedRepoNames: [],
    });
  }

  const buriedRepos = await prisma.buriedProject.findMany({
    where: { userId },
    select: { name: true },
  });
  const buriedRepoNames = buriedRepos.map((b) => b.name.toLowerCase());

  try {
    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=50", {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await prisma.account.delete({
          where: { id: account.id },
        });
        return NextResponse.json({
          connected: false,
          repos: [],
          buriedRepoNames,
          error: "Token expired. Please reconnect.",
        });
      }
      
      return NextResponse.json({
        connected: true,
        repos: [],
        buriedRepoNames,
        error: `GitHub API error: ${response.status}`,
      });
    }

    const repos = await response.json() as Array<{
      id: number;
      name: string;
      description: string | null;
      html_url: string;
      stargazers_count: number;
      forks_count: number;
      language: string | null;
      topics: string[];
      updated_at: string;
    }>;

    const formattedRepos = repos.map((repo) => ({
      id: String(repo.id),
      name: repo.name?.toUpperCase() || "",
      description: repo.description || "No description available",
      html_url: repo.html_url,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      language: repo.language,
      topics: repo.topics || [],
      lastCommit: repo.updated_at ? new Date(repo.updated_at as string).getFullYear().toString() : "Unknown",
      tags: repo.topics?.slice(0, 3) || [repo.language].filter(Boolean),
    }));

    return NextResponse.json({
      connected: true,
      repos: formattedRepos,
      buriedRepoNames,
    });
  } catch (error) {
    console.error("Fetch repos error:", error);
    return NextResponse.json({
      connected: true,
      repos: [],
      buriedRepoNames: [],
      error: "Failed to fetch repos",
    });
  }
}