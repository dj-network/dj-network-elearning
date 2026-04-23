import db from "@/libs/db";
import { products, categories } from "@/libs/schema";
import AdminProductHeaderActions from "./AdminProductHeaderActions";
import AdminProductTable from "./AdminProductTable";
import { asc, desc } from "drizzle-orm";

export default async function AdminProductsPage() {
  let allProducts = [];
  try {
    allProducts = await db
      .select()
      .from(products)
      .orderBy(asc(products.sortOrder), desc(products.createdAt));
  } catch {
    // Backward-compat if DB not migrated to include newer product columns yet.
    allProducts = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        description: products.description,
        categoryId: products.categoryId,
        imageUrl: products.imageUrl,
        demoAudioUrl: products.demoAudioUrl,
        fileUrl: products.fileUrl,
        fileSize: products.fileSize,
        price: products.price,
        currency: products.currency,
        compatibility: products.compatibility,
        tags: products.tags,
        version: products.version,
        author: products.author,
        isFeatured: products.isFeatured,
        stripeProductId: products.stripeProductId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .orderBy(desc(products.createdAt));
  }
  const allCategories = await db.select().from(categories);

  // Map category ID to Name for display
  const categoryIdToName = {};
  for (const cat of allCategories) {
    categoryIdToName[cat.id] = cat.name;
  }

  // Normalize products (marketplace only, no masterclasses)
  const items = allProducts.map((p) => ({
    ...p,
    sortOrder: p.sortOrder ?? 0,
    highlights: p.highlights ?? null,
    packContents: p.packContents ?? null,
    _type: "product",
    _categoryName: categoryIdToName[p.categoryId] || "Sans Catégorie",
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-secondary text-3xl">
              inventory_2
            </span>
            <h1 className="text-3xl font-black text-white">Gestion Produits</h1>
          </div>
          <p className="text-slate-400">
            Gérez vos packs de samples, templates et ressources téléchargeables.
          </p>
        </div>
        <AdminProductHeaderActions categories={allCategories} />
      </div>

      <AdminProductTable items={items} categories={allCategories} />
    </div>
  );
}
