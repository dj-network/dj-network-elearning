import db from "@/libs/db";
import { masterclasses, purchases, userAccess } from "@/libs/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import FilterChips from "@/components/FilterChips";
import MasterclassCard from "@/components/cards/MasterclassCard";

const filters = [
  "Tous",
  "Production",
  "Technique DJ",
  "Mixage & Mastering",
  "Business Musique",
];

function normalize(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[’‘`]/g, "'");
}

function parseTags(value) {
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
}

export default async function MasterclassesPage({ searchParams }) {
  const session = await auth();
  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "formateur";

  const { filter } = (await searchParams) || {};
  const activeFilter = filter ? decodeURIComponent(String(filter)) : "Tous";

  let mcList = [];
  try {
    mcList = await db.select().from(masterclasses);
  } catch {
    // Backward-compat if DB not migrated to include new columns (e.g. masterclasses.badges).
    mcList = await db
      .select({
        id: masterclasses.id,
        title: masterclasses.title,
        slug: masterclasses.slug,
        description: masterclasses.description,
        instructor: masterclasses.instructor,
        imageUrl: masterclasses.imageUrl,
        duration: masterclasses.duration,
        level: masterclasses.level,
        category: masterclasses.category,
        price: masterclasses.price,
        isPremium: masterclasses.isPremium,
        isFeatured: masterclasses.isFeatured,
        stripeProductId: masterclasses.stripeProductId,
        videoUrl: masterclasses.videoUrl,
        createdAt: masterclasses.createdAt,
      })
      .from(masterclasses);
  }

  mcList = mcList
    .filter((mc) => (isAdmin ? true : mc.isPublished !== false))
    .map((mc) => ({ ...mc, _tags: parseTags(mc.tags) }));

  const tagOptions = [
    "Tous",
    ...Array.from(new Set(mcList.flatMap((mc) => mc._tags))).sort((a, b) =>
      a.localeCompare(b, "fr", { sensitivity: "base" }),
    ),
  ];

  const filteredList =
    normalize(activeFilter) === "tous"
      ? mcList
      : mcList.filter((mc) => {
          const f = normalize(activeFilter);
          return (
            Array.isArray(mc._tags) && mc._tags.some((t) => normalize(t) === f)
          );
        });

  const ownedMasterclassIds = new Set();
  if (!isAdmin && session?.user?.id) {
    const userPurchases = await db
      .select({ masterclassId: purchases.masterclassId })
      .from(purchases)
      .where(eq(purchases.userId, session.user.id));
    for (const row of userPurchases) {
      if (row.masterclassId) ownedMasterclassIds.add(row.masterclassId);
    }

    const accessRows = await db
      .select({ masterclassId: userAccess.masterclassId })
      .from(userAccess)
      .where(eq(userAccess.userId, session.user.id));
    for (const row of accessRows) {
      if (row.masterclassId) ownedMasterclassIds.add(row.masterclassId);
    }
  }

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto w-full">
        {/* Title */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-100 mb-2">
              Masterclasses Premium
            </h2>
            <p className="text-slate-400 max-w-2xl">
              Perfectionnez votre art avec les meilleurs experts de
              l&apos;industrie musicale mondiale. Accès illimité pour les
              membres Premium.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isAdmin && !["studio", "studio_plus", "premium", "pro"].includes(session?.user?.plan || "") && (
              <button className="bg-primary hover:bg-primary/90 text-bg-dark px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">star</span>
                S&apos;abonner
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <FilterChips
          options={tagOptions.length > 1 ? tagOptions : filters}
          active={activeFilter}
        />

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((course) => (
            <MasterclassCard
              key={course.id}
              item={{
                ...course,
                isOwned: isAdmin || ownedMasterclassIds.has(course.id),
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
