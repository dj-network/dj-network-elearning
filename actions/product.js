"use server";

import db from "@/libs/db";
import {
  products,
  masterclasses,
  userAccess,
} from "@/libs/schema";
import { auth } from "@/auth";
import { desc, eq, inArray } from "drizzle-orm";

export async function createProduct(data) {
  try {
    const session = await auth();

    // Verify User has Admin or Formateur permissions
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    if (!data.title || !data.slug || !data.categoryId) {
      return { error: "Le titre, le slug et la catégorie sont obligatoires." };
    }

    const {
      title,
      categoryId,
      slug,
      description,
      imageUrl,
      demoAudioUrl,
      fileUrl,
      fileSize,
      sortOrder,
      price,
      author,
      stripeProductId,
      creditCost,
      accessModel,
      accessTier,
      memberDiscountStudio,
      memberDiscountStudioPlus,
      compatibility,
      highlights,
      packContents,
      tags,
      isPublished,
    } = data;

    let resolvedSortOrder = 0;
    if (sortOrder != null && Number.isFinite(Number(sortOrder))) {
      resolvedSortOrder = Number(sortOrder);
    } else {
      try {
        const last = await db
          .select({ sortOrder: products.sortOrder })
          .from(products)
          .orderBy(desc(products.sortOrder))
          .limit(1);
        resolvedSortOrder = Number(last?.[0]?.sortOrder ?? -1) + 1;
      } catch {
        resolvedSortOrder = 0;
      }
    }

    const baseValues = {
      id: crypto.randomUUID(),
      title,
      slug,
      categoryId,
      description,
      imageUrl,
      demoAudioUrl,
      fileUrl: fileUrl ?? null,
      fileSize: fileSize ?? null,
      sortOrder: resolvedSortOrder,
      price: price ?? null,
      compatibility: compatibility ?? null,
      highlights: highlights ?? null,
      packContents: packContents ?? null,
      author,
      stripeProductId,
      creditCost: creditCost ?? null,
      accessModel: accessModel ?? "purchase_only",
      accessTier: accessTier ?? "none",
      memberDiscountStudio: memberDiscountStudio ?? null,
      memberDiscountStudioPlus: memberDiscountStudioPlus ?? null,
      tags: tags ?? null,
      createdAt: new Date(),
    };

    const published =
      isPublished === undefined || isPublished === null ? true : !!isPublished;

    try {
      await db.insert(products).values({
        ...baseValues,
        isPublished: published,
      });
    } catch (e) {
      // Backward-compat: DB might not have the `is_published` column yet.
      const msg = e?.message || String(e);
      const missingNewCols =
        msg.includes("no such column: is_published") ||
        msg.includes("has no column named is_published") ||
        msg.includes("is_published") ||
        msg.includes("no such column: highlights") ||
        msg.includes("has no column named highlights") ||
        msg.includes("highlights") ||
        msg.includes("no such column: pack_contents") ||
        msg.includes("has no column named pack_contents") ||
        msg.includes("pack_contents") ||
        msg.includes("no such column: access_model") ||
        msg.includes("has no column named access_model") ||
        msg.includes("access_model") ||
        msg.includes("no such column: access_tier") ||
        msg.includes("has no column named access_tier") ||
        msg.includes("access_tier") ||
        msg.includes("member_discount_studio") ||
        msg.includes("member_discount_studio_plus") ||
        msg.includes("credit_cost");
      if (missingNewCols) {
        const fallbackValues = {
          id: baseValues.id,
          title: baseValues.title,
          slug: baseValues.slug,
          categoryId: baseValues.categoryId,
          description: baseValues.description,
          imageUrl: baseValues.imageUrl,
          demoAudioUrl: baseValues.demoAudioUrl,
          fileUrl: baseValues.fileUrl,
          fileSize: baseValues.fileSize,
          sortOrder: baseValues.sortOrder,
          price: baseValues.price,
          author: baseValues.author,
          stripeProductId: baseValues.stripeProductId,
          tags: baseValues.tags,
          createdAt: baseValues.createdAt,
        };
        await db.insert(products).values(fallbackValues);
      } else {
        throw e;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur serveur lors de la création du produit:", error);
    // Generic SQLite constraint error for unique slug
    if (error.message?.includes("UNIQUE constraint failed")) {
      return { error: "Ce slug est déjà utilisé par un autre produit." };
    }
    return { error: "Impossible de créer le produit en base de données." };
  }
}

export async function updateProduct(id, data) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    const baseSet = {
      title: data.title,
      slug: data.slug,
      categoryId: data.categoryId,
      description: data.description,
      price: data.price,
      author: data.author,
      stripeProductId: data.stripeProductId,
      creditCost: data.creditCost ?? null,
      accessModel: data.accessModel ?? "purchase_only",
      accessTier: data.accessTier ?? "none",
      memberDiscountStudio: data.memberDiscountStudio ?? null,
      memberDiscountStudioPlus: data.memberDiscountStudioPlus ?? null,
      imageUrl: data.imageUrl,
      demoAudioUrl: data.demoAudioUrl,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      ...(data.sortOrder === undefined ? {} : { sortOrder: data.sortOrder }),
      compatibility: data.compatibility,
      highlights: data.highlights,
      packContents: data.packContents,
      tags: data.tags,
      updatedAt: new Date(),
    };

    const published =
      data.isPublished === undefined || data.isPublished === null
        ? undefined
        : !!data.isPublished;

    try {
      await db
        .update(products)
        .set({
          ...baseSet,
          ...(published === undefined ? {} : { isPublished: published }),
        })
        .where(eq(products.id, id));
    } catch (e) {
      // Backward-compat: DB might not have the `is_published` column yet.
      const msg = e?.message || String(e);
      const missingNewCols =
        msg.includes("no such column: is_published") ||
        msg.includes("has no column named is_published") ||
        msg.includes("is_published") ||
        msg.includes("no such column: highlights") ||
        msg.includes("has no column named highlights") ||
        msg.includes("highlights") ||
        msg.includes("no such column: pack_contents") ||
        msg.includes("has no column named pack_contents") ||
        msg.includes("pack_contents") ||
        msg.includes("no such column: access_model") ||
        msg.includes("has no column named access_model") ||
        msg.includes("access_model") ||
        msg.includes("no such column: access_tier") ||
        msg.includes("has no column named access_tier") ||
        msg.includes("access_tier") ||
        msg.includes("member_discount_studio") ||
        msg.includes("member_discount_studio_plus") ||
        msg.includes("credit_cost");
      if (missingNewCols) {
        const fallbackSet = {
          title: baseSet.title,
          slug: baseSet.slug,
          categoryId: baseSet.categoryId,
          description: baseSet.description,
          price: baseSet.price,
          author: baseSet.author,
          stripeProductId: baseSet.stripeProductId,
          imageUrl: baseSet.imageUrl,
          demoAudioUrl: baseSet.demoAudioUrl,
          fileUrl: baseSet.fileUrl,
          fileSize: baseSet.fileSize,
          ...(baseSet.sortOrder === undefined ? {} : { sortOrder: baseSet.sortOrder }),
          tags: baseSet.tags,
          updatedAt: baseSet.updatedAt,
        };
        await db.update(products).set(fallbackSet).where(eq(products.id, id));
      } else {
        throw e;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur update produit:", error);
    return { error: "Impossible de mettre à jour le produit." };
  }
}

export async function deleteProduct(id) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    await db.delete(products).where(eq(products.id, id));
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression produit:", error);
    return { error: "Impossible de supprimer le produit." };
  }
}

