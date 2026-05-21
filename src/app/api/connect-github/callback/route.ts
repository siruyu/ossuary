import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Helper to build the callback URL consistently
function getCallbackUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.origin}/api/connect-github/callback`;
}

// Helper to build the base URL for redirects
function getBaseUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  return url.origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  
  const baseUrl = getBaseUrl(request.url);
  const callbackUrl = getCallbackUrl(request.url);
  
  console.log("[GitHub OAuth] Callback URL:", callbackUrl);
  console.log("[GitHub OAuth] Base URL:", baseUrl);
  
  if (error) {
    console.error("GitHub OAuth error:", error);
    return NextResponse.redirect(`${baseUrl}/ritual?github_error=${encodeURIComponent(error)}`);
  }
  
  if (!code || !state) {
    console.error("GitHub OAuth: Missing code or state. code:", code, "state:", state);
    return NextResponse.redirect(`${baseUrl}/ritual?github_error=missing_code_or_state`);
  }
  
  const clientId = process.env.AUTH_GITHUB_ID || "Ov23lil7aQwoM2iP9kZN";
  const clientSecret = process.env.AUTH_GITHUB_SECRET || "c16fb49fb8d5064016e2ab973fb55e4b84f6ed9c";
  
  console.log("[GitHub OAuth] Exchanging code for token. redirect_uri:", callbackUrl);
  
  // Exchange code for token - redirect_uri MUST match what was sent in the authorization request
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
      redirect_uri: callbackUrl,
    }),
  });
  
  const tokenData = await tokenRes.json();
  console.log("[GitHub OAuth] Token response:", tokenData);
  
  if (!tokenData.access_token) {
    console.error("GitHub token exchange failed:", tokenData);
    return NextResponse.json({ error: "Token exchange failed", details: tokenData }, { status: 400 });
  }
  
  // Get GitHub user
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  
  const githubUser = await userRes.json();
  
  if (!githubUser.id) {
    console.error("Failed to get GitHub user:", githubUser);
    return NextResponse.json({ error: "Failed to get GitHub user", details: githubUser }, { status: 400 });
  }
  
  console.log("[GitHub OAuth] Connected GitHub user:", githubUser.login, "to user:", state);
  
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
  
  // Redirect to ritual page WITHOUT the code in URL (prevents bad_verification_code on reload)
  return NextResponse.redirect(`${baseUrl}/ritual?connected=true`);
}