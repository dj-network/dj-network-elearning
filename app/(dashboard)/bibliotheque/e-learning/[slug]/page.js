import db from "@/libs/db";
import { elearnings, courses, lessons } from "@/libs/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import VideoPlayer from "@/components/VideoPlayer";
import Footer from "@/components/Footer";
import { auth } from "@/auth";
import { purchases, userAccess } from "@/libs/schema";
import { and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getAccessState } from "@/libs/access/getAccessState";

export default async function LMSCourseView({ params, searchParams }) {
  const { slug } = await params;
  const { lessonId } = await searchParams;
  const session = await auth();

  if (!session) {
    redirect("/login?callbackUrl=/bibliotheque/e-learning/" + slug);
  }

  // 1. Fetch the masterclass (course root) by slug
  const decodedSlug = decodeURIComponent(slug);

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

  // Ownership Check
  const isAdmin =
    session.user?.role === "admin" || session.user?.role === "formateur";
  if (!isAdmin) {
    const pRecord = await db
      .select()
      .from(purchases)
      .where(
        and(eq(purchases.userId, session.user.id), eq(purchases.masterclassId, mc.id)),
      )
      .limit(1);

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

    const state = getAccessState({
      item: mc,
      itemType: "elearning",
      isOwned: pRecord.length > 0 || accessRecord.length > 0,
      subscriptionPlan: session.user?.plan,
      creditsBalance: session.user?.creditsBalance ?? 0,
    });

    if (!state.canWatch) {
      redirect(`/e-learning/${mc.slug}`);
    }
  }

  // 2. Fetch all modules (courses table) for this masterclass
  const modules = await db
    .select()
    .from(courses)
    .where(eq(courses.elearningId, mc.id))
    .orderBy(asc(courses.sortOrder));

  // 3. Fetch all lessons for all modules
  const allLessons = [];
  for (const mod of modules) {
    // Prefer selecting chapters when available; fallback if DB isn't migrated yet.
    let modLessons = [];
    try {
      modLessons = await db
        .select({
          id: lessons.id,
          courseId: lessons.courseId,
          title: lessons.title,
          description: lessons.description,
          videoUrl: lessons.videoUrl,
          chapters: lessons.chapters,
          duration: lessons.duration,
          sortOrder: lessons.sortOrder,
          resources: lessons.resources,
        })
        .from(lessons)
        .where(eq(lessons.courseId, mod.id))
        .orderBy(asc(lessons.sortOrder));
    } catch {
      modLessons = await db
        .select({
          id: lessons.id,
          courseId: lessons.courseId,
          title: lessons.title,
          description: lessons.description,
          videoUrl: lessons.videoUrl,
          duration: lessons.duration,
          sortOrder: lessons.sortOrder,
          resources: lessons.resources,
        })
        .from(lessons)
        .where(eq(lessons.courseId, mod.id))
        .orderBy(asc(lessons.sortOrder));
    }

    // Attach lessons to module
    mod.lessons = modLessons;
    allLessons.push(...modLessons);
  }

  // Determine current lesson
  let currentLesson = allLessons.length > 0 ? allLessons[0] : null;
  if (lessonId && allLessons.length > 0) {
    const found = allLessons.find((l) => l.id === lessonId);
    if (found) currentLesson = found;
  }

  // Mock progress calculation
  const totalLessons = allLessons.length || 1;
  const completedLessons = 0; // Mock
  const progressPercent = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div 
      className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full relative mb-12"
    >
      {/* Main Content Area */}
      <div className="flex-1 p-4 lg:p-8 w-full">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-6 text-[11px] sm:text-sm overflow-hidden whitespace-nowrap">
          <Link
            href="/e-learning"
            className="hidden sm:inline text-slate-500 hover:text-primary transition-colors shrink-0"
          >
            Accueil
          </Link>
          <span className="hidden sm:inline text-slate-600 shrink-0">/</span>
          <Link
            href={`/bibliotheque?focus=elearning:${mc.id}`}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-sm sm:text-lg">
              arrow_back
            </span>
            <span className="hidden sm:inline">Retour aux cours</span>
            <span className="sm:hidden text-[10px] font-bold uppercase tracking-widest ml-1">Retour</span>
          </Link>
          <span className="text-slate-600 shrink-0">/</span>
          <span className="text-primary font-medium truncate">
            {mc.title}
          </span>
        </nav>

        {/* Video Player */}
        <div className="relative w-full aspect-video rounded-xl bg-slate-950 shadow-2xl border border-slate-800 mb-8">
          {currentLesson?.videoUrl ? (
            <VideoPlayer
              videoUrl={currentLesson.videoUrl}
              chapters={(() => {
                try {
                  return JSON.parse(currentLesson.chapters || "[]") || [];
                } catch {
                  return [];
                }
              })()}
            />
          ) : (
            <div className="relative aspect-video w-full h-full flex flex-col items-center justify-center bg-[#0f1e23]">
              <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">
                videocam_off
              </span>
              <p className="text-slate-400 font-medium">
                Aucune vidéo disponible pour cette leçon.
              </p>
            </div>
          )}
        </div>

        {/* Title and Description Section */}
        {currentLesson ? (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-white focus:outline-none">
                Leçon {allLessons.findIndex((l) => l.id === currentLesson.id) + 1} : {currentLesson.title}
              </h1>
              <div className="flex gap-3">
                {(() => {
                  const currentIndex = allLessons.findIndex(
                    (l) => l.id === currentLesson.id,
                  );
                  const prevLesson = allLessons[currentIndex - 1];
                  const nextLesson = allLessons[currentIndex + 1];

                  return (
                    <>
                      {prevLesson ? (
                        <Link
                          href={`/bibliotheque/e-learning/${mc.slug}?lessonId=${prevLesson.id}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#162a31] text-slate-300 hover:bg-slate-700 transition-colors font-medium text-sm border border-slate-700"
                        >
                          <span className="material-symbols-outlined text-lg">
                            chevron_left
                          </span>{" "}
                          Précédent
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#162a31]/50 text-slate-600 font-medium text-sm border border-slate-800 cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-lg">
                            chevron_left
                          </span>{" "}
                          Précédent
                        </button>
                      )}

                      {nextLesson ? (
                        <Link
                          href={`/bibliotheque/e-learning/${mc.slug}?lessonId=${nextLesson.id}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-[#0f1e23] hover:bg-primary/90 transition-opacity font-bold text-sm"
                        >
                          Suivant{" "}
                          <span className="material-symbols-outlined text-lg">
                            chevron_right
                          </span>
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary/30 font-bold text-sm cursor-not-allowed"
                        >
                          Suivant{" "}
                          <span className="material-symbols-outlined text-lg">
                            chevron_right
                          </span>
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

	            <div className="space-y-10">
	              <div className="space-y-4">
	                <h3 className="text-lg font-semibold text-white">
	                  Description de la leçon
	                </h3>
	                <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
	                  {currentLesson.description ||
	                    "Aucune description fournie pour cette leçon."}
	                </p>
	              </div>

	              {/* Resources Section - Hardcoded for now based on template */}
	              <div className="space-y-4">
	                <h3 className="text-lg font-semibold text-white">
	                  Ressources liées
	                </h3>
	                <div className="flex flex-col gap-3">
	                  <a
	                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-[#162a31] hover:border-primary/50 transition-all group"
	                    href="#"
	                  >
	                    <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">
	                      description
	                    </span>
	                    <div className="flex-1 min-w-0">
	                      <p className="text-sm font-medium text-white truncate">
	                        Guide_PDF_Formation.pdf
	                      </p>
	                      <p className="text-xs text-slate-500 truncate">
	                        Document PDF • 2.4 MB
	                      </p>
	                    </div>
	                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
	                      download
	                    </span>
	                  </a>
	                </div>
	              </div>
	            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">
              Ce cours ne contient pas encore de leçons.
            </p>
          </div>
        )}
      </div>

      {/* Sidebar: Curriculum */}
      <aside className="w-full lg:w-[400px] border-l border-slate-800 bg-[#0f1e23] flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white mb-2">
            Programme du cours
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-primary">
              {progressPercent}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {completedLessons} leçons sur {totalLessons} complétées
          </p>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {modules.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Aucun module disponible.
            </p>
          ) : (
            modules.map((mod, index) => (
              <div key={mod.id}>
                <div className="flex items-center gap-2 py-2 px-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Module {index + 1}: {mod.title}
                </div>
                <div className="space-y-1">
                  {mod.lessons?.map((les, lIndex) => {
                    const isCurrent = currentLesson?.id === les.id;
                    return (
                      <Link
                        key={les.id}
                        href={`/bibliotheque/e-learning/${mc.slug}?lessonId=${les.id}`}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                          isCurrent
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-slate-800/50"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined ${isCurrent ? "text-primary fill-1" : "text-slate-500"}`}
                        >
                          play_circle
                        </span>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${isCurrent ? "text-primary font-bold" : "text-slate-300"}`}
                          >
                            Leçon {allLessons.findIndex((l) => l.id === les.id) + 1} : {les.title}
                          </p>
                          <p
                            className={`text-xs ${isCurrent ? "text-primary/70" : "text-slate-500"}`}
                          >
                            {isCurrent ? "En cours" : les.duration || "00:00"}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-[#162a31]/50 border-t border-slate-800">
          <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#0f1e23] border border-slate-700 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-lg">help</span>
            Poser une question
          </button>
        </div>
      </aside>
    </div>
  );
}
