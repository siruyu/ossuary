import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login?error=not_logged_in", request.url));
    }
    
    const clientId = process.env.AUTH_GITHUB_ID;
    if (!clientId) {
      console.error("[GitHub OAuth] Missing AUTH_GITHUB_ID env variable");
      return NextResponse.redirect(new URL("/ritual?github_error=missing_config", request.url));
    }
    
    // Derive callback URL from the incoming request URL
    const reqUrl = new URL(request.url);
    const callbackUrl = `${reqUrl.origin}/api/connect-github/callback`;
    
    console.log("[GitHub OAuth] Initiating auth. Callback URL:", callbackUrl);
    console.log("[GitHub OAuth] Client ID:", clientId.slice(0, 6) + "...");
    
    const scopes = "repo read:user";
    const state = session.user.id;
    
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
    
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[GitHub OAuth] Route error:", err);
    return NextResponse.redirect(new URL("/ritual?github_error=server_error", request.url));
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: "github",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}