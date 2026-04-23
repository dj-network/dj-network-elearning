import db from "@/libs/db";
import { products, categories, purchases, userAccess } from "@/libs/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import FilterChips from "@/components/FilterChips";
import ProductCard from "@/components/cards/ProductCard";

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

export default async function ProductionPage({ searchParams }) {
  const { filter } = (await searchParams) || {};
  const activeFilter = filter ? decodeURIComponent(String(filter)) : "Tous";

  const session = await auth();
  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "formateur";

  const categoryRec = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, "production"))
    .limit(1);
  const categoryId = categoryRec[0]?.id;
  let dbProducts = [];
  if (categoryId) {
    try {
      dbProducts = await db
        .select()
        .from(products)
        .where(eq(products.categoryId, categoryId));
    } catch {
      // Backward-compat if DB not migrated to include new columns (e.g. products.is_published).
      dbProducts = await db
        .select({
          id: products.id,
          title: products.title,
          slug: products.slug,
          description: products.description,
          categoryId: products.categoryId,
          imageUrl: products.imageUrl,
          demoAudioUrl: products.demoAudioUrl,
          fileUrl: products.fileUrl,
          fileSize: products.fileSize,
          price: products.price,
          currency: products.currency,
          compatibility: products.compatibility,
          tags: products.tags,
          version: products.version,
          author: products.author,
          isFeatured: products.isFeatured,
          stripeProductId: products.stripeProductId,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(eq(products.categoryId, categoryId));
    }
  }

  const ownedProductIds = new Set();
  if (!isAdmin && session?.user?.id) {
    const userPurchases = await db
      .select({ productId: purchases.productId })
      .from(purchases)
      .where(eq(purchases.userId, session.user.id));
    for (const row of userPurchases) {
      if (row.productId) ownedProductIds.add(row.productId);
    }

    const accessRows = await db
      .select({ productId: userAccess.productId })
      .from(userAccess)
      .where(eq(userAccess.userId, session.user.id));
    for (const row of accessRows) {
      if (row.productId) ownedProductIds.add(row.productId);
    }
  }

  const formatProducts = dbProducts
    .filter((p) => (isAdmin ? true : p.isPublished !== false))
    .map((p) => {
    const tags = parseTags(p.tags);
    const tag = tags[0] || "";
    const isOwned = isAdmin || ownedProductIds.has(p.id);
    return { ...p, tags, tag, isOwned };
  });

  const tagOptions = [
    "Tous",
    ...Array.from(
      new Set(
        formatProducts.flatMap((p) => (Array.isArray(p.tags) ? p.tags : [])),
      ),
    ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
  ];

  const filteredProducts =
    normalize(activeFilter) === "tous"
      ? formatProducts
      : formatProducts.filter(
          (p) =>
            Array.isArray(p.tags) &&
            p.tags.some((t) => normalize(t) === normalize(activeFilter)),
        );

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary text-3xl">
                settings_input_component
              </span>
              <h1 className="text-3xl font-black text-white">
                Production & DAW
              </h1>
            </div>
            <p className="text-slate-400 max-w-2xl">
              Templates de sessions, racks d&apos;effets, presets de
              synthétiseurs. Tout ce dont vous avez besoin pour booster votre
              workflow de production.
            </p>
          </div>
        </div>

        <FilterChips options={tagOptions} active={activeFilter} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              subscriptionPlan={session?.user?.plan}
              creditsBalance={session?.user?.creditsBalance}
            />
          ))}
        </div>
      </div>
    </>
  );
}
