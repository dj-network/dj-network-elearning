"use server";

import db from "@/libs/db";
import { users } from "@/libs/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";

function buildDisplayName({ firstName, lastName, fallbackName }) {
  const fn = (firstName || "").trim();
  const ln = (lastName || "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || (fallbackName || "").trim() || null;
}

export async function updateUserProfile({ firstName, lastName, image }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const safeFirstName = typeof firstName === "string" ? firstName.trim().slice(0, 80) : "";
  const safeLastName = typeof lastName === "string" ? lastName.trim().slice(0, 80) : "";
  const safeImage = typeof image === "string" ? image.trim().slice(0, 2048) : null;

  const nextName = buildDisplayName({
    firstName: safeFirstName,
    lastName: safeLastName,
    fallbackName: session.user.name,
  });

  try {
    await db
      .update(users)
      .set({
        firstName: safeFirstName,
        lastName: safeLastName,
        name: nextName,
        image: safeImage,
      })
      .where(eq(users.id, session.user.id));
  } catch {
    // Backward-compat if first/last name columns aren't migrated yet.
    await db
      .update(users)
      .set({
        name: nextName,
        image: safeImage,
      })
      .where(eq(users.id, session.user.id));
  }

  return { success: true };
}

