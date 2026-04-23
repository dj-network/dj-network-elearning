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
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link
          href="/admin/e-learning"
          className="text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          E-learning
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-white font-bold">{mc.title}</span>
      </div>

      {/* Formation Header */}
      <div className="bg-[#162a31] rounded-2xl border border-slate-800 p-6 mb-8 flex flex-col md:flex-row items-start gap-6">
        <img
          src={resolveMediaUrl(mc.imageUrl) || "/logo.png"}
          alt={mc.title}
          className="w-32 h-32 rounded-xl object-cover bg-slate-800 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-1">
            <h1 className="text-2xl font-black text-white">{mc.title}</h1>
            <AdminElearningMetadataEditor mc={mc} />
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Par <span className="text-white">{mc.instructor}</span> •{" "}
            {mc.duration || "—"} • {mc.level || "Tous niveaux"} •{" "}
            {mc.category || "—"}
          </p>
          <p className="text-slate-500 text-sm line-clamp-2">
            {mc.description}
          </p>
          <div className="flex gap-3 mt-4 text-xs">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold">
              {sortedCourses.length} module(s)
            </span>
            <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-lg font-bold">
              {allLessons.length} leçon(s)
            </span>
            <Link
              href={
                sortedCourses.length > 0
                  ? `/bibliotheque/e-learning/${mc.slug}`
                  : `/bibliotheque/masterclass/${mc.slug}`
              }
              target="_blank"
              className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg font-bold hover:bg-slate-700 transition-colors flex items-center gap-1"
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
