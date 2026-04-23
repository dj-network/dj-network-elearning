import db from "@/libs/db";
import {
  products,
  masterclasses,
  elearnings,
  purchases,
  categories,
  courses,
  userAccess,
} from "@/libs/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import BibliothequeClient from "./BibliothequeClient";
import { getAccessState } from "@/libs/access/getAccessState";

export default async function BibliothequePage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">
          Veuillez vous connecter pour accéder à votre bibliothèque.
        </p>
      </div>
    );
  }

  const isAdmin =
    session.user?.role === "admin" || session.user?.role === "formateur";

  let userPurchases = [];
  let accessRows = [];
  if (!isAdmin) {
    userPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, session.user.id));
    accessRows = await db
      .select()
      .from(userAccess)
      .where(eq(userAccess.userId, session.user.id));
  }

  // Fetch all products, masterclasses, and courses to build the library
  let allProducts = [];
  try {
    allProducts = await db.select().from(products);
  } catch {
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
      .from(products);
  }
  let allMasterclasses = [];
  try {
    allMasterclasses = await db.select().from(masterclasses);
  } catch {
    allMasterclasses = await db
      .select({
        id: masterclasses.id,
        title: masterclasses.title,
        slug: masterclasses.slug,
        instructor: masterclasses.instructor,
        imageUrl: masterclasses.imageUrl,
        duration: masterclasses.duration,
        createdAt: masterclasses.createdAt,
      })
      .from(masterclasses);
  }

  let allElearnings = [];
  try {
    allElearnings = await db.select().from(elearnings);
  } catch {
    allElearnings = await db
      .select({
        id: elearnings.id,
        title: elearnings.title,
        slug: elearnings.slug,
        instructor: elearnings.instructor,
        imageUrl: elearnings.imageUrl,
        duration: elearnings.duration,
        createdAt: elearnings.createdAt,
      })
      .from(elearnings);
  }
  const allCategories = await db.select().from(categories);
  const allCourses = await db.select().from(courses);

  let libraryItems = [];

  const baseFormationItem = (m) => ({
    id: m.id,
    title: m.title,
    author: `Par ${m.instructor}`,
    image: m.imageUrl,
    slug: m.slug,
    date: m.createdAt
      ? new Date(m.createdAt).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "--",
    size: m.duration || "--",
    sizeIcon: "schedule",
    action: "watch",
  });

  const processMasterclass = (m) => ({
    ...baseFormationItem(m),
    tag: "Masterclass",
    category: "Masterclasses",
    type: "masterclass",
    actionUrl: `/bibliotheque/masterclass/${m.slug}`,
  });

  const processElearning = (m) => ({
    ...baseFormationItem(m),
    tag: "E-learning",
    category: "E-learning",
    type: "elearning",
    actionUrl: `/bibliotheque/e-learning/${m.slug}`,
  });
  if (isAdmin) {
    // Admins see everything
    libraryItems = [
      ...allProducts.map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author || "DJ Network Studio",
        image: p.imageUrl,
        fileUrl: p.fileUrl,
        tag:
          allCategories.find((c) => c.id === p.categoryId)?.name || "Produit",
        category:
          allCategories.find((c) => c.id === p.categoryId)?.name || "Autre",
        type: "product",
        slug: p.slug,
        date: p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "--",
        size: p.fileSize || "1.4 GB",
        action: "view",
        actionUrl: `/product/${p.slug}`,
      })),
      ...allMasterclasses.map(processMasterclass),
      ...allElearnings.map(processElearning),
    ];
  } else {
    // Filter by purchases
    const purchasedProductIds = userPurchases
      .map((p) => p.productId)
      .filter(Boolean);
    const purchasedMasterclassIds = userPurchases
      .map((p) => p.masterclassId)
      .filter(Boolean);
    const accessedProductIds = accessRows.map((r) => r.productId).filter(Boolean);
    const accessedMasterclassIds = accessRows
      .map((r) => r.masterclassId)
      .filter(Boolean);
    const accessedElearningIds = accessRows.map((r) => r.elearningId).filter(Boolean);

    libraryItems = [
      ...allProducts
        .filter((p) => {
          const state = getAccessState({
            item: p,
            itemType: "product",
            isOwned:
              purchasedProductIds.includes(p.id) || accessedProductIds.includes(p.id),
            subscriptionPlan: session.user?.plan,
            creditsBalance: session.user?.creditsBalance ?? 0,
          });
          return state.isFree || state.canDownload || state.canUnlockWithCredit;
        })
        .map((p) => {
          const state = getAccessState({
            item: p,
            itemType: "product",
            isOwned:
              purchasedProductIds.includes(p.id) || accessedProductIds.includes(p.id),
            subscriptionPlan: session.user?.plan,
            creditsBalance: session.user?.creditsBalance ?? 0,
          });
          const libraryPriceLabel =
            state.status === "owned" ? "Possédé" : state.priceLabel;
          return {
            id: p.id,
            title: p.title,
            author: p.author || "DJ Network Studio",
            image: p.imageUrl,
            fileUrl: p.fileUrl,
            tag:
              allCategories.find((c) => c.id === p.categoryId)?.name || "Produit",
            category:
              allCategories.find((c) => c.id === p.categoryId)?.name || "Autre",
            type: "product",
            slug: p.slug,
            date: p.createdAt
              ? new Date(p.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "--",
            size: p.fileSize || "1.4 GB",
            action: state.canUnlockWithCredit
              ? "unlock"
              : state.canDownload
                ? "download"
                : "view",
            actionUrl: `/product/${p.slug}`,
            priceLabel: libraryPriceLabel,
          };
        }),
      ...allMasterclasses
        .filter((m) => {
          const state = getAccessState({
            item: m,
            itemType: "masterclass",
            isOwned:
              purchasedMasterclassIds.includes(m.id) ||
              accessedMasterclassIds.includes(m.id),
            subscriptionPlan: session.user?.plan,
            creditsBalance: session.user?.creditsBalance ?? 0,
          });
          return state.isFree || state.canWatch || state.canUnlockWithCredit;
        })
        .map((m) => {
          const state = getAccessState({
            item: m,
            itemType: "masterclass",
            isOwned:
              purchasedMasterclassIds.includes(m.id) ||
              accessedMasterclassIds.includes(m.id),
            subscriptionPlan: session.user?.plan,
            creditsBalance: session.user?.creditsBalance ?? 0,
          });
          const libraryPriceLabel =
            state.status === "owned" ? "Possédé" : state.priceLabel;
          return {
            ...processMasterclass(m),
            action: state.canUnlockWithCredit ? "unlock" : "watch",
            priceLabel: libraryPriceLabel,
          };
        }),
      ...allElearnings
        .filter((m) => {
          const state = getAccessState({
            item: m,
            itemType: "elearning",
            isOwned:
              purchasedMasterclassIds.includes(m.id) ||
              accessedElearningIds.includes(m.id),
            subscriptionPlan: session.user?.plan,
            creditsBalance: session.user?.creditsBalance ?? 0,
          });
          return state.isFree || state.canWatch || state.canUnlockWithCredit;
        })
        .map((m) => {
          const state = getAccessState({
            item: m,
            itemType: "elearning",
            isOwned:
              purchasedMasterclassIds.includes(m.id) ||
              accessedElearningIds.includes(m.id),
            subscriptionPlan: session.user?.plan,
            creditsBalance: session.user?.creditsBalance ?? 0,
          });
          const libraryPriceLabel =
            state.status === "owned" ? "Possédé" : state.priceLabel;
          return {
            ...processElearning(m),
            action: state.canUnlockWithCredit ? "unlock" : "watch",
            priceLabel: libraryPriceLabel,
          };
        }),
    ];
  }

  // Build unique category tabs from items
  const itemCategories = Array.from(
    new Set(libraryItems.map((item) => item.category)),
  );
  const tabs = ["Tous les produits", ...itemCategories.sort()];

  return <BibliothequeClient initialItems={libraryItems} tabs={tabs} />;
}
