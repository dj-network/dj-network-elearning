import { auth } from "@/auth";
import db from "@/libs/db";
import { users } from "@/libs/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let user;
  try {
    [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
  } catch {
    [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:p-10">
      <div className="max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Paramètres
            </h1>
            <p className="text-slate-400 mt-1">
              Gérez votre profil et vos informations de compte.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <SettingsClient
            user={user || { id: session.user.id }}
          />
        </div>
      </div>
    </div>
  );
}
