import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/api/auth",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
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
      },
      authorize: async (credentials) => {
        console.log("[Auth] Login attempt");
        
        if (!credentials) {
          console.error("[Auth] No credentials provided");
          return null;
        }

        const email = (credentials.email as string)?.trim();
        const password = credentials.password as string;

        if (!email || !password) {
          console.error("[Auth] Missing email or password");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            console.log("[Auth] User not found or no password:", email);
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.password);
          console.log("[Auth] Password match:", passwordMatch);

          if (!passwordMatch) {
            console.log("[Auth] Password mismatch for:", email);
            return null;
          }

          console.log("[Auth] Login SUCCESS for:", email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: null,
          };
        } catch (err) {
          console.error("[Auth] Login error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.email) session.user.email = token.email as string;
      if (token.name) session.user.name = token.name as string;
      session.user.image = null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
