import db from "@/libs/db";
import { elearnings, purchases, userAccess } from "@/libs/schema";
import { eq } from "drizzle-orm";
import FilterChips from "@/components/FilterChips";
import ElearningCard from "@/components/cards/ElearningCard";

import { auth } from "@/auth";

export default async function LearningPage({ searchParams }) {
  const session = await auth();
  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "formateur";
  const { filter } = (await searchParams) || {};
  const activeFilter = filter ? decodeURIComponent(String(filter)) : "Tous";

  const normalize = (v) =>
    String(v || "")
      .trim()
      .toLowerCase()
      .replace(/[’‘`]/g, "'");

  const parseTags = (value) => {
    if (!value || typeof value !== "string") return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          return arr.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch {}
    }
    return trimmed
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };
  let courses = [];
  try {
    courses = await db.select().from(elearnings);
  } catch {
    // Backward-compat if DB not migrated to include new columns (e.g. elearnings.badges).
    courses = await db
      .select({
        id: elearnings.id,
        title: elearnings.title,
        slug: elearnings.slug,
        description: elearnings.description,
        instructor: elearnings.instructor,
        imageUrl: elearnings.imageUrl,
        duration: elearnings.duration,
        level: elearnings.level,
        category: elearnings.category,
        price: elearnings.price,
        isPremium: elearnings.isPremium,
        isFeatured: elearnings.isFeatured,
        stripeProductId: elearnings.stripeProductId,
        videoUrl: elearnings.videoUrl,
        createdAt: elearnings.createdAt,
      })
      .from(elearnings);
  }

  courses = courses
    .filter((c) => (isAdmin ? true : c.isPublished !== false))
    .map((c) => ({
      ...c,
      _tags: parseTags(c.tags),
    }));

  const tagOptions = [
    "Tous",
    ...Array.from(new Set(courses.flatMap((c) => c._tags))).sort((a, b) =>
      a.localeCompare(b, "fr", { sensitivity: "base" }),
    ),
  ];

  const fallbackOptions = [
    "Tous",
    "M.A.O",
    "Technique",
    "Pop / Variété",
    "Tech DJ",
    "Théorie Musicale",
    "Business",
  ];

  const ownedElearningIds = new Set();
  if (!isAdmin && session?.user?.id) {
    const userPurchases = await db
      .select({ masterclassId: purchases.masterclassId })
      .from(purchases)
      .where(eq(purchases.userId, session.user.id));
    for (const row of userPurchases) {
      if (row.masterclassId) ownedElearningIds.add(row.masterclassId);
    }

    const accessRows = await db
      .select({ elearningId: userAccess.elearningId })
      .from(userAccess)
      .where(eq(userAccess.userId, session.user.id));
    for (const row of accessRows) {
      if (row.elearningId) ownedElearningIds.add(row.elearningId);
    }
  }

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary text-3xl">
                school
              </span>
              <h1 className="text-3xl font-black text-white">E-learning</h1>
            </div>
            <p className="text-slate-400 max-w-2xl">
              Découvrez notre catalogue de formations en ligne. Devenez un
              expert en production, mixage technique DJ, theorie musicale et
              naviguez dans l&apos;industrie.
            </p>
          </div>
        </div>

        <FilterChips
          options={tagOptions.length > 1 ? tagOptions : fallbackOptions}
          active={activeFilter}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses
            .filter((p) => {
              if (!activeFilter || normalize(activeFilter) === "tous") return true;
              return (
                Array.isArray(p._tags) &&
                p._tags.some((t) => normalize(t) === normalize(activeFilter))
              );
            })
            .map((p) => (
              <ElearningCard
                key={p.id}
                item={{
                  ...p,
                  isOwned: isAdmin || (session?.user?.id && ownedElearningIds.has(p.id)),
                  isAdmin,
                }}
                subscriptionPlan={session?.user?.plan}
                creditsBalance={session?.user?.creditsBalance}
              />
            ))}
        </div>

        {/* Help CTA */}
        <div className="mt-16 p-8 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="size-14 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-3xl">
                help_outline
              </span>
            </div>
            <div>
              <h4 className="text-xl font-bold">
                Besoin d&apos;aide pour choisir ?
              </h4>
              <p className="text-slate-400">
                Contactez nos conseillers pédagogiques pour un plan
                personnalisé.
              </p>
            </div>
          </div>
          <button className="bg-slate-800 px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors">
            Discuter avec un expert
          </button>
        </div>
      </div>
    </>
  );
}
