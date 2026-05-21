import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  
  if (error) {
    console.error("GitHub OAuth error:", error);
    let baseUrl: string;
    if (process.env.NEXTAUTH_URL) {
      baseUrl = process.env.NEXTAUTH_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      baseUrl = `${url.protocol}//${url.host}`;
    }
    return NextResponse.redirect(`${baseUrl}/ritual?github_error=${encodeURIComponent(error)}`);
  }
  
  if (!code || !state) {
    let baseUrl: string;
    if (process.env.NEXTAUTH_URL) {
      baseUrl = process.env.NEXTAUTH_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      baseUrl = `${url.protocol}//${url.host}`;
    }
    return NextResponse.redirect(`${baseUrl}/ritual?github_error=missing_code_or_state`);
  }
  
  const clientId = process.env.AUTH_GITHUB_ID || "Ov23lil7aQwoM2iP9kZN";
  const clientSecret = process.env.AUTH_GITHUB_SECRET || "c16fb49fb8d5064016e2ab973fb55e4b84f6ed9c";
  
  // Determine callback URL for the token exchange
  let callbackBaseUrl: string;
  if (process.env.NEXTAUTH_URL) {
    callbackBaseUrl = process.env.NEXTAUTH_URL;
  } else if (process.env.VERCEL_URL) {
    callbackBaseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    callbackBaseUrl = `${url.protocol}//${url.host}`;
  }
  const callbackUrl = `${callbackBaseUrl}/api/connect-github/callback`;
  
  //Exchange code for token
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
  return NextResponse.redirect(`${callbackBaseUrl}/ritual?connected=true`);
}