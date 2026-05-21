import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/api/auth",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text", optional: true },
        mode: { label: "Mode", type: "text" },
      },
      authorize: async (credentials) => {
        const { email, password, name, mode } = credentials as Record<string, string>;

        if (!email || !password) {
          return null;
        }

        if (mode === "signup") {
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });
          if (existingUser) return null;

          const hashedPassword = await bcrypt.hash(password, 12);
          const user = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              name: name || null,
            },
          });

          await prisma.necromancerProfile.create({
            data: {
              userId: user.id,
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        }

        // Login mode
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        // NEVER store image in JWT - base64 avatars are too large for cookies
        // Image is fetched from /api/profile instead
      }
      // Handle session update (e.g., when user updates profile)
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        // Ignore session.image updates to prevent cookie bloat
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.name = token.name as string;
      // Do NOT set session.user.image from token - fetch from /api/profile instead
      session.user.image = null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
