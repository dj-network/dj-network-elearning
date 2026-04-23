"use server";

import db from "@/libs/db";
import { elearnings, courses, lessons, userAccess } from "@/libs/schema";
import { auth } from "@/auth";
import { desc, eq, inArray, sql } from "drizzle-orm";

export async function createElearning(data) {
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
          .select({ sortOrder: elearnings.sortOrder })
          .from(elearnings)
          .orderBy(desc(elearnings.sortOrder))
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
      sortOrder: resolvedSortOrder,
      price: null,
      isPremium: false,
      stripeProductId: null,
      accessModel: data.accessModel ?? "assigned",
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
      await db.insert(elearnings).values({
        ...baseValues,
        ...(data.badges === undefined ? {} : { badges: data.badges || null }),
        ...(published === undefined ? {} : { isPublished: published }),
      });
    } catch (e) {
      // Backward-compat: DB might not have the new columns yet.
      const msg = e?.message || String(e);
      if (
        msg.includes("no such column: sort_order") ||
        msg.includes("has no column named sort_order") ||
        msg.includes("no such column: badges") ||
        msg.includes("has no column named badges") ||
        msg.includes("no such column: tags") ||
        msg.includes("has no column named tags") ||
        msg.includes("no such column: access_model") ||
        msg.includes("has no column named access_model") ||
        msg.includes("no such column: access_tier") ||
        msg.includes("has no column named access_tier") ||
        msg.includes("no such column: is_published") ||
        msg.includes("has no column named is_published") ||
        msg.includes("badges") ||
        msg.includes("tags") ||
        msg.includes("access_model") ||
        msg.includes("access_tier") ||
        msg.includes("member_discount_studio") ||
        msg.includes("member_discount_studio_plus") ||
        msg.includes("is_published")
      ) {
        await db
          .insert(elearnings)
          .values(
            Object.fromEntries(
              Object.entries(baseValues).filter(
                ([k]) =>
                  ![
                    "sortOrder",
                    "accessModel",
                    "accessTier",
                    "memberDiscountStudio",
                    "memberDiscountStudioPlus",
                  ].includes(k),
              ),
            ),
          );
      } else {
        throw e;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur creation e-learning:", error);
    if (error.message?.includes("UNIQUE constraint failed")) {
      return { error: "Ce slug est déjà utilisé par une autre formation." };
    }
    return { error: "Impossible de créer la formation." };
  }
}

export async function updateElearning(id, data) {
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
      tags: data.tags,
      accessModel: data.accessModel ?? "assigned",
      accessTier: data.accessTier ?? "none",
      memberDiscountStudio: data.memberDiscountStudio ?? null,
      memberDiscountStudioPlus: data.memberDiscountStudioPlus ?? null,
      ...(data.sortOrder === undefined ? {} : { sortOrder: data.sortOrder }),
      stripeProductId: data.stripeProductId ?? null,
      videoUrl: data.videoUrl,
      imageUrl: data.imageUrl,
    };
    const published =
      data.isPublished === undefined || data.isPublished === null
        ? undefined
        : !!data.isPublished;

    try {
      await db
        .update(elearnings)
        .set({
          ...Object.fromEntries(
            Object.entries(baseSet).filter(([, value]) => value !== undefined),
          ),
          ...(data.badges === undefined ? {} : { badges: data.badges ?? null }),
          ...(published === undefined ? {} : { isPublished: published }),
        })
        .where(eq(elearnings.id, id));
    } catch (e) {
      // Backward-compat: DB might not have the new columns yet.
      const msg = e?.message || String(e);
      if (
        msg.includes("no such column: sort_order") ||
        msg.includes("has no column named sort_order") ||
        msg.includes("no such column: badges") ||
        msg.includes("has no column named badges") ||
        msg.includes("no such column: tags") ||
        msg.includes("has no column named tags") ||
        msg.includes("no such column: access_model") ||
        msg.includes("has no column named access_model") ||
        msg.includes("no such column: access_tier") ||
        msg.includes("has no column named access_tier") ||
        msg.includes("no such column: is_published") ||
        msg.includes("has no column named is_published") ||
        msg.includes("badges") ||
        msg.includes("tags") ||
        msg.includes("access_model") ||
        msg.includes("access_tier") ||
        msg.includes("member_discount_studio") ||
        msg.includes("member_discount_studio_plus") ||
        msg.includes("is_published")
      ) {
        await db
          .update(elearnings)
          .set(
            Object.fromEntries(
              Object.entries(baseSet).filter(
                ([k, value]) =>
                  value !== undefined &&
                  ![
                    "sortOrder",
                    "accessModel",
                    "accessTier",
                    "memberDiscountStudio",
                    "memberDiscountStudioPlus",
                  ].includes(k),
              ),
            ),
          )
          .where(eq(elearnings.id, id));
      } else {
        throw e;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur update e-learning:", error);
    return { error: "Impossible de mettre à jour la formation." };
  }
}

