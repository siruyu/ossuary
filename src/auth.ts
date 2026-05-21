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
        name: { label: "Name", type: "text", optional: true },
        mode: { label: "Mode", type: "text", optional: true },
      },
      authorize: async (credentials) => {
        console.log("[Auth] authorize called with credentials:", JSON.stringify(credentials));
        
        if (!credentials) {
          console.error("[Auth] credentials is null/undefined");
          return null;
        }

        const email = (credentials.email as string)?.trim();
        const password = credentials.password as string;
        const name = (credentials.name as string)?.trim();
        const mode = credentials.mode as string;

        console.log("[Auth] Parsed - email:", email, "mode:", mode, "hasPassword:", !!password, "hasName:", !!name);

        if (!email || !password) {
          console.error("[Auth] Missing email or password");
          return null;
        }

        // If mode is signup, create new user
        if (mode === "signup") {
          console.log("[Auth] Processing signup for:", email);
          try {
            const existingUser = await prisma.user.findUnique({
              where: { email },
            });
            
            console.log("[Auth] Existing user check:", existingUser ? "FOUND" : "NOT_FOUND");
            
            if (existingUser) {
              console.log("[Auth] Signup failed - user already exists");
              return null;
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            console.log("[Auth] Password hashed successfully");

            const user = await prisma.user.create({
              data: {
                email,
                password: hashedPassword,
                name: name || null,
              },
            });

            console.log("[Auth] User created with id:", user.id);

            await prisma.necromancerProfile.create({
              data: {
                userId: user.id,
              },
            });

            console.log("[Auth] Profile created. Signup SUCCESS for:", email);

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: null,
            };
          } catch (err) {
            console.error("[Auth] Signup error:", err);
            return null;
          }
        }

        // Login mode (default)
        console.log("[Auth] Processing login for:", email);
        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.log("[Auth] Login failed - user not found");
            return null;
          }

          if (!user.password) {
            console.log("[Auth] Login failed - user has no password (likely OAuth user)");
            return null;
          }

          console.log("[Auth] Found user, comparing passwords...");
          const passwordMatch = await bcrypt.compare(password, user.password);
          console.log("[Auth] Password match result:", passwordMatch);

          if (!passwordMatch) {
            console.log("[Auth] Login failed - password mismatch");
            return null;
          }

          console.log("[Auth] Login SUCCESS for:", email, "id:", user.id);

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
