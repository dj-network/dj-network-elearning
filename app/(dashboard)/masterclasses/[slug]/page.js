import db from "@/libs/db";
import { masterclasses } from "@/libs/schema";
import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { purchases, userAccess } from "@/libs/schema";
import { resolveMediaUrl } from "@/libs/media";
import BackButton from "@/components/BackButton";
import MasterclassStructuredSections from "@/components/MasterclassStructuredSections";
import { getAccessState } from "@/libs/access/getAccessState";
import {
  OneTimeCheckoutButton,
  RedeemCreditButton,
} from "@/components/SubscriptionActionButtons";

export default async function MasterclassSalesPage({ params }) {
  const session = await auth();
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  let mcRecords = [];
  mcRecords = await db
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
      accessModel: masterclasses.accessModel,
      accessTier: masterclasses.accessTier,
      memberDiscountStudio: masterclasses.memberDiscountStudio,
      memberDiscountStudioPlus: masterclasses.memberDiscountStudioPlus,
      price: masterclasses.price,
      creditCost: masterclasses.creditCost,
      isPremium: masterclasses.isPremium,
      isFeatured: masterclasses.isFeatured,
      stripeProductId: masterclasses.stripeProductId,
      videoUrl: masterclasses.videoUrl,
      createdAt: masterclasses.createdAt,
      isPublished: masterclasses.isPublished,
    })
    .from(masterclasses)
    .where(eq(masterclasses.slug, decodedSlug))
    .limit(1);

  if (mcRecords.length === 0) notFound();
  let mc = mcRecords[0];

  // Optional fields (may not exist yet in DB)
  try {
    const extra = await db
      .select({
        tags: masterclasses.tags,
        chapters: masterclasses.chapters,
        highlights: masterclasses.highlights,
        downloads: masterclasses.downloads,
        softwares: masterclasses.softwares,
        links: masterclasses.links,
      })
      .from(masterclasses)
      .where(eq(masterclasses.id, mc.id))
      .limit(1);
    if (extra[0]) mc = { ...mc, ...extra[0] };
  } catch {
    // ignore
  }

  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "formateur";

  const isPublished = mc.isPublished !== false;
  if (!isPublished && !isAdmin) {
    notFound();
  }

  let isOwned = isAdmin;
  if (!isOwned && session?.user?.id) {
    const pRecord = await db
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.userId, session.user.id),
          eq(purchases.masterclassId, mc.id),
        ),
      )
      .limit(1);
    isOwned = pRecord.length > 0;
    if (!isOwned) {
      const accessRecord = await db
        .select()
        .from(userAccess)
        .where(
          and(
            eq(userAccess.userId, session.user.id),
            eq(userAccess.masterclassId, mc.id),
          ),
        )
        .limit(1);
      isOwned = accessRecord.length > 0;
    }
  }

  const state = getAccessState({
    item: mc,
    itemType: "masterclass",
    isAdmin,
    isOwned,
    subscriptionPlan: session?.user?.plan,
    creditsBalance: session?.user?.creditsBalance ?? 0,
  });

  // Allow admins to preview the sales page even if they can access the library.
  if (isOwned && !isAdmin) {
    redirect(`/bibliotheque/masterclass/${mc.slug}`);
  }

  return (
    <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <BackButton
          fallbackHref="/masterclasses"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Retour
        </BackButton>
        <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">
          Masterclass
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 flex flex-col gap-8">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            <img
              alt={mc.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              src={
                resolveMediaUrl(mc.imageUrl) ||
                "https://images.unsplash.com/photo-1598282361139-44585da81df7?auto=format&fit=crop&q=80"
              }
            />
            <div className="absolute top-6 left-6 z-20">
              <span className="bg-[#0f1e23]/80 backdrop-blur-sm text-primary text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded">
                Masterclass
              </span>
            </div>
            <div className="absolute bottom-6 left-6 z-20">
              <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight mb-1">
                {mc.title}
              </h1>
              <p className="text-primary font-medium">
                Par {mc.instructor || "DJ Network"}
              </p>
            </div>
          </div>

          <section className="flex flex-col items-center sm:items-start">
            <h2 className="text-2xl font-black mb-4 text-white flex flex-row items-center text-left gap-3">
              <span className="material-symbols-outlined text-primary">
                info
              </span>
              A propos de cette masterclass
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap text-left w-full">
              {mc.description ||
                "Aucune description détaillée n'a été fournie pour cette masterclass."}
            </p>
            <div className="w-full">
              <MasterclassStructuredSections mc={mc} hideDownloads={true} />
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="bg-[#162a31] p-8 rounded-xl shadow-xl border border-slate-800 flex flex-col gap-6 sticky top-8">
            {state.canWatch ? (
              <>
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-1">
                    Statut
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black text-emerald-400">{state.priceLabel}</h2>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    Accès illimité disponible
                  </p>
                </div>

                <Link
                  href={`/bibliotheque/masterclass/${mc.slug}`}
                  className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  Regarder la masterclass
                </Link>
              </>
            ) : state.hasDualPurchaseOptions ? (
              <>
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-1">Prix unique ou crédits</p>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-5xl font-black text-white">{state.purchasePriceLabel}</h2>
                    <p className="text-emerald-400 text-xl font-black">ou {state.creditPriceLabel}</p>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    Choisissez entre l&apos;achat unique ou le déblocage avec vos crédits.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <OneTimeCheckoutButton
                    itemType="masterclass"
                    itemId={mc.id}
                    className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                  >
                    <span className="material-symbols-outlined">
                      shopping_cart
                    </span>
                    {state.status === "member_discount"
                      ? "Acheter au tarif membre"
                      : "Acheter la masterclass"}
                  </OneTimeCheckoutButton>
                  {state.canUnlockWithCredit ? (
                    <RedeemCreditButton
                      itemType="masterclass"
                      itemId={mc.id}
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
              </>
            ) : (
              <>
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-1">
                    Prix {mc.price === null || mc.price === 0 ? "Gratuit" : ""}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-5xl font-black text-white">{state.priceLabel}</h2>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    Paiement unique • Acces immediat
                  </p>
                </div>

                <OneTimeCheckoutButton
                  itemType="masterclass"
                  itemId={mc.id}
                  className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined">
                    shopping_cart
                  </span>
                  {state.status === "member_discount"
                    ? "Acheter au tarif membre"
                    : "Acheter la masterclass"}
                </OneTimeCheckoutButton>
              </>
            )}

            <div className="border-t border-slate-800 pt-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
                Inclus
              </h4>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-slate-300">
                  <span className="material-symbols-outlined text-primary text-xl">
                    check_circle
                  </span>
                  <span>Accès illimité à vie.</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-300">
                  <span className="material-symbols-outlined text-primary text-xl">
                    check_circle
                  </span>
                  <span>Regardez quand vous voulez.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
