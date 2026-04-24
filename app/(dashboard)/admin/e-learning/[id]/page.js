import db from "@/libs/db";
import { elearnings, courses, lessons } from "@/libs/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdminFormationEditor from "./AdminFormationEditor";
import AdminElearningMetadataEditor from "./AdminElearningMetadataEditor";
import { resolveMediaUrl } from "@/libs/media";

export default async function AdminElearningDetailPage({ params }) {
  const { id } = await params;

  let mcRecords = [];
  try {
    mcRecords = await db
      .select()
      .from(elearnings)
      .where(eq(elearnings.id, id))
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
      .where(eq(elearnings.id, id))
      .limit(1);
  }

  const [mc] = mcRecords;

  if (!mc) notFound();

  const allCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.elearningId, id));

  const courseIds = allCourses.map((c) => c.id);
  let allLessons = [];
  if (courseIds.length > 0) {
    // Prefer selecting chapters when available; fallback if DB isn't migrated yet.
    try {
      allLessons = await db
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
        .from(lessons);
    } catch {
      allLessons = await db
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
        .from(lessons);
    }
    allLessons = allLessons.filter((l) => courseIds.includes(l.courseId));
  }

  // Build nested structure
  const sortedCourses = allCourses
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((course) => ({
      ...course,
      lessons: allLessons
        .filter((l) => l.courseId === course.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }));

  const editorKey = sortedCourses
    .map(
      (c) =>
        `${c.id}:${c.sortOrder ?? 0}:${(c.lessons || [])
          .map((l) => `${l.id}-${l.sortOrder ?? 0}`)
          .join(".")}`,
    )
    .join("|");

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex min-w-0 items-center gap-2 text-sm">
        <Link
          href="/admin/e-learning"
          className="flex shrink-0 items-center gap-1 text-slate-500 transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          E-learning
        </Link>
        <span className="text-slate-600 shrink-0">/</span>
        <span className="min-w-0 truncate font-bold text-white">{mc.title}</span>
      </div>

      {/* Formation Header */}
      <div className="mb-8 flex flex-col gap-5 rounded-2xl border border-slate-800 bg-[#162a31] p-4 sm:p-6 md:flex-row md:items-start md:gap-6">
        {mc.imageUrl ? (
          <img
            src={resolveMediaUrl(mc.imageUrl)}
            alt={mc.title}
            className="h-28 w-28 rounded-xl object-cover bg-slate-800 shrink-0 sm:h-32 sm:w-32"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-slate-800 p-4 text-center text-xs font-bold uppercase text-slate-500 sm:h-32 sm:w-32">
            image non choisie
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-3xl font-black leading-tight text-white sm:text-2xl">
              {mc.title}
            </h1>
            <AdminElearningMetadataEditor mc={mc} />
          </div>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            Par <span className="text-white">{mc.instructor}</span> •{" "}
            {mc.duration || "—"} • {mc.level || "Tous niveaux"} •{" "}
            {mc.category || "—"}
          </p>
          <p className="text-slate-500 text-sm line-clamp-2">
            {mc.description}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:flex sm:flex-wrap">
            <span className="rounded-lg bg-primary/10 px-3 py-2 font-bold text-primary">
              {sortedCourses.length} module(s)
            </span>
            <span className="rounded-lg bg-purple-500/10 px-3 py-2 font-bold text-purple-400">
              {allLessons.length} leçon(s)
            </span>
            <Link
              href={`/formations/${mc.slug}`}
              target="_blank"
              className="col-span-2 flex items-center justify-center gap-1 rounded-lg bg-slate-800 px-3 py-2 font-bold text-slate-300 transition-colors hover:bg-slate-700 sm:col-span-1"
            >
              <span className="material-symbols-outlined text-xs">
                visibility
              </span>{" "}
              Voir le lecteur
            </Link>
          </div>
        </div>
      </div>

      {/* Modules & Lessons Editor */}
      <AdminFormationEditor
        key={editorKey}
        elearningId={mc.id}
        courses={sortedCourses}
      />
    </div>
  );
}
