import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    console.log("[Register] Attempting signup for:", email);

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("[Register] User already exists:", email);
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });

    console.log("[Register] User created:", user.id);

    // Create necromancer profile
    await prisma.necromancerProfile.create({
      data: {
        userId: user.id,
      },
    });

    console.log("[Register] Profile created. Signup SUCCESS for:", email);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("[Register] Error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
