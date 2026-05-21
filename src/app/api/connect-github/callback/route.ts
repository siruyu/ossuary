import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  
  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }
  
  const clientId = process.env.AUTH_GITHUB_ID || "Ov23lil7aQwoM2iP9kZN";
  const clientSecret = process.env.AUTH_GITHUB_SECRET || "c16fb49fb8d5064016e2ab973fb55e4b84f6ed9c";
  
  //Exchange code for token .
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  
  const tokenData = await tokenRes.json();
  
  if (!tokenData.access_token) {
    console.error("GitHub token exchange failed:", tokenData);
    return NextResponse.json({ error: "No token" }, { status: 400 });
  }
  
  // Get GitHub user
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  
  const githubUser = await userRes.json();
  
  // Delete existing and create new account
  await prisma.account.deleteMany({
    where: { userId: state, provider: "github" },
  });
  
  await prisma.account.create({
    data: {
      userId: state,
      type: "oauth",
      provider: "github",
      providerAccountId: String(githubUser.id),
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_type: "bearer",
      scope: "repo,read:user",
    },
  });
  
  const baseUrl = `${url.protocol}//${url.host}`;
  
  return NextResponse.redirect(`${baseUrl}/ritual?connected=true`);
}