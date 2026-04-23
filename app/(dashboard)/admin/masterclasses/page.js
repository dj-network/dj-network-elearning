import db from "@/libs/db";
import { masterclasses, courses } from "@/libs/schema";
import AdminMasterclassTableClient from "./AdminMasterclassTableClient";
import AdminMasterclassHeaderActions from "./AdminMasterclassHeaderActions";
import { asc, desc } from "drizzle-orm";

export default async function AdminMasterclassesPage() {
  let allMasterclasses = [];
  try {
    allMasterclasses = await db
      .select()
      .from(masterclasses)
      .orderBy(asc(masterclasses.sortOrder), desc(masterclasses.createdAt));
  } catch {
    // Backward-compat if DB not migrated to include new columns (e.g. masterclasses.badges).
    allMasterclasses = await db
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
      })
      .from(masterclasses)
      .orderBy(desc(masterclasses.createdAt));
  }
  allMasterclasses = allMasterclasses.map((item) => ({
    ...item,
    sortOrder: item.sortOrder ?? 0,
  }));
  const allCourses = await db.select().from(courses);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-secondary text-3xl">
              album
            </span>
            <h1 className="text-3xl font-black text-white">
              Gestion Masterclasses
            </h1>
          </div>
          <p className="text-slate-400">
            Gérez vos masterclasses, modifiez les détails et les prix.
          </p>
        </div>
        <AdminMasterclassHeaderActions />
      </div>

      <AdminMasterclassTableClient
        items={allMasterclasses}
        courses={allCourses}
      />
    </div>
  );
}
