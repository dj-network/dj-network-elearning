export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [], // Configured in auth.js
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const isAuthRoute =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");

      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // The LMS is private: students only see assigned courses after login.
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      if (isAdminRoute) {
        if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
        if (nextUrl.pathname.startsWith("/admin/access") && role !== "admin")
          return Response.redirect(new URL("/", nextUrl));
        if (role !== "admin" && role !== "formateur")
          return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
      return true;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.name = token.name ?? session.user.name;
        session.user.image = token.picture ?? session.user.image;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.plan = "student";
        session.user.creditsBalance = 0;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.name = user.name ?? token.name;
        token.picture = user.image ?? token.picture;
        token.firstName = user.firstName ?? token.firstName;
        token.lastName = user.lastName ?? token.lastName;
        token.plan = "student";
        token.creditsBalance = 0;
      }

      // Keep token in sync with DB changes (profile edits) even with JWT strategy.
      // Avoid bundling Node-only DB code into the Edge runtime used by proxy.
      if (process.env.NEXT_RUNTIME === "edge") return token;

      if (token?.sub) {
        try {
          const [{ default: db }, { users }, { eq }] = await Promise.all([
            import("@/libs/db"),
            import("@/libs/schema"),
            import("drizzle-orm"),
          ]);

          const [dbUser] = await db
            .select({
              id: users.id,
              name: users.name,
              firstName: users.firstName,
              lastName: users.lastName,
              image: users.image,
              role: users.role,
            })
            .from(users)
            .where(eq(users.id, token.sub))
            .limit(1);

          if (dbUser) {
            token.role = dbUser.role ?? token.role;
            token.name = dbUser.name ?? token.name;
            token.picture = dbUser.image ?? token.picture;
            token.firstName = dbUser.firstName ?? token.firstName;
            token.lastName = dbUser.lastName ?? token.lastName;
          }

          token.plan = "student";
          token.creditsBalance = 0;
        } catch {
          // Backward-compat: DB might not have the newest columns yet.
          try {
            const [{ default: db }, { users }, { eq }] = await Promise.all([
              import("@/libs/db"),
              import("@/libs/schema"),
              import("drizzle-orm"),
            ]);

            const [dbUser] = await db
              .select({
                id: users.id,
                name: users.name,
                image: users.image,
                role: users.role,
              })
              .from(users)
              .where(eq(users.id, token.sub))
              .limit(1);
            if (dbUser) {
              token.role = dbUser.role ?? token.role;
              token.name = dbUser.name ?? token.name;
              token.picture = dbUser.image ?? token.picture;
            }

            token.plan = "student";
            token.creditsBalance = 0;
          } catch {
            // Ignore if DB unavailable; keep current token.
          }
        }
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
};
