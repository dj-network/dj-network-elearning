import db from "@/libs/db";
import { masterclasses, purchases, userAccess } from "@/libs/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import VideoPlayer from "@/components/VideoPlayer";
import MasterclassStructuredSections from "@/components/MasterclassStructuredSections";
import Footer from "@/components/Footer";
import { getAccessState } from "@/libs/access/getAccessState";

export default async function MasterclassPlayerPage({ params }) {
  const { slug } = await params;
  const session = await auth();

  if (!session) redirect("/login");

  const mcBase = await db
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
      isPublished: masterclasses.isPublished,
    })
    .from(masterclasses)
    .where(eq(masterclasses.slug, slug))
    .limit(1);

  if (!mcBase[0]) notFound();
  let mc = mcBase[0];

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

  // Access check: Admin/Formateur OR Purchase OR granted access OR included subscription
  const isAdmin =
    session.user?.role === "admin" || session.user?.role === "formateur";

  if (!isAdmin) {
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

    const state = getAccessState({
      item: mc,
      itemType: "masterclass",
      isOwned: pRecord.length > 0 || accessRecord.length > 0,
      subscriptionPlan: session.user?.plan,
      creditsBalance: session.user?.creditsBalance ?? 0,
    });

    if (!state.canWatch) {
      redirect(`/masterclasses/${slug}`);
    }
  }

  return (
    <div 
      className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full relative mb-12"
    >
      {/* Main Content Area */}
      <div className="flex-1 p-4 lg:p-8 w-full">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-6 text-[11px] sm:text-sm overflow-hidden whitespace-nowrap">
          <Link
            href="/bibliotheque"
            className="hidden sm:inline text-slate-500 hover:text-primary transition-colors shrink-0"
          >
            Accueil
          </Link>
          <span className="hidden sm:inline text-slate-600 shrink-0">/</span>
          <Link
            href={`/bibliotheque?focus=masterclass:${mc.id}`}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-sm sm:text-lg">
              arrow_back
            </span>
            <span className="hidden sm:inline">Retour aux cours</span>
            <span className="sm:hidden text-[10px] font-bold uppercase tracking-widest ml-1">Retour</span>
          </Link>
          <span className="hidden sm:inline text-slate-600 shrink-0">/</span>
          <span className="hidden sm:inline text-primary font-medium truncate">
            {mc.title}
          </span>
        </nav>

        {/* Video Player Section */}
        <div className="relative w-full aspect-video rounded-xl bg-slate-950 shadow-2xl border border-slate-800 mb-8">
          {mc.videoUrl ? (
            <VideoPlayer
              videoUrl={mc.videoUrl}
              title={mc.title}
              chapters={(() => {
                try {
                  return JSON.parse(mc.chapters || "[]") || [];
                } catch {
                  return [];
                }
              })()}
            />
          ) : (
            <div className="relative aspect-video w-full h-full flex flex-col items-center justify-center bg-[#0f1e23]">
              <span className="material-symbols-outlined text-6xl text-slate-700">
                videocam_off
              </span>
              <p className="text-slate-500 font-medium font-bold">
                Aucune vidéo disponible pour cette masterclass.
              </p>
            </div>
          )}
        </div>

        <div className="max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-6 border-t border-slate-800/60">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              {mc.title}
            </h1>
            <p className="text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20 shrink-0 self-start md:self-auto">
              {mc.tag || "Masterclass Exclusive"}
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-black mb-4 flex items-center gap-3 text-left">
              <span className="material-symbols-outlined text-primary">
                description
              </span>
              À propos de cette masterclass
            </h2>
            <div className="text-slate-400 leading-relaxed whitespace-pre-line mb-12">
              {mc.description || "Aucune description fournie."}
            </div>
            <MasterclassStructuredSections mc={mc} />
          </div>
        </div>
      </div>

      {/* Sidebar: Details */}
      <aside className="w-full lg:w-[400px] border-l border-slate-800 bg-[#0f1e23] flex flex-col shrink-0">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-[#162a31]/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary font-medium">
                info
              </span>
              Détails de la Masterclass
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Instructeur</span>
                <span className="text-white text-sm font-bold">
                  {mc.instructor}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Durée</span>
                <span className="text-white text-sm font-bold">
                  {mc.duration || "--"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Niveau</span>
                <span className="text-primary text-sm font-bold">
                  {mc.level || "Tous niveaux"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#162a31]/30 border border-slate-800/50 rounded-xl">
            <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#0f1e23] border border-slate-700 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-lg">help</span>
              Poser une question
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
