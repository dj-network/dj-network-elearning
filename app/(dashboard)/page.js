import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import db from "@/libs/db";
import { courses, elearnings, lessons, userAccess } from "@/libs/schema";
import { resolveMediaUrl } from "@/libs/media";

function isStaff(user) {
  return user?.role === "admin" || user?.role === "formateur";
}

function displayUserName(user) {
  const firstName = (user?.firstName || "").trim();
  if (firstName) return firstName;
  return user?.name || "élève";
}

function parseTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
}

function buildStats(formations, courseRows, lessonRows) {
  const courseCountByFormation = new Map();
  const lessonCountByFormation = new Map();
  const courseToFormation = new Map();

  for (const course of courseRows) {
    if (!course.elearningId) continue;
    courseToFormation.set(course.id, course.elearningId);
    courseCountByFormation.set(
      course.elearningId,
      (courseCountByFormation.get(course.elearningId) || 0) + 1,
    );
  }

  for (const lesson of lessonRows) {
    const formationId = courseToFormation.get(lesson.courseId);
    if (!formationId) continue;
    lessonCountByFormation.set(
      formationId,
      (lessonCountByFormation.get(formationId) || 0) + 1,
    );
  }

  return formations.map((formation) => ({
    ...formation,
    moduleCount: courseCountByFormation.get(formation.id) || 0,
    lessonCount: lessonCountByFormation.get(formation.id) || 0,
    tagsList: parseTags(formation.tags),
  }));
}

async function getStudentFormations(userId) {
  const accessRows = await db
    .select({ elearningId: userAccess.elearningId })
    .from(userAccess)
    .where(eq(userAccess.userId, userId));

  const ids = [...new Set(accessRows.map((row) => row.elearningId).filter(Boolean))];
  if (ids.length === 0) return [];

  return db
    .select()
    .from(elearnings)
    .where(inArray(elearnings.id, ids))
    .orderBy(asc(elearnings.sortOrder), desc(elearnings.createdAt));
}

async function getStaffFormations() {
  return db
    .select()
    .from(elearnings)
    .orderBy(asc(elearnings.sortOrder), desc(elearnings.createdAt));
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const staff = isStaff(session.user);
  const formations = staff
    ? await getStaffFormations()
    : await getStudentFormations(session.user.id);

  const publishedFormations = staff
    ? formations
    : formations.filter((formation) => formation.isPublished !== false);
  const formationIds = publishedFormations.map((formation) => formation.id);

  const courseRows =
    formationIds.length > 0
      ? await db.select().from(courses).where(inArray(courses.elearningId, formationIds))
      : [];
  const courseIds = courseRows.map((course) => course.id);
  const lessonRows =
    courseIds.length > 0
      ? await db
          .select({ id: lessons.id, courseId: lessons.courseId })
          .from(lessons)
          .where(inArray(lessons.courseId, courseIds))
      : [];

  const items = buildStats(publishedFormations, courseRows, lessonRows);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 text-white">
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-primary text-sm font-black uppercase tracking-[0.24em] mb-3">
            DJ Network LMS
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Bonjour {displayUserName(session.user)}
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Accédez aux formations vidéo qui sont attribuées à votre compte.
            Les modules, leçons et ressources associées sont regroupés dans
            chaque formation.
          </p>
        </div>

        {staff ? (
          <Link
            href="/admin/e-learning"
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-lg font-black text-[#0f1e23] hover:bg-primary/90 transition-colors"
          >
            Gérer le LMS
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        ) : null}
      </section>

      {items.length > 0 ? (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">
              school
            </span>
            <h2 className="text-2xl font-black">Mes formations accessibles</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((formation) => (
              <Link
                key={formation.id}
                href={`/bibliotheque/e-learning/${formation.slug}`}
                className="group overflow-hidden rounded-3xl border border-slate-800 bg-[#162a31] hover:border-primary/60 hover:-translate-y-1 transition-all"
              >
                <div className="relative aspect-video bg-[#0f1e23] overflow-hidden">
                  {formation.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(formation.imageUrl)}
                      alt=""
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-slate-700">
                        school
                      </span>
                    </div>
                  )}
                  <div className="absolute left-4 top-4 rounded-xl bg-[#0f1e23]/90 px-3 py-2 text-xs font-black uppercase tracking-widest text-primary">
                    Formation
                  </div>
                  {!formation.isPublished ? (
                    <div className="absolute right-4 top-4 rounded-xl bg-amber-400/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-amber-200">
                      Brouillon
                    </div>
                  ) : null}
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-black leading-tight text-white group-hover:text-primary transition-colors">
                    {formation.title}
                  </h3>
                  <p className="mt-2 text-slate-400">Par {formation.instructor}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {formation.tagsList.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-1 text-xs font-bold text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-300">
                    <div className="rounded-2xl bg-[#0f1e23] p-4">
                      <p className="text-slate-500">Modules</p>
                      <p className="text-xl font-black">{formation.moduleCount}</p>
                    </div>
                    <div className="rounded-2xl bg-[#0f1e23] p-4">
                      <p className="text-slate-500">Leçons</p>
                      <p className="text-xl font-black">{formation.lessonCount}</p>
                    </div>
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-primary font-black">
                    Commencer la formation
                    <span className="material-symbols-outlined">play_circle</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-700 bg-[#162a31]/70 p-10 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-600">
            lock
          </span>
          <h2 className="mt-4 text-2xl font-black">Aucune formation attribuée</h2>
          <p className="mt-3 text-slate-400">
            Votre compte est actif, mais aucune formation LMS n’est encore
            disponible. Contactez l’équipe DJ Network si vous pensez que c’est
            une erreur.
          </p>
        </section>
      )}
    </div>
  );
}