export async function reorderProducts(orderedProductIds) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    if (!Array.isArray(orderedProductIds) || !orderedProductIds.length) {
      return { error: "Paramètres invalides." };
    }

    const uniqueIds = Array.from(
      new Set(orderedProductIds.map((x) => String(x || "").trim()).filter(Boolean)),
    );
    if (uniqueIds.length !== orderedProductIds.length) {
      return { error: "Liste de produits invalide (doublons)." };
    }

    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(inArray(products.id, uniqueIds));

    if (existing.length !== uniqueIds.length) {
      return { error: "Certains produits sont introuvables." };
    }

    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < uniqueIds.length; i += 1) {
          await tx
            .update(products)
            .set({ sortOrder: i, updatedAt: new Date() })
            .where(eq(products.id, uniqueIds[i]));
        }
      });
    } catch (e) {
      const msg = e?.message || String(e);
      if (
        msg.includes("no such column: sort_order") ||
        msg.includes("has no column named sort_order") ||
        msg.includes("sort_order")
      ) {
        return {
          error:
            "La colonne sort_order manque en base. Lance la migration produits avant de réordonner.",
        };
      }
      throw e;
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur reorder produits:", error);
    return { error: "Impossible de réordonner les produits." };
  }
}

export async function updateMasterclass(id, data) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    const baseSet = {
      title: data.title,
      slug: data.slug,
      description: data.description,
      price: data.price,
      instructor: data.instructor,
      duration: data.duration,
      level: data.level,
      category: data.category,
      stripeProductId: data.stripeProductId,
      creditCost: data.creditCost ?? null,
      accessModel: data.accessModel ?? "purchase_only",
      accessTier: data.accessTier ?? "none",
      memberDiscountStudio: data.memberDiscountStudio ?? null,
      memberDiscountStudioPlus: data.memberDiscountStudioPlus ?? null,
      videoUrl: data.videoUrl,
      imageUrl: data.imageUrl,
      tags: data.tags,
      chapters: data.chapters,
      highlights: data.highlights,
      downloads: data.downloads,
      softwares: data.softwares,
      links: data.links,
      ...(data.sortOrder === undefined ? {} : { sortOrder: data.sortOrder }),
    };
    const published =
      data.isPublished === undefined || data.isPublished === null
        ? undefined
        : !!data.isPublished;

    try {
      await db
        .update(masterclasses)
        .set({
          ...baseSet,
          ...(data.badges === undefined ? {} : { badges: data.badges ?? null }),
          ...(published === undefined ? {} : { isPublished: published }),
        })
        .where(eq(masterclasses.id, id));
    } catch (e) {
      // Backward-compat: DB might not have the new columns yet.
      const msg = e?.message || String(e);
      const chaptersMissing =
        msg.includes("no such column: chapters") ||
        msg.includes("has no column named chapters") ||
        msg.includes("chapters");
      const structuredMissing =
        msg.includes("no such column: highlights") ||
        msg.includes("has no column named highlights") ||
        msg.includes("no such column: downloads") ||
        msg.includes("has no column named downloads") ||
        msg.includes("no such column: softwares") ||
        msg.includes("has no column named softwares") ||
        msg.includes("no such column: links") ||
        msg.includes("has no column named links") ||
        msg.includes("highlights") ||
        msg.includes("downloads") ||
        msg.includes("softwares") ||
        msg.includes("links");
      const sortOrderMissing =
        msg.includes("no such column: sort_order") ||
        msg.includes("has no column named sort_order") ||
        msg.includes("sort_order");
      if (
        msg.includes("no such column: badges") ||
        msg.includes("has no column named badges") ||
        msg.includes("no such column: tags") ||
        msg.includes("has no column named tags") ||
        msg.includes("no such column: access_model") ||
        msg.includes("has no column named access_model") ||
        msg.includes("no such column: access_tier") ||
        msg.includes("has no column named access_tier") ||
        chaptersMissing ||
        structuredMissing ||
        sortOrderMissing ||
        msg.includes("no such column: is_published") ||
        msg.includes("has no column named is_published") ||
        msg.includes("badges") ||
        msg.includes("tags") ||
        msg.includes("access_model") ||
        msg.includes("access_tier") ||
        msg.includes("member_discount_studio") ||
        msg.includes("member_discount_studio_plus") ||
        msg.includes("credit_cost") ||
        msg.includes("is_published")
      ) {
        await db
          .update(masterclasses)
          .set({
            ...Object.fromEntries(
              Object.entries(baseSet).filter(
                ([k]) =>
                  ![
                    "chapters",
                    "highlights",
                    "downloads",
                    "softwares",
                    "links",
                    "creditCost",
                    "sortOrder",
                    "accessModel",
                    "accessTier",
                    "memberDiscountStudio",
                    "memberDiscountStudioPlus",
                  ].includes(k),
              ),
            ),
            ...(data.badges === undefined ? {} : { badges: data.badges }),
          })
          .where(eq(masterclasses.id, id));
        if (
          (chaptersMissing && data?.chapters) ||
          (structuredMissing &&
            (data?.highlights || data?.downloads || data?.softwares || data?.links))
        ) {
          return {
            success: true,
            warning:
              "Certaines données n'ont pas été sauvegardées (colonnes manquantes). Lancez `node scripts/add-masterclass-chapters.mjs` et `node scripts/add-masterclass-structured-fields.mjs`.",
          };
        }
      } else {
        throw e;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur update masterclass:", error);
    return { error: "Impossible de mettre à jour la formation." };
  }
}

