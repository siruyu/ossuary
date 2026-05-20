import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ route: "connect-gh-test" });
}