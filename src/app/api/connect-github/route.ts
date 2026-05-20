import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login?error=not_logged_in", request.url));
  }
  
  const clientId = process.env.AUTH_GITHUB_ID || "Ov23lil7aQwoM2iP9kZN";
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const callbackUrl = `${baseUrl}/api/connect-github/callback`;
  const scopes = "repo read:user";
  const state = session.user.id;
  
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
  
  return NextResponse.redirect(url);
}

export async function DELETE() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
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