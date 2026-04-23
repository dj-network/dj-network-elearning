import db from "@/libs/db";
import { elearnings, courses, lessons } from "@/libs/schema";
import { asc, desc, eq } from "drizzle-orm";
import AdminElearningHeaderActions from "./AdminElearningHeaderActions";
import AdminElearningTableClient from "./AdminElearningTableClient";

export default async function AdminElearningPage() {
  let allMasterclasses = [];
  try {
    allMasterclasses = await db
      .select()
      .from(elearnings)
      .orderBy(asc(elearnings.sortOrder), desc(elearnings.createdAt));
  } catch {
    // Backward-compat if DB not migrated to include new columns (e.g. elearnings.badges).
    allMasterclasses = await db
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
      .orderBy(desc(elearnings.createdAt));
  }
  const allCourses = await db.select().from(courses);
  // Avoid hard-crash if the DB hasn't been migrated to include new columns (e.g. lessons.chapters).
  const allLessons = await db
    .select({ id: lessons.id, courseId: lessons.courseId })
    .from(lessons);

  const elearningStats = allMasterclasses.map((mc) => {
    const mcCourses = allCourses.filter((c) => c.elearningId === mc.id);
    const courseIds = mcCourses.map((c) => c.id);
    const mcLessons = allLessons.filter((l) => courseIds.includes(l.courseId));

    return {
      ...mc,
      sortOrder: mc.sortOrder ?? 0,
      courseCount: mcCourses.length,
      lessonCount: mcLessons.length,
    };
  });
  const tableKey = elearningStats
    .map((item) => `${item.id}:${item.sortOrder ?? 0}:${item.courseCount ?? 0}:${item.lessonCount ?? 0}`)
    .join("|");

  return (
    <div className="p-8 max-w-7xl mx-auto w-full text-white">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-secondary text-3xl">
              school
            </span>
            <h1 className="text-3xl font-black text-white">
              Gestion E-learning
            </h1>
          </div>
          <p className="text-slate-400">
            Cliquez sur une formation pour gérer ses modules, leçons et vidéos
            LMS.
          </p>
        </div>
        <AdminElearningHeaderActions />
      </div>

      <AdminElearningTableClient key={tableKey} items={elearningStats} />

      {elearningStats.length === 0 && (
        <div className="text-center py-20 bg-[#162a31]/50 rounded-2xl border border-dashed border-slate-800">
          <span className="material-symbols-outlined text-5xl text-slate-600 mb-4">
            school
          </span>
          <p className="text-slate-400">Aucune formation e-learning trouvée.</p>
        </div>
      )}
    </div>
  );
}
