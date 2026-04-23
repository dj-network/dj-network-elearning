import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import db from "@/libs/db";
import { users } from "@/libs/schema";
import { eq } from "drizzle-orm";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toString();
        const password = credentials.password.toString();

        let user;
        try {
          [user] = await db
            .select({
              id: users.id,
              name: users.name,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              image: users.image,
              password: users.password,
              role: users.role,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        } catch {
          // Backward-compat if `first_name/last_name` not migrated yet.
          [user] = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              image: users.image,
              password: users.password,
              role: users.role,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        }

        if (!user || !user.password) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return user;
      },
    }),
  ],
});
