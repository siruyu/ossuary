import { NextResponse } from "next/server";
import { searchFailedRepos, type GithubRepo } from "@/lib/github";

const MIN_PAGES = 5;
const PER_PAGE = 12;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = searchParams.get("perPage") ? parseInt(searchParams.get("perPage")!) : PER_PAGE;

  const hasValidToken = process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== "your-github-token" && process.env.GITHUB_TOKEN.length > 10;

  if (!hasValidToken) {
    return NextResponse.json({
      projects: [],
      total: 0,
      page,
      totalPages: 1,
      githubConfigured: false,
    });
  }

  let githubRepos: GithubRepo[] = [];

  try {
    githubRepos = await searchFailedRepos({
      query: search,
      causeOfDeath: "ALL",
      page,
      perPage,
    });
  } catch (githubError) {
    console.error("GitHub search error:", githubError);
  }

  const total = githubRepos.length;
  const hasMore = total >= perPage;
  
  let totalPages: number;
  if (hasMore) {
    if (page < MIN_PAGES) {
      totalPages = MIN_PAGES;
    } else {
      totalPages = page + 1;
    }
  } else {
    totalPages = page;
  }

  return NextResponse.json({
    projects: githubRepos,
    total,
    page,
    totalPages,
    githubConfigured: true,
  });
}