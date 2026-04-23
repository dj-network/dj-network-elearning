import Link from "next/link";
import { resolveMediaUrl } from "@/libs/media";
import { getAccessState } from "@/libs/access/getAccessState";

export default function MasterclassCard({
  item,
  href,
  subscriptionPlan = null,
  creditsBalance = 0,
}) {
  const state = getAccessState({
    item,
    itemType: "masterclass",
    isAdmin: !!item?.isAdmin,
    isOwned: !!item?.isOwned,
    subscriptionPlan,
    creditsBalance,
  });

  return (
    <Link
      href={href || `/masterclasses/${item.slug}`}
      className="group bg-slate-800/40 border border-slate-800 rounded-xl overflow-hidden hover:border-primary/50 transition-all block flex flex-col"
    >
      <div className="aspect-video relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-slate-800/20 group-hover:bg-slate-800/0 transition-colors z-10" />
        <div className="absolute top-3 left-3 z-20">
          <span className="bg-bg-dark/80 backdrop-blur-sm text-primary text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
            {item.category || "Masterclass"}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 z-20">
          <span className="bg-bg-dark/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">schedule</span>
            {item.duration || "--"}
          </span>
        </div>
        <img
          alt={item.title}
          className="w-full h-full object-cover object-center group-hover:scale-[1.01] transition-transform duration-500"
          src={
            resolveMediaUrl(item.imageUrl) ||
            "https://images.unsplash.com/photo-1598282361139-44585da81df7?auto=format&fit=crop&q=80"
          }
        />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-primary transition-colors line-clamp-1">
          {item.title}
        </h3>
        <p className="text-slate-400 text-sm mb-4">Par {item.instructor}</p>
        <div className="flex items-end justify-between mt-auto gap-3">
          <div className="min-w-0">
            <span
              className={`block text-xl font-black ${
                state.status === "purchase_required" || state.status === "member_discount"
                  ? "text-primary"
                  : state.status === "owned"
                    ? "text-green-400"
                  : state.status === "free"
                    ? "text-slate-400"
                  : state.hasDualPurchaseOptions
                    ? "text-white"
                    : "text-green-400"
              }`}
            >
              {state.status === "owned"
                ? "Possédé"
                : state.hasDualPurchaseOptions
                  ? state.purchasePriceLabel
                  : state.priceLabel}
            </span>
            {state.hasDualPurchaseOptions ? (
              <span className="block text-xs font-bold text-emerald-400 mt-1">
                ou {state.creditPriceLabel}
              </span>
            ) : null}
          </div>
          <div
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              state.canWatch
                ? "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                : state.canUnlockWithCredit
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : state.status === "subscription_locked"
                    ? "bg-slate-700/80 text-slate-300"
                : "bg-primary text-bg-dark hover:shadow-[0_0_15px_rgba(6,188,249,0.3)]"
            }`}
          >
            {state.ctaLabel}
          </div>
        </div>
      </div>
    </Link>
  );
}
