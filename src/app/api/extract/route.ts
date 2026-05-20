import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

interface RepoContent {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  download_url?: string;
  content?: string;
}

interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  download_url?: string;
}

async function getToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
  });
  return account?.access_token || null;
}

function getHeaders(token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function getRepoContents(owner: string, repo: string, path: string = "", token?: string): Promise<FileItem[]> {
  const githubToken = token || process.env.GITHUB_TOKEN;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: getHeaders(githubToken),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch contents: ${response.statusText}`);
  }

  const data: RepoContent | RepoContent[] = await response.json();
  const contents = Array.isArray(data) ? data : [data];

  return contents.map((item) => ({
    name: item.name,
    path: item.path,
    type: item.type,
    size: item.size || 0,
    download_url: item.download_url,
  }));
}

async function fetchRawContent(url: string, token?: string): Promise<string> {
  const githubToken = token || process.env.GITHUB_TOKEN;
  const headers = getHeaders(githubToken);
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    return "";
  }
  
  return await response.text();
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const userToken = userId ? await getToken(userId) : null;
  
  const { searchParams } = new URL(request.url);
  const repoFullName = searchParams.get("repo") || "";
  const path = searchParams.get("path") || "";

  if (!repoFullName) {
    return NextResponse.json({ error: "Repo parameter required" }, { status: 400 });
  }

  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    return NextResponse.json({ error: "Invalid repo format. Use owner/repo" }, { status: 400 });
  }

  try {
    const files = await getRepoContents(owner, repo, path, userToken || undefined);

    let readmeContent = null;
    if (path === "") {
      readmeContent = await findAndFetchReadme(owner, repo, userToken || undefined);
    }

    return NextResponse.json({
      owner,
      repo,
      path,
      files,
      readme: readmeContent,
    });
  } catch (error) {
    console.error("Error fetching repo contents:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository contents" },
      { status: 500 }
    );
  }
}

async function findAndFetchReadme(owner: string, repo: string, token?: string): Promise<string | null> {
  const githubToken = token || process.env.GITHUB_TOKEN;
  const readmeNames = ["README.md", "README", "README.mkd", "README.rst", "README.txt", "readme.md", "Readme.md", "README.MD"];

  for (const readmeName of readmeNames) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${readmeName}`,
        { headers: getHeaders(githubToken) }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.content) {
          return Buffer.from(data.content, "base64").toString("utf-8");
        }
        
        if (data.download_url) {
          const content = await fetchRawContent(data.download_url, githubToken || undefined);
          if (content) return content;
        }
      }
    } catch {
      continue;
    }
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents`,
    { headers: getHeaders(githubToken) }
  );

  if (response.ok) {
    const contents = await response.json();
    const readmeFile = contents.find((c: any) => 
      c.name.toLowerCase().startsWith("readme")
    );
    
    if (readmeFile && readmeFile.download_url) {
      const content = await fetchRawContent(readmeFile.download_url, githubToken || undefined);
      if (content) return content;
    }
  }

  return null;
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const userToken = userId ? await getToken(userId) : null;
  
  const body = await request.json();
  const { downloadUrl, action } = body;

  if (action === "zipball") {
    const { repoFullName } = body;
    if (!repoFullName) {
      return NextResponse.json({ error: "repoFullName required" }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split("/");
    if (!owner || !repo) {
      return NextResponse.json({ error: "Invalid repo format" }, { status: 400 });
    }

    try {
      const githubToken = userToken || process.env.GITHUB_TOKEN;
      const zipballUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;

      const response = await fetch(zipballUrl, {
        headers: getHeaders(githubToken),
      });

      if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch zipball" }, { status: 500 });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (userId) {
        await prisma.notification.create({
          data: {
            userId,
            title: "Repository Downloaded",
            message: `Full repository "${repo}" has been downloaded as ${repo}.zip`,
          },
        });
      }

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${repo}.zip"`,
        },
      });
    } catch (error) {
      console.error("Error fetching zipball:", error);
      return NextResponse.json({ error: "Failed to download repository" }, { status: 500 });
    }
  }

  if (!downloadUrl) {
    return NextResponse.json({ error: "downloadUrl required" }, { status: 400 });
  }

  try {
    const content = await fetchRawContent(downloadUrl, userToken || undefined);
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error fetching file content:", error);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}