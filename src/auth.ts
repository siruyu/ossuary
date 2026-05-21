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
        try {
          const creds = credentials as Record<string, string | undefined>;
          const email = creds.email?.trim();
          const password = creds.password;
          const name = creds.name?.trim();
          const mode = creds.mode;

          console.log("[Auth] authorize called. mode:", mode, "email:", email);

          if (!email || !password) {
            console.log("[Auth] Missing email or password");
            return null;
          }

          if (mode === "signup") {
            const existingUser = await prisma.user.findUnique({
              where: { email },
            });
            if (existingUser) {
              console.log("[Auth] Signup failed - user exists:", email);
              return null;
            }

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

            console.log("[Auth] Signup success:", email, "id:", user.id);

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: null,
            };
          }

          // Login mode
          const user = await prisma.user.findUnique({
            where: { email },
          });
          if (!user || !user.password) {
            console.log("[Auth] Login failed - user not found or no password:", email);
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.password);
          if (!passwordMatch) {
            console.log("[Auth] Login failed - password mismatch:", email);
            return null;
          }

          console.log("[Auth] Login success:", email, "id:", user.id);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: null,
          };
        } catch (err) {
          console.error("[Auth] authorize error:", err);
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
        // NEVER store image in JWT - base64 avatars are too large for cookies
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
      // Do NOT set session.user.image from token
      session.user.image = null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