export async function deleteElearning(id) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    // 1. Get all courses related to this formation
    const elCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.elearningId, id));

    const courseIds = elCourses.map((c) => c.id);

    // 2. Delete lessons related to those courses
    if (courseIds.length > 0) {
      await db.delete(lessons).where(inArray(lessons.courseId, courseIds));
    }

    // 3. Delete courses
    await db.delete(courses).where(eq(courses.elearningId, id));

    // 4. Delete user access records related to this formation
    await db.delete(userAccess).where(eq(userAccess.elearningId, id));

    // 5. Finally delete the formation
    await db.delete(elearnings).where(eq(elearnings.id, id));

    return { success: true };
  } catch (error) {
    console.error("Erreur suppression e-learning:", error);
    return { error: "Impossible de supprimer la formation et ses modules." };
  }
}

export async function reorderElearnings(orderedElearningIds) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    if (!Array.isArray(orderedElearningIds) || !orderedElearningIds.length) {
      return { error: "Paramètres invalides." };
    }

    const uniqueIds = Array.from(
      new Set(orderedElearningIds.map((x) => String(x || "").trim()).filter(Boolean)),
    );
    if (uniqueIds.length !== orderedElearningIds.length) {
      return { error: "Liste de formations invalide (doublons)." };
    }

    const existing = await db
      .select({ id: elearnings.id })
      .from(elearnings)
      .where(inArray(elearnings.id, uniqueIds));

    if (existing.length !== uniqueIds.length) {
      return { error: "Certaines formations sont introuvables." };
    }

    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < uniqueIds.length; i += 1) {
          await tx
            .update(elearnings)
            .set({ sortOrder: i })
            .where(eq(elearnings.id, uniqueIds[i]));
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
    console.error("Erreur reorder formations:", error);
    return { error: "Impossible de réordonner les formations." };
  }
}

export async function createCourse(data) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    let nextSortOrder = 0;
    if (typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)) {
      nextSortOrder = data.sortOrder;
    } else {
      const [row] = await db
        .select({ maxSort: sql`max(${courses.sortOrder})`.mapWith(Number) })
        .from(courses)
        .where(eq(courses.elearningId, data.elearningId))
        .limit(1);
      const max = row?.maxSort;
      nextSortOrder = Number.isFinite(max) ? max + 1 : 0;
    }

    await db.insert(courses).values({
      id: crypto.randomUUID(),
      elearningId: data.elearningId,
      title: data.title,
      slug: data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      description: data.description || null,
      sortOrder: nextSortOrder,
      isRestricted: !!data.isRestricted,
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur création module:", error);
    return { error: "Impossible de créer le module." };
  }
}

export async function updateCourse(id, data) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    const set = {
      title: data.title,
      description: data.description,
      isRestricted: !!data.isRestricted,
    };
    if (typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)) {
      set.sortOrder = data.sortOrder;
    }

    await db.update(courses).set(set).where(eq(courses.id, id));

    return { success: true };
  } catch (error) {
    console.error("Erreur update module:", error);
    return { error: "Impossible de mettre à jour le module." };
  }
}

export async function deleteCourse(id) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    // Delete lessons first
    await db.delete(lessons).where(eq(lessons.courseId, id));
    await db.delete(courses).where(eq(courses.id, id));
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression module:", error);
    return { error: "Impossible de supprimer le module." };
  }
}

export async function reorderCourses(elearningId, orderedCourseIds) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    if (!elearningId || !Array.isArray(orderedCourseIds) || !orderedCourseIds.length) {
      return { error: "Paramètres invalides." };
    }

    const uniqueIds = Array.from(
      new Set(orderedCourseIds.map((x) => String(x || "").trim()).filter(Boolean)),
    );
    if (uniqueIds.length !== orderedCourseIds.length) {
      return { error: "Liste de modules invalide (doublons)." };
    }

    const existing = await db
      .select({ id: courses.id, elearningId: courses.elearningId })
      .from(courses)
      .where(inArray(courses.id, uniqueIds));
    if (existing.length !== uniqueIds.length) {
      return { error: "Certains modules sont introuvables." };
    }
    for (const row of existing) {
      if (row.elearningId !== elearningId) {
        return { error: "Certains modules n'appartiennent pas à cette formation." };
      }
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < uniqueIds.length; i += 1) {
        await tx
          .update(courses)
          .set({ sortOrder: i })
          .where(eq(courses.id, uniqueIds[i]));
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur reorder modules:", error);
    return { error: "Impossible de réordonner les modules." };
  }
}

