import { Octokit } from "@octokit/rest";

function getOctokit(accessToken?: string) {
  return new Octokit({
    auth: accessToken || process.env.GITHUB_TOKEN,
  });
}

export interface GithubRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  lastCommit: string;
  updatedAt: string;
  html_url: string;
  clone_url: string;
}

//exit log on git auth; 
export async function getUserRepos(
  accessToken: string,
  page = 1
): Promise<GithubRepo[]> {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    direction: "desc",
    per_page: 50,
    page,
    type: "owner",
  });

  return data.map((repo) => ({
    id: repo.id.toString(),
    name: repo.name.toUpperCase(),
    fullName: repo.full_name,
    description: repo.description || "NO_DESCRIPTION_PROVIDED",
    language: repo.language,
    topics: repo.topics || [],
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    lastCommit: repo.pushed_at ? new Date(repo.pushed_at).toISOString() : "",
    updatedAt: repo.updated_at || "",
    html_url: repo.html_url,
    clone_url: repo.clone_url,
  }));
}

export async function getUserProfile(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.users.getAuthenticated();
  return {
    name: data.name || data.login,
    email: data.email,
    image: data.avatar_url,
    login: data.login,
  };
}

export async function getInactiveRepos(
  accessToken: string,
  inactiveDays = 180
): Promise<GithubRepo[]> {
  const allRepos = await getUserRepos(accessToken);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);
  return allRepos.filter(
    (repo) => new Date(repo.lastCommit || repo.updatedAt) < cutoff
  );
}

export interface SearchFailedReposParams {
  query?: string;
  causeOfDeath?: string;
  page?: number;
  perPage?: number;
}

const CAUSE_TOPICS: Record<string, string[]> = {
  MARKET_FIT: ["abandoned", "dead", "failed-project"],
  COMPLEXITY: ["complex", "experimental", "complexity"],
  LACK_OF_FUNDS: ["non-profit", "startup-failed"],
  TECHNICAL_DEBT: ["deprecated", "legacy", "technical-debt"],
  PASSION_FADED: ["dormant", "inactive", "hibernating"],
  SCOPE_CREEP: ["unmaintained", "abandonon"],
  TEAM_FRACTURE: ["fork-dead", "collaboration"],
};

export async function searchFailedRepos(
  params: SearchFailedReposParams,
  accessToken?: string
): Promise<GithubRepo[]> {
  let token = accessToken || process.env.GITHUB_TOKEN;
  if (!token || token === "your-github-token") {
    token = undefined;
  }

  const octokit = getOctokit(token);

  const causeTerms = params.causeOfDeath && params.causeOfDeath !== "ALL"
    ? CAUSE_TOPICS[params.causeOfDeath] || []
    : ["abandoned", "dead", "deprecated", "legacy", "inactive", "dormant", "failed"];

  let searchQuery = `topic:abandoned`;
  if (params.query) {
    searchQuery += `+${params.query}`;
  }

  const perPage = params.perPage || 12;
  const page = params.page || 1;

  try {
    const { data } = await octokit.search.repos({
      q: searchQuery,
      sort: "updated",
      order: "asc",
      per_page: perPage,
      page,
    });

    console.log("GitHub search query:", searchQuery, "-> total:", data.total_count);

    return data.items.slice(0, perPage).map((repo) => ({
      id: repo.id.toString(),
      name: repo.name.toUpperCase(),
      fullName: repo.full_name,
      description: repo.description || "NO_DESCRIPTION_PROVIDED",
      language: repo.language,
      topics: repo.topics || [],
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      lastCommit: repo.pushed_at ? new Date(repo.pushed_at).toISOString() : "",
      updatedAt: repo.updated_at || "",
      html_url: repo.html_url,
      clone_url: repo.clone_url,
    }));
  } catch (error) {
    console.error("GitHub search error:", error);
    return [];
  }
}
