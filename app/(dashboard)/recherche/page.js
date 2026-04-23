import Link from "next/link";
import { auth } from "@/auth";
import db from "@/libs/db";
import { elearnings, masterclasses, products } from "@/libs/schema";
import { and, desc, eq, like, or } from "drizzle-orm";
import { resolveMediaUrl } from "@/libs/media";

function normQ(q) {
  return String(q || "").trim().slice(0, 80);
}

function canSeeUnpublished(role) {
  return role === "admin" || role === "formateur";
}

function Section({ title, items, renderItem }) {
  if (!items?.length) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(renderItem)}
      </div>
    </section>
  );
}

function Card({ href, img, title, subtitle, meta }) {
  return (
    <Link
      href={href}
      className="group bg-[#162a31] border border-slate-800 rounded-2xl overflow-hidden hover:border-primary/40 transition-colors"
    >
      <div className="relative aspect-[16/10] bg-[#0f1e23] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={resolveMediaUrl(img) || "/logo.png"}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
        {meta ? (
          <div className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest bg-black/40 border border-white/10 text-white px-3 py-1.5 rounded-full backdrop-blur">
            {meta}
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <p className="text-white font-black leading-tight line-clamp-2">
          {title}
        </p>
        {subtitle ? (
          <p className="text-slate-400 text-sm mt-1 line-clamp-1">{subtitle}</p>
        ) : null}
      </div>
    </Link>
  );
}

export default async function SearchPage({ searchParams }) {
  const session = await auth();
  const role = session?.user?.role || "user";
  const q = normQ(searchParams?.q);
  const showAll = canSeeUnpublished(role);

  if (!q) {
    return (
      <div className="px-6 lg:px-10 py-10">
        <h1 className="text-2xl font-black text-white mb-2">Recherche</h1>
        <p className="text-slate-400">
          Tape un mot-clé dans la barre de recherche en haut.
        </p>
      </div>
    );
  }

  const pat = `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const pubFilter = showAll ? undefined : eq(products.isPublished, true);
  const pubFilterMc = showAll ? undefined : eq(masterclasses.isPublished, true);
  const pubFilterEl = showAll ? undefined : eq(elearnings.isPublished, true);

  const [prods, mcs, els] = await Promise.all([
    db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        imageUrl: products.imageUrl,
        author: products.author,
        price: products.price,
        isPublished: products.isPublished,
      })
      .from(products)
      .where(
        and(
          pubFilter,
          or(
            like(products.title, pat),
            like(products.slug, pat),
            like(products.description, pat),
            like(products.tags, pat),
          ),
        ),
      )
      .orderBy(desc(products.createdAt))
      .limit(12),

    db
      .select({
        id: masterclasses.id,
        title: masterclasses.title,
        slug: masterclasses.slug,
        imageUrl: masterclasses.imageUrl,
        instructor: masterclasses.instructor,
        category: masterclasses.category,
        price: masterclasses.price,
        isPublished: masterclasses.isPublished,
      })
      .from(masterclasses)
      .where(
        and(
          pubFilterMc,
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
      .limit(12),

    db
      .select({
        id: elearnings.id,
        title: elearnings.title,
        slug: elearnings.slug,
        imageUrl: elearnings.imageUrl,
        instructor: elearnings.instructor,
        category: elearnings.category,
        price: elearnings.price,
        isPublished: elearnings.isPublished,
      })
      .from(elearnings)
      .where(
        and(
          pubFilterEl,
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
      .limit(12),
  ]);

  const total = (prods?.length || 0) + (mcs?.length || 0) + (els?.length || 0);

  return (
    <div className="px-6 lg:px-10 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-black text-white">Résultats</h1>
        <p className="text-slate-400 mt-1">
          Recherche: <span className="text-white font-bold">{q}</span>
          {total === 0 ? "" : ` (${total})`}
        </p>
        {!showAll && (
          <p className="text-[11px] text-slate-500 mt-1">
            Seuls les contenus publiés sont affichés.
          </p>
        )}
      </div>

      {total === 0 ? (
        <div className="bg-[#162a31] border border-slate-800 rounded-2xl p-6">
          <p className="text-slate-300 font-bold">Aucun résultat.</p>
          <p className="text-slate-500 text-sm mt-1">
            Essaie un autre mot-clé.
          </p>
        </div>
      ) : (
        <>
          <Section
            title="Produits"
            items={prods}
            renderItem={(p) => (
              <Card
                key={p.id}
                href={`/product/${p.slug}`}
                img={p.imageUrl}
                title={p.title}
                subtitle={p.author ? `Par ${p.author}` : null}
                meta={!p.isPublished ? "Non publié" : "Produit"}
              />
            )}
          />
          <Section
            title="Masterclasses"
            items={mcs}
            renderItem={(m) => (
              <Card
                key={m.id}
                href={`/masterclasses/${m.slug}`}
                img={m.imageUrl}
                title={m.title}
                subtitle={m.instructor ? `Par ${m.instructor}` : null}
                meta={!m.isPublished ? "Non publiée" : "Masterclass"}
              />
            )}
          />
          <Section
            title="E-learning"
            items={els}
            renderItem={(e) => (
              <Card
                key={e.id}
                href={`/e-learning/${e.slug}`}
                img={e.imageUrl}
                title={e.title}
                subtitle={e.instructor ? `Par ${e.instructor}` : null}
                meta={!e.isPublished ? "Non publiée" : "E-learning"}
              />
            )}
          />
        </>
      )}
    </div>
  );
}
