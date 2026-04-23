import db from "@/libs/db";
import { elearnings } from "@/libs/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { purchases, userAccess } from "@/libs/schema";
import { and } from "drizzle-orm";
import { resolveMediaUrl } from "@/libs/media";
import BackButton from "@/components/BackButton";
import { getAccessState } from "@/libs/access/getAccessState";
import {
  OneTimeCheckoutButton,
} from "@/components/SubscriptionActionButtons";

export default async function ELearningSalesPage({ params }) {
  const session = await auth();
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  // Fetch the masterclass by slug
  let mcRecords = [];
  try {
    mcRecords = await db
      .select()
      .from(elearnings)
      .where(eq(elearnings.slug, decodedSlug))
      .limit(1);
  } catch {
    // Backward-compat if DB not migrated to include new columns (e.g. elearnings.badges).
    mcRecords = await db
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
      .from(elearnings)
      .where(eq(elearnings.slug, decodedSlug))
      .limit(1);
  }

  if (mcRecords.length === 0) {
    notFound();
  }

  const mc = mcRecords[0];

  // Check ownership
  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "formateur";

  const isPublished = mc.isPublished !== false;
  if (!isPublished && !isAdmin) {
    notFound();
  }

  // Check ownership
  let isOwned = isAdmin;
  if (!isOwned && session?.user?.id) {
    const pRecord = await db
      .select()
      .from(purchases)
      .where(
        and(eq(purchases.userId, session.user.id), eq(purchases.masterclassId, mc.id)),
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
            eq(userAccess.elearningId, mc.id),
          ),
        )
        .limit(1);
      isOwned = accessRecord.length > 0;
    }
  }

  const state = getAccessState({
    item: mc,
    itemType: "elearning",
    isAdmin,
    isOwned,
    subscriptionPlan: session?.user?.plan,
    creditsBalance: session?.user?.creditsBalance ?? 0,
  });

  return (
    <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <BackButton
          fallbackHref="/e-learning"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Retour
        </BackButton>
        <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">
          E-learning
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Hero Art & Details */}
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
                Formation E-learning
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

          {/* Description Section */}
          <section className="flex flex-col items-center sm:items-start">
            <h2 className="text-2xl font-black mb-4 text-white flex flex-row items-center text-left gap-3">
              <span className="material-symbols-outlined text-primary">
                info
              </span>
              À propos de cette formation
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap text-left w-full">
              {mc.description ||
                "Aucune description détaillée n'a été fournie pour cette formation."}
            </p>
          </section>

          {/* Features / Content Summary */}
          <section className="bg-[#162a31] p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-primary">
                list_alt
              </span>
              Inclus dans cette formation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Durée</p>
                  <p className="text-sm font-bold text-white">
                    {mc.duration || "Non spécifié"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                  <span className="material-symbols-outlined">
                    signal_cellular_alt
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Niveau</p>
                  <p className="text-sm font-bold text-white">
                    {mc.level || "Tous niveaux"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                  <span className="material-symbols-outlined">
                    ondemand_video
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Accès</p>
                  <p className="text-sm font-bold text-white">Illimité à vie</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    Certificat
                  </p>
                  <p className="text-sm font-bold text-white">Inclus</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Pricing & Actions */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="bg-[#162a31] p-8 rounded-xl shadow-xl border border-slate-800 flex flex-col gap-6 sticky top-8">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">
                {state.canWatch
                  ? "Formation acquise"
                  : `Prix ${mc.price === null || mc.price === 0 ? "Gratuit" : ""}`}
              </p>
              <div className="flex items-baseline gap-2">
                <h2
                  className={`text-4xl font-black ${
                    state.status === "purchase_required" || state.status === "member_discount"
                      ? "text-white"
                      : "text-green-400"
                  }`}
                >
                  {state.priceLabel}
                </h2>
              </div>
              <p className="text-slate-500 text-xs mt-2">
                {state.canWatch
                  ? "Accès illimité disponible"
                  : "Paiement unique • Accès immédiat"}
              </p>
            </div>

            {state.canWatch ? (
              <Link
                href={`/bibliotheque/e-learning/${mc.slug}`}
                className="w-full bg-green-500 hover:bg-green-400 text-[#0f1e23] font-black py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-green-500/20 uppercase tracking-wider text-sm"
              >
                <span className="material-symbols-outlined">play_circle</span>
                Regarder la formation
              </Link>
            ) : (
              <OneTimeCheckoutButton
                itemType="elearning"
                itemId={mc.id}
                className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined">school</span>
                {isAdmin
                  ? "Accéder à la formation"
                  : state.status === "member_discount"
                    ? "Acheter au tarif membre"
                    : !mc.price || mc.price === 0
                    ? "Accéder à la formation"
                    : "Acheter la formation"}
              </OneTimeCheckoutButton>
            )}

            <div className="border-t border-slate-800 pt-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
                Ce que vous allez apprendre
              </h4>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-slate-300">
                  <span className="material-symbols-outlined text-primary text-xl">
                    check_circle
                  </span>
                  <span>
                    Accès direct aux techniques des meilleurs professionnels.
                  </span>
                </li>
                <li className="flex gap-3 text-sm text-slate-300">
                  <span className="material-symbols-outlined text-primary text-xl">
                    check_circle
                  </span>
                  <span>
                    Apprenez à votre rythme, où et quand vous le souhaitez.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
