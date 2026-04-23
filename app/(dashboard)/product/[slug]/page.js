import db from "@/libs/db";
import { products, categories } from "@/libs/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { purchases, userAccess } from "@/libs/schema";
import { and } from "drizzle-orm";
import Link from "next/link";
import { resolveMediaUrl } from "@/libs/media";
import BackButton from "@/components/BackButton";
import ProductAudioPreview from "@/components/ProductAudioPreview";
import { getAccessState } from "@/libs/access/getAccessState";
import {
  OneTimeCheckoutButton,
  RedeemCreditButton,
} from "@/components/SubscriptionActionButtons";

export default async function ProductPage({ params }) {
  const session = await auth();
  const { slug } = await params;

  const decodedSlug = decodeURIComponent(slug);

  // 1. Fetch the product by slug
  let productRecords = [];
  try {
    productRecords = await db
      .select()
      .from(products)
      .where(eq(products.slug, decodedSlug))
      .limit(1);
  } catch {
    // Backward-compat if DB not migrated to include new columns (e.g. products.is_published).
    productRecords = await db
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
        accessModel: products.accessModel,
        accessTier: products.accessTier,
        memberDiscountStudio: products.memberDiscountStudio,
        memberDiscountStudioPlus: products.memberDiscountStudioPlus,
        creditCost: products.creditCost,
        compatibility: products.compatibility,
        highlights: products.highlights,
        packContents: products.packContents,
        tags: products.tags,
        version: products.version,
        author: products.author,
        isFeatured: products.isFeatured,
        stripeProductId: products.stripeProductId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.slug, decodedSlug))
      .limit(1);
  }

  if (productRecords.length === 0) {
    notFound();
  }

  const p = productRecords[0];

  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "formateur";
  const isPublished = p.isPublished !== false;
  if (!isPublished && !isAdmin) {
    notFound();
  }

  // 2. We can optionally fetch the category to display its name
  let categoryName = "Produit";
  if (p.categoryId) {
    const catRec = await db
      .select()
      .from(categories)
      .where(eq(categories.id, p.categoryId))
      .limit(1);
    if (catRec.length > 0) {
      categoryName = catRec[0].name;
    }
  }

  // Parse compatibility and tags JSON if needed
  let parsedTags = [];
  try {
    parsedTags = JSON.parse(p.tags) || [];
  } catch (e) {}

  let parsedCompatibility = [];
  try {
    parsedCompatibility = JSON.parse(p.compatibility) || [];
  } catch (e) {}

  let parsedHighlights = [];
  try {
    parsedHighlights = JSON.parse(p.highlights) || [];
  } catch (e) {}

  let parsedPackContents = [];
  try {
    parsedPackContents = JSON.parse(p.packContents) || [];
  } catch (e) {}

  const productHighlights =
    Array.isArray(parsedHighlights) && parsedHighlights.length > 0
      ? parsedHighlights
      : [
          "Produit prêt à l'emploi pour accélérer votre workflow.",
          "Contenu organisé pour une utilisation immédiate en studio.",
        ];

  const packContents =
    Array.isArray(parsedPackContents) && parsedPackContents.length > 0
      ? parsedPackContents
      : [
          { label: "Contenu", value: "-" },
          { label: "Fichiers", value: "-" },
          { label: "Compatibilité", value: parsedCompatibility[0] || "-" },
          { label: "Taille totale", value: p.fileSize || "-" },
        ];

  // 3. Check ownership
  let isOwned = false;
  if (isAdmin) {
    isOwned = true;
  } else if (session?.user?.id) {
    const pRecord = await db
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.userId, session.user.id),
          eq(purchases.productId, p.id),
        ),
      )
      .limit(1);
    if (pRecord.length > 0) {
      isOwned = true;
    } else {
      const accessRecord = await db
        .select()
        .from(userAccess)
        .where(
          and(
            eq(userAccess.userId, session.user.id),
            eq(userAccess.productId, p.id),
          ),
        )
        .limit(1);
      isOwned = accessRecord.length > 0;
    }
  }

  const isFree = p.price == null;
  const downloadUrl = p.fileUrl ? resolveMediaUrl(p.fileUrl) : null;
  const state = getAccessState({
    item: p,
    itemType: "product",
    isAdmin,
    isOwned,
    subscriptionPlan: session?.user?.plan,
    creditsBalance: session?.user?.creditsBalance ?? 0,
  });
  const canDownload = state.canDownload && !!downloadUrl;

  return (
    <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <BackButton
          fallbackHref="/production"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Retour
        </BackButton>
        <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">
          {categoryName}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Hero Art & Details */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            <img
              alt={p.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              src={resolveMediaUrl(p.imageUrl) || "/logo.png"}
            />
            <div className="absolute bottom-6 left-6 z-20">
              <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight mb-1">
                {p.title}
              </h1>
              <p className="text-primary font-medium">
                Par {p.author || "DJ Network"}
              </p>
            </div>
          </div>

          {p.demoAudioUrl ? (
            <ProductAudioPreview audioUrl={resolveMediaUrl(p.demoAudioUrl)} />
          ) : null}

          {/* Content Section */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-primary">
                library_music
              </span>
              Contenu du Pack
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {packContents.map((item, idx) => (
                <div
                  key={`${item.label}-${idx}`}
                  className="bg-[#162a31] p-4 rounded-lg border border-slate-800 text-center"
                >
                  <p className="text-2xl font-black text-primary">
                    {item.value || "-"}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    {item.label || "Contenu"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Purchase & Info */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          {/* Pricing Card */}
          <div className="bg-[#162a31] p-8 rounded-xl shadow-xl border border-slate-800 flex flex-col gap-6 sticky top-8">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">
                {state.status === "owned" || state.status === "included_subscription"
                  ? "Produit acquis"
                  : state.hasDualPurchaseOptions
                    ? "Prix unique ou crédits"
                    : `Prix ${p.price === null ? "Gratuit" : ""}`}
              </p>
              <div className="flex flex-col gap-1">
                <h2
                  className={`text-4xl font-black ${
                    state.status === "purchase_required" || state.status === "member_discount"
                      ? "text-white"
                      : state.hasDualPurchaseOptions
                        ? "text-white"
                        : "text-green-400"
                  }`}
                >
                  {state.hasDualPurchaseOptions ? state.purchasePriceLabel : state.priceLabel}
                </h2>
                {state.hasDualPurchaseOptions ? (
                  <p className="text-emerald-400 text-lg font-black">
                    ou {state.creditPriceLabel}
                  </p>
                ) : null}
              </div>
              <p className="text-slate-500 text-xs mt-2">
                {state.status === "owned" || state.status === "included_subscription"
                  ? "Téléchargeable depuis cette page"
                  : state.status === "free"
                    ? "Téléchargement gratuit"
                    : state.hasDualPurchaseOptions
                      ? "Choisissez entre l'achat unique ou le déblocage avec vos crédits."
                      : state.status === "subscription_locked"
                        ? "Passez à Studio / Studio+ ou attendez le reset mensuel"
                        : "TVA incluse • Téléchargement immédiat après paiement"}
              </p>
            </div>

            {canDownload ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined">download</span>
                Télécharger
              </a>
            ) : state.missingFile ? (
              <button
                disabled
                className="w-full bg-slate-700 text-slate-300 font-bold py-4 rounded-lg flex items-center justify-center gap-3 opacity-70 cursor-not-allowed"
              >
                <span className="material-symbols-outlined">block</span>
                Fichier manquant
              </button>
            ) : state.hasDualPurchaseOptions ? (
              <div className="flex flex-col gap-3">
                <OneTimeCheckoutButton
                  itemType="product"
                  itemId={p.id}
                  className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  {state.status === "member_discount" ? "Acheter au tarif membre" : "Acheter"}
                </OneTimeCheckoutButton>
                {state.canUnlockWithCredit ? (
                  <RedeemCreditButton
                    itemType="product"
                    itemId={p.id}
                    className="w-full bg-primary/15 border border-primary/30 text-primary font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all"
                  >
                    <span className="material-symbols-outlined">lock_open</span>
                    {state.ctaLabel}
                  </RedeemCreditButton>
                ) : (
                  <button
                    disabled
                    className="w-full bg-slate-700 text-slate-300 font-bold py-4 rounded-lg flex items-center justify-center gap-3 opacity-70 cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined">token</span>
                    Plus de crédits
                  </button>
                )}
              </div>
            ) : state.status === "subscription_locked" ? (
              <Link
                href="/abonnement"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all"
              >
                <span className="material-symbols-outlined">workspace_premium</span>
                Voir les abonnements
              </Link>
            ) : (
              <OneTimeCheckoutButton
                itemType="product"
                itemId={p.id}
                className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined">shopping_cart</span>
                {state.status === "member_discount" ? "Acheter au tarif membre" : "Acheter"}
              </OneTimeCheckoutButton>
            )}

            <div className="border-t border-slate-800 pt-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
                Points forts
              </h4>
              <ul className="space-y-3">
                {productHighlights.map((item, idx) => (
                  <li
                    key={`${item}-${idx}`}
                    className="flex gap-3 text-sm text-slate-300"
                  >
                    <span className="material-symbols-outlined text-primary text-xl">
                      check_circle
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-800 pt-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
                Compatibilité
              </h4>
              <div className="flex items-center gap-6 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all flex-wrap">
                {parsedCompatibility.map((comp) => (
                  <div key={comp} className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-2xl text-white">
                      verified
                    </span>
                    <span className="text-[10px] font-bold text-white uppercase">
                      {comp}
                    </span>
                  </div>
                ))}
                {parsedCompatibility.length === 0 && (
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-2xl text-white">
                      waves
                    </span>
                    <span className="text-[10px] font-bold text-white uppercase">
                      WAV / AIFF
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description Detail Section */}
      <section className="mt-16 py-12 border-t border-slate-800 flex flex-col items-center sm:items-start">
        <div className="max-w-3xl flex flex-col items-center sm:items-start w-full">
          <h2 className="text-2xl font-black mb-6 text-white text-left">
            À propos de ce produit
          </h2>
          <p className="text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap text-left w-full">
            {p.description || "Aucune description fournie."}
          </p>
        </div>
      </section>
    </main>
  );
}
