import { NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/libs/db";
import { elearnings, masterclasses, products } from "@/libs/schema";
import { and, desc, eq, like, or } from "drizzle-orm";

function normQ(q) {
  return String(q || "").trim().slice(0, 80);
}

function canSeeUnpublished(role) {
  return role === "admin" || role === "formateur";
}

export async function GET(req) {
  const session = await auth();
  const role = session?.user?.role || "user";
  const q = normQ(new URL(req.url).searchParams.get("q"));
  const showAll = canSeeUnpublished(role);

  if (!q) {
    return NextResponse.json({
      q: "",
      products: [],
      masterclasses: [],
      elearnings: [],
    });
  }

  const pat = `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;

  const [prods, mcs, els] = await Promise.all([
    db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        imageUrl: products.imageUrl,
        author: products.author,
        isPublished: products.isPublished,
      })
      .from(products)
      .where(
        and(
          showAll ? undefined : eq(products.isPublished, true),
          or(
            like(products.title, pat),
            like(products.slug, pat),
            like(products.description, pat),
            like(products.tags, pat),
          ),
        ),
      )
      .orderBy(desc(products.createdAt))
      .limit(6),

    db
      .select({
        id: masterclasses.id,
        title: masterclasses.title,
        slug: masterclasses.slug,
        imageUrl: masterclasses.imageUrl,
        instructor: masterclasses.instructor,
        isPublished: masterclasses.isPublished,
      })
      .from(masterclasses)
      .where(
        and(
          showAll ? undefined : eq(masterclasses.isPublished, true),
          or(
            like(masterclasses.title, pat),
            like(masterclasses.slug, pat),
            like(masterclasses.description, pat),
            like(masterclasses.tags, pat),
            like(masterclasses.badges, pat),
          ),
        ),
      )
      .orderBy(desc(masterclasses.createdAt))
      .limit(6),

    db
      .select({
        id: elearnings.id,
        title: elearnings.title,
        slug: elearnings.slug,
        imageUrl: elearnings.imageUrl,
        instructor: elearnings.instructor,
        isPublished: elearnings.isPublished,
      })
      .from(elearnings)
      .where(
        and(
          showAll ? undefined : eq(elearnings.isPublished, true),
          or(
            like(elearnings.title, pat),
            like(elearnings.slug, pat),
            like(elearnings.description, pat),
            like(elearnings.tags, pat),
            like(elearnings.badges, pat),
          ),
        ),
      )
      .orderBy(desc(elearnings.createdAt))
      .limit(6),
  ]);

  return NextResponse.json({
    q,
    products: prods,
    masterclasses: mcs,
    elearnings: els,
  });
}