export async function deleteMasterclass(id) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    // Delete user access records related to this masterclass
    await db.delete(userAccess).where(eq(userAccess.masterclassId, id));

    // Finally delete the masterclass
    await db.delete(masterclasses).where(eq(masterclasses.id, id));

    return { success: true };
  } catch (error) {
    console.error("Erreur suppression masterclass:", error);
    return { error: "Impossible de supprimer la formation et ses modules." };
  }
}

export async function createMasterclass(data) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    if (!data.title || !data.slug) {
      return { error: "Le titre et le slug sont obligatoires." };
    }

    let resolvedSortOrder = 0;
    if (data.sortOrder != null && Number.isFinite(Number(data.sortOrder))) {
      resolvedSortOrder = Number(data.sortOrder);
    } else {
      try {
        const last = await db
          .select({ sortOrder: masterclasses.sortOrder })
          .from(masterclasses)
          .orderBy(desc(masterclasses.sortOrder))
          .limit(1);
        resolvedSortOrder = Number(last?.[0]?.sortOrder ?? -1) + 1;
      } catch {
        resolvedSortOrder = 0;
      }
    }

    const baseValues = {
      id: crypto.randomUUID(),
      title: data.title,
      slug: data.slug,
      description: data.description,
      instructor: data.instructor || session.user.name || "Formateur",
      duration: data.duration,
      level: data.level,
      category: data.category,
      tags: data.tags || null,
      chapters: data.chapters || null,
      highlights: data.highlights || null,
      downloads: data.downloads || null,
      softwares: data.softwares || null,
      links: data.links || null,
      sortOrder: resolvedSortOrder,
      price: data.price || null,
      isPremium: data.isPremium !== undefined ? data.isPremium : !!data.price,
      stripeProductId: data.stripeProductId,
      creditCost: data.creditCost ?? null,
      accessModel: data.accessModel ?? "purchase_only",
      accessTier: data.accessTier ?? "none",
      memberDiscountStudio: data.memberDiscountStudio ?? null,
      memberDiscountStudioPlus: data.memberDiscountStudioPlus ?? null,
      videoUrl: data.videoUrl,
      imageUrl: data.imageUrl,
      createdAt: new Date(),
    };

    try {
      const published =
        data.isPublished === undefined || data.isPublished === null
          ? true
          : !!data.isPublished;
      await db.insert(masterclasses).values({
        ...baseValues,
        ...(data.badges === undefined ? {} : { badges: data.badges || null }),
        ...(published === undefined ? {} : { isPublished: published }),
      });
    } catch (e) {
      // Backward-compat: DB might not have the new columns yet.
      const msg = e?.message || String(e);
      const chaptersMissing =
        msg.includes("no such column: chapters") ||
        msg.includes("has no column named chapters") ||
        msg.includes("chapters");
      const structuredMissing =
        msg.includes("no such column: highlights") ||
        msg.includes("has no column named highlights") ||
        msg.includes("no such column: downloads") ||
        msg.includes("has no column named downloads") ||
        msg.includes("no such column: softwares") ||
        msg.includes("has no column named softwares") ||
        msg.includes("no such column: links") ||
        msg.includes("has no column named links") ||
        msg.includes("highlights") ||
        msg.includes("downloads") ||
        msg.includes("softwares") ||
        msg.includes("links");
      const sortOrderMissing =
        msg.includes("no such column: sort_order") ||
        msg.includes("has no column named sort_order") ||
        msg.includes("sort_order");
      if (
        msg.includes("no such column: badges") ||
        msg.includes("has no column named badges") ||
        msg.includes("no such column: tags") ||
        msg.includes("has no column named tags") ||
        msg.includes("no such column: access_model") ||
        msg.includes("has no column named access_model") ||
        msg.includes("no such column: access_tier") ||
        msg.includes("has no column named access_tier") ||
        chaptersMissing ||
        structuredMissing ||
        sortOrderMissing ||
        msg.includes("no such column: is_published") ||
        msg.includes("has no column named is_published") ||
        msg.includes("badges") ||
        msg.includes("tags") ||
        msg.includes("access_model") ||
        msg.includes("access_tier") ||
        msg.includes("member_discount_studio") ||
        msg.includes("member_discount_studio_plus") ||
        msg.includes("credit_cost") ||
        msg.includes("is_published")
      ) {
        await db
          .insert(masterclasses)
          .values(
            Object.fromEntries(
              Object.entries(baseValues).filter(
                ([k]) =>
                  ![
                    "chapters",
                    "highlights",
                    "downloads",
                    "softwares",
                    "links",
                    "creditCost",
                    "sortOrder",
                    "accessModel",
                    "accessTier",
                    "memberDiscountStudio",
                    "memberDiscountStudioPlus",
                  ].includes(k),
              ),
            ),
          );
        if (
          (chaptersMissing && data?.chapters) ||
          (structuredMissing &&
            (data?.highlights || data?.downloads || data?.softwares || data?.links))
        ) {
          return {
            success: true,
            warning:
              "Certaines données n'ont pas été sauvegardées (colonnes manquantes). Lancez `node scripts/add-masterclass-chapters.mjs` et `node scripts/add-masterclass-structured-fields.mjs`.",
          };
        }
      } else {
        throw e;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur creation masterclass:", error);
    if (error.message?.includes("UNIQUE constraint failed")) {
      return { error: "Ce slug est déjà utilisé par une autre formation." };
    }
    return { error: "Impossible de créer la formation." };
  }
}

