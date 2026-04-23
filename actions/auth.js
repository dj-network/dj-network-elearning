"use server";

import db from "@/libs/db";
import { users } from "@/libs/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function registerUser(prevState, formData) {
  try {
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    if (!name || !email || !password) {
      return { error: "Veuillez remplir tous les champs." };
    }

    // Check if user already exists
    let existingUser = [];
    try {
      existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    } catch {
      // Keep a safe fallback if schema is behind.
      existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    }

    if (existingUser.length > 0) {
      return { error: "Cet email est déjà utilisé." };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return { error: "Une erreur est survenue lors de l'inscription." };
  }
}

export async function loginUser(prevState, formData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/", // Default redirect
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email ou mot de passe incorrect." };
        default:
          return { error: "Une erreur est survenue lors de la connexion." };
      }
    }
    throw error; // Rethrow to allow Next.js redirect to work
  }
}
