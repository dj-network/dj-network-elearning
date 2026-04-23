"use server";

import { generateUploadUrl } from "@/libs/r2";
import { auth } from "@/auth";

export async function getPresignedUrl(fileName, fileType) {
  // 1. Verify Authentication & Role
  const session = await auth();
  if (!session?.user) {
    return { error: "Non autorisé. Connectez-vous." };
  }

  const role = session.user.role;
  if (role !== "admin" && role !== "formateur") {
    return { error: "Non autorisé. Droits insuffisants." };
  }

  try {
    // 2. Format a clean, unique file name
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, ""); // Remove spaces/special chars
    const uniqueFileName = `${timestamp}-${cleanFileName}`;

    // 3. Generate the signed URL for the client to upload to
    const signedUrl = await generateUploadUrl(uniqueFileName, fileType);

    // 4. Return the signed URL and the final URL where the file will be served from.
    // Prefer a custom public domain if configured; otherwise proxy through the app
    // (avoids relying on `*.r2.dev` public access and connectivity).
    let publicUrl = "";
    if (process.env.R2_PUBLIC_DOMAIN) {
      publicUrl = `${process.env.R2_PUBLIC_DOMAIN.replace(/\/$/, "")}/${uniqueFileName}`;
    } else {
      publicUrl = `/api/r2/${uniqueFileName}`;
    }

    return {
      success: true,
      signedUrl,
      fileUrl: publicUrl,
      fileName: uniqueFileName,
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return { error: "Erreur lors de la génération de l'URL d'upload." };
  }
}

export async function getPresignedUrlForProfile(fileName, fileType) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Non autorisé. Connectez-vous." };
  }

  // Only allow images for profile pictures.
  if (!fileType || typeof fileType !== "string" || !fileType.startsWith("image/")) {
    return { error: "Format invalide. Veuillez sélectionner une image." };
  }

  try {
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");
    const uniqueFileName = `profile-${session.user.id}-${timestamp}-${cleanFileName}`;

    const signedUrl = await generateUploadUrl(uniqueFileName, fileType);

    let publicUrl = "";
    if (process.env.R2_PUBLIC_DOMAIN) {
      publicUrl = `${process.env.R2_PUBLIC_DOMAIN.replace(/\/$/, "")}/${uniqueFileName}`;
    } else {
      publicUrl = `/api/r2/${uniqueFileName}`;
    }

    return {
      success: true,
      signedUrl,
      fileUrl: publicUrl,
      fileName: uniqueFileName,
    };
  } catch (error) {
    console.error("Error generating presigned URL (profile):", error);
    return { error: "Erreur lors de la génération de l'URL d'upload." };
  }
}