export async function reorderMasterclasses(orderedMasterclassIds) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    if (!Array.isArray(orderedMasterclassIds) || !orderedMasterclassIds.length) {
      return { error: "Paramètres invalides." };
    }

    const uniqueIds = Array.from(
      new Set(orderedMasterclassIds.map((x) => String(x || "").trim()).filter(Boolean)),
    );
    if (uniqueIds.length !== orderedMasterclassIds.length) {
      return { error: "Liste de masterclasses invalide (doublons)." };
    }

    const existing = await db
      .select({ id: masterclasses.id })
      .from(masterclasses)
      .where(inArray(masterclasses.id, uniqueIds));

    if (existing.length !== uniqueIds.length) {
      return { error: "Certaines masterclasses sont introuvables." };
    }

    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < uniqueIds.length; i += 1) {
          await tx
            .update(masterclasses)
            .set({ sortOrder: i })
            .where(eq(masterclasses.id, uniqueIds[i]));
        }
      });
    } catch (e) {
      const msg = e?.message || String(e);
      if (
        msg.includes("no such column: sort_order") ||
        msg.includes("has no column named sort_order") ||
        msg.includes("sort_order")
      ) {
        return {
          error:
            "La colonne sort_order manque en base. Lance la migration formations avant de réordonner.",
        };
      }
      throw e;
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur reorder masterclasses:", error);
    return { error: "Impossible de réordonner les masterclasses." };
  }
}
