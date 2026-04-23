"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import db from "@/libs/db";
import { userAccess, users } from "@/libs/schema";

const allowedRoles = new Set(["user", "formateur", "admin"]);

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Accès refusé.");
  return session;
}

function normalizeRole(role) {
  return allowedRoles.has(role) ? role : "user";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function createLmsUser(formData) {
  await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") || "");
  const role = normalizeRole(String(formData.get("role") || "user"));

  if (!name || !email || !password) return;

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) return;

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    id: crypto.randomUUID(),
    name,
    email,
    password: hashedPassword,
    role,
  });

  revalidatePath("/admin/access");
}

export async function updateLmsUserRole(formData) {
  await requireAdmin();

  const userId = String(formData.get("userId") || "");
  const role = normalizeRole(String(formData.get("role") || "user"));
  if (!userId) return;

  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/admin/access");
}

export async function grantElearningAccess(formData) {
  const session = await requireAdmin();

  const userId = String(formData.get("userId") || "");
  const elearningId = String(formData.get("elearningId") || "");
  if (!userId || !elearningId) return;

  const [existingAccess] = await db
    .select({ id: userAccess.id })
    .from(userAccess)
    .where(
      and(
        eq(userAccess.userId, userId),
        eq(userAccess.elearningId, elearningId),
      ),
    )
    .limit(1);

  if (existingAccess) return;

  await db.insert(userAccess).values({
    id: crypto.randomUUID(),
    userId,
    elearningId,
    source: `admin:${session.user.id}`,
  });

  revalidatePath("/admin/access");
  revalidatePath("/");
}

export async function revokeElearningAccess(formData) {
  await requireAdmin();

  const userId = String(formData.get("userId") || "");
  const elearningId = String(formData.get("elearningId") || "");
  if (!userId || !elearningId) return;

  await db
    .delete(userAccess)
    .where(
      and(
        eq(userAccess.userId, userId),
        eq(userAccess.elearningId, elearningId),
      ),
    );

  revalidatePath("/admin/access");
  revalidatePath("/");
}