export async function createLesson(data) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    let nextSortOrder = 0;
    if (typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)) {
      nextSortOrder = data.sortOrder;
    } else {
      const [row] = await db
        .select({ maxSort: sql`max(${lessons.sortOrder})`.mapWith(Number) })
        .from(lessons)
        .where(eq(lessons.courseId, data.courseId))
        .limit(1);
      const max = row?.maxSort;
      nextSortOrder = Number.isFinite(max) ? max + 1 : 0;
    }

    const baseValues = {
      id: crypto.randomUUID(),
      courseId: data.courseId,
      title: data.title,
      description: data.description || null,
      videoUrl: data.videoUrl || null,
      duration: data.duration || null,
      sortOrder: nextSortOrder,
      resources: data.resources || null,
    };

    let chaptersMissing = false;
    try {
      await db.insert(lessons).values({
        ...baseValues,
        chapters: data.chapters || null,
      });
    } catch (e) {
      // Backward-compat: DB might not have the `chapters` column yet.
      const msg = e?.message || String(e);
      if (
        msg.includes("no such column: chapters") ||
        msg.includes("has no column named chapters") ||
        msg.includes("chapters")
      ) {
        chaptersMissing = true;
        await db.insert(lessons).values(baseValues);
      } else {
        throw e;
      }
    }

    if (chaptersMissing && data?.chapters) {
      return {
        success: true,
        warning:
          "Chapitres non sauvegardés (colonne manquante). Lancez la migration `node scripts/add-lesson-chapters.mjs`.",
      };
    }
    return { success: true };
  } catch (error) {
    console.error("Erreur création leçon:", error);
    return { error: "Impossible de créer la leçon." };
  }
}

export async function updateLesson(id, data) {
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
      description: data.description,
      videoUrl: data.videoUrl,
      duration: data.duration,
      resources: data.resources,
    };
    if (typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)) {
      baseSet.sortOrder = data.sortOrder;
    }

    let chaptersMissing = false;
    try {
      await db
        .update(lessons)
        .set({
          ...baseSet,
          chapters: data.chapters,
        })
        .where(eq(lessons.id, id));
    } catch (e) {
      // Backward-compat: DB might not have the `chapters` column yet.
      const msg = e?.message || String(e);
      if (
        msg.includes("no such column: chapters") ||
        msg.includes("has no column named chapters") ||
        msg.includes("chapters")
      ) {
        chaptersMissing = true;
        await db.update(lessons).set(baseSet).where(eq(lessons.id, id));
      } else {
        throw e;
      }
    }

    if (chaptersMissing && data?.chapters) {
      return {
        success: true,
        warning:
          "Chapitres non sauvegardés (colonne manquante). Lancez la migration `node scripts/add-lesson-chapters.mjs`.",
      };
    }
    return { success: true };
  } catch (error) {
    console.error("Erreur update leçon:", error);
    return { error: "Impossible de mettre à jour la leçon." };
  }
}

export async function reorderLessons(courseId, orderedLessonIds) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    if (!courseId || !Array.isArray(orderedLessonIds) || !orderedLessonIds.length) {
      return { error: "Paramètres invalides." };
    }

    const uniqueIds = Array.from(
      new Set(orderedLessonIds.map((x) => String(x || "").trim()).filter(Boolean)),
    );
    if (uniqueIds.length !== orderedLessonIds.length) {
      return { error: "Liste de leçons invalide (doublons)." };
    }

    const existing = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(inArray(lessons.id, uniqueIds));
    const existingSet = new Set(existing.map((r) => r.id));
    if (existingSet.size !== uniqueIds.length) {
      return { error: "Certaines leçons sont introuvables." };
    }

    // Ensure all lessons belong to the course.
    const courseRows = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.courseId, courseId));
    const courseSet = new Set(courseRows.map((r) => r.id));
    for (const id of uniqueIds) {
      if (!courseSet.has(id)) {
        return { error: "Certaines leçons n'appartiennent pas à ce module." };
      }
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < uniqueIds.length; i += 1) {
        await tx
          .update(lessons)
          .set({ sortOrder: i })
          .where(eq(lessons.id, uniqueIds[i]));
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur reorder leçons:", error);
    return { error: "Impossible de réordonner les leçons." };
  }
}

export async function deleteLesson(id) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user?.role !== "admin" && session.user?.role !== "formateur")
    ) {
      return { error: "Non autorisé." };
    }

    await db.delete(lessons).where(eq(lessons.id, id));
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression leçon:", error);
    return { error: "Impossible de supprimer la leçon." };
  }
}
