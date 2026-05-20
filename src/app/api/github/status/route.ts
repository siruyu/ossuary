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

  const hasGitHub = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: "github",
    },
  });

  return NextResponse.json({ hasGitHubAuth: !!hasGitHub });
}