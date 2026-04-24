import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import db from "@/libs/db";
import { courses, elearnings, lessons, userAccess } from "@/libs/schema";
import VideoPlayer from "@/components/VideoPlayer";

function isStaff(user) {
  return user?.role === "admin" || user?.role === "formateur";
}

function safeJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getResourceLabel(resource) {
  return resource.name || resource.title || "Ressource";
}

export default async function FormationPlayerPage({ params, searchParams }) {
  const { slug } = await params;
  const { lessonId } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/formations/${slug}`);
  }

  const decodedSlug = decodeURIComponent(slug);
  const [formation] = await db
    .select()
    .from(elearnings)
    .where(eq(elearnings.slug, decodedSlug))
    .limit(1);

  if (!formation) notFound();

  const staff = isStaff(session.user);
  if (!staff && formation.isPublished === false) notFound();

  if (!staff) {
    const [accessRecord] = await db
      .select({ id: userAccess.id })
      .from(userAccess)
      .where(
        and(
          eq(userAccess.userId, session.user.id),
          eq(userAccess.elearningId, formation.id),
        ),
      )
      .limit(1);

    if (!accessRecord) redirect("/");
  }

  const modules = await db
    .select()
    .from(courses)
    .where(eq(courses.elearningId, formation.id))
    .orderBy(asc(courses.sortOrder));

  const moduleIds = modules.map((module) => module.id);
  const lessonRows =
    moduleIds.length > 0
      ? await db
          .select()
          .from(lessons)
          .where(inArray(lessons.courseId, moduleIds))
          .orderBy(asc(lessons.sortOrder))
      : [];

  const lessonsByModule = new Map();
  for (const lesson of lessonRows) {
    const list = lessonsByModule.get(lesson.courseId) || [];
    list.push(lesson);
    lessonsByModule.set(lesson.courseId, list);
  }

  const sortedModules = modules.map((module) => ({
    ...module,
    lessons: lessonsByModule.get(module.id) || [],
  }));

  const allLessons = sortedModules.flatMap((module) => module.lessons);
  let currentLesson = allLessons[0] || null;
  if (lessonId) {
    currentLesson =
      allLessons.find((lesson) => lesson.id === lessonId) || currentLesson;
  }

  const currentIndex = currentLesson
    ? allLessons.findIndex((lesson) => lesson.id === currentLesson.id)
    : -1;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;
  const resources = safeJsonArray(currentLesson?.resources);
  const chapters = safeJsonArray(currentLesson?.chapters);
  const totalLessons = allLessons.length || 1;
  const completedLessons = 0;
  const progressPercent = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full relative">
      <div className="flex-1 p-4 lg:p-8 w-full">
        <nav className="flex items-center gap-2 mb-6 text-sm overflow-hidden whitespace-nowrap">
          <Link
            href="/"
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-lg">
              arrow_back
            </span>
            Retour aux formations
          </Link>
          <span className="text-slate-600 shrink-0">/</span>
          <span className="text-primary font-medium truncate">
            {formation.title}
          </span>
        </nav>

        <div className="relative mb-6 aspect-video w-full rounded-xl border border-slate-800 bg-slate-950 shadow-2xl sm:mb-8">
          {currentLesson?.videoUrl ? (
            <VideoPlayer videoUrl={currentLesson.videoUrl} chapters={chapters} />
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

        {currentLesson ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-white">
                Leçon {currentIndex + 1} : {currentLesson.title}
              </h1>
              <div className="grid grid-cols-2 gap-3 sm:flex">
                {prevLesson ? (
                  <Link
                    href={`/formations/${formation.slug}?lessonId=${prevLesson.id}`}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#162a31] px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 sm:px-4"
                  >
                    <span className="material-symbols-outlined text-lg">
                      chevron_left
                    </span>
                    Précédent
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-800 bg-[#162a31]/50 px-3 py-2 text-sm font-medium text-slate-600 sm:px-4"
                  >
                    <span className="material-symbols-outlined text-lg">
                      chevron_left
                    </span>
                    Précédent
                  </button>
                )}

                {nextLesson ? (
                  <Link
                    href={`/formations/${formation.slug}?lessonId=${nextLesson.id}`}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-[#0f1e23] transition-opacity hover:bg-primary/90 sm:px-4"
                  >
                    Suivant
                    <span className="material-symbols-outlined text-lg">
                      chevron_right
                    </span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-primary/20 px-3 py-2 text-sm font-bold text-primary/30 sm:px-4"
                  >
                    Suivant
                    <span className="material-symbols-outlined text-lg">
                      chevron_right
                    </span>
                  </button>
                )}
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Description de la leçon
              </h2>
              <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                {currentLesson.description ||
                  "Aucune description fournie pour cette leçon."}
              </p>
            </section>

            {resources.length > 0 ? (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Ressources liées
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {resources.map((resource, index) => (
                    <a
                      key={`${getResourceLabel(resource)}-${index}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-[#162a31] hover:border-primary/50 transition-all group"
                      href={resource.url || resource.href || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">
                        description
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {getResourceLabel(resource)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {[resource.type, resource.size].filter(Boolean).join(" • ") ||
                            "Ressource"}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
                        download
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">
              Cette formation ne contient pas encore de leçons.
            </p>
          </div>
        )}
      </div>

      <aside className="w-full shrink-0 border-t border-slate-800 bg-[#0f1e23] lg:w-[400px] lg:border-l lg:border-t-0 flex flex-col">
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

        <div className="flex-1 space-y-4 p-4">
          {sortedModules.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Aucun module disponible.
            </p>
          ) : (
            sortedModules.map((module, index) => (
              <div key={module.id}>
                <div className="flex items-center gap-2 py-2 px-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Module {index + 1}: {module.title}
                </div>
                <div className="space-y-1">
                  {module.lessons.map((lesson) => {
                    const isCurrent = currentLesson?.id === lesson.id;
                    const lessonNumber =
                      allLessons.findIndex((item) => item.id === lesson.id) + 1;
                    return (
                      <Link
                        key={lesson.id}
                        href={`/formations/${formation.slug}?lessonId=${lesson.id}`}
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
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${isCurrent ? "text-primary font-bold" : "text-slate-300"}`}
                          >
                            Leçon {lessonNumber} : {lesson.title}
                          </p>
                          <p
                            className={`text-xs ${isCurrent ? "text-primary/70" : "text-slate-500"}`}
                          >
                            {isCurrent ? "En cours" : lesson.duration || "00:00"}
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
      </aside>
    </div>
  );
}
