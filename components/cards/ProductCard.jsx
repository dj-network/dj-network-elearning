import Link from "next/link";
import { resolveMediaUrl } from "@/libs/media";
import { getAccessState } from "@/libs/access/getAccessState";

export default function ProductCard({
  product,
  href,
  subscriptionPlan = null,
  creditsBalance = 0,
  context = "shop",
}) {
  const state = getAccessState({
    item: product,
    itemType: "product",
    isAdmin: !!product?.isAdmin,
    isOwned: !!product?.isOwned,
    subscriptionPlan,
    creditsBalance,
  });

  const tagLabel = product?.tag || product?.categoryName || product?.category || "Produit";
  const metaLabel =
    context === "library"
      ? product?.date || product?.author || ""
      : product?.author || "DJ Network";
  const secondaryMeta =
    context === "library" ? product?.size || "" : product?.samples || product?.fileSize || "";

  return (
    <Link
      href={href || `/product/${product.slug}`}
      className="group bg-[#162a31] border border-slate-800 rounded-xl overflow-hidden hover:border-primary/50 transition-all block"
    >
      <div className="aspect-video relative overflow-hidden">
        <img
          alt={product.title}
          className="w-full h-full object-contain bg-[#0f1e23] p-2 group-hover:scale-[1.01] transition-transform duration-500"
          src={resolveMediaUrl(product.imageUrl || product.image) || "/logo.png"}
        />
        <span className="absolute top-3 left-3 bg-[#0f1e23]/80 backdrop-blur-sm text-primary text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
          {tagLabel}
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-primary transition-colors line-clamp-1">
          {product.title}
        </h3>
        {metaLabel ? <p className="text-slate-400 text-sm">{metaLabel}</p> : null}
        {secondaryMeta ? (
          <p className="text-slate-500 text-xs mb-4">{secondaryMeta}</p>
        ) : null}
        {Array.isArray(product.tags) && product.tags.length > 0 && context !== "library" && (
          <div className="flex flex-wrap gap-1 mb-4">
            {product.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {context === "library" && product?.size ? (
          <div className="flex items-center gap-4 mb-6 text-[10px] text-slate-400 font-medium">
            {product?.date ? (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">calendar_today</span>
                <span>{product.date}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">
                {product.sizeIcon || "hard_drive"}
              </span>
              <span>{product.size}</span>
            </div>
          </div>
        ) : null}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`block text-lg font-black ${
                state.status === "purchase_required" || state.status === "member_discount"
                  ? "text-primary"
                  : state.status === "free"
                    ? "text-slate-400"
                  : state.hasDualPurchaseOptions
                    ? "text-white"
                    : "text-green-400"
              }`}
            >
              {state.hasDualPurchaseOptions ? state.purchasePriceLabel : state.priceLabel}
            </span>
            {state.hasDualPurchaseOptions ? (
              <span className="block text-xs font-bold text-emerald-400 mt-1">
                ou {state.creditPriceLabel}
              </span>
            ) : null}
          </div>
          <div
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              state.missingFile
                ? "bg-slate-700/80 text-slate-300"
                : state.canUnlockWithCredit
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : state.status === "subscription_locked"
                    ? "bg-slate-700/80 text-slate-300"
                : "bg-primary text-[#0f1e23] hover:shadow-[0_0_15px_rgba(6,188,249,0.3)]"
            }`}
          >
            {context === "library" ? "Voir la fiche" : state.ctaLabel}
          </div>
        </div>
      </div>
    </Link>
  );
}
