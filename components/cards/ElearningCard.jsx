import Link from "next/link";
import { resolveMediaUrl } from "@/libs/media";
import { getAccessState } from "@/libs/access/getAccessState";

export default function ElearningCard({
  item,
  href,
  subscriptionPlan = null,
  creditsBalance = 0,
}) {
  const state = getAccessState({
    item,
    itemType: "elearning",
    isAdmin: !!item?.isAdmin,
    isOwned: !!item?.isOwned,
    subscriptionPlan,
    creditsBalance,
  });

  return (
    <Link
      href={href || `/e-learning/${item.slug}`}
      className="group bg-[#162a31] border border-slate-800 rounded-xl overflow-hidden hover:border-primary/50 transition-all block flex flex-col h-full"
    >
      <div className="aspect-video relative overflow-hidden shrink-0">
        <img
          alt={item.title}
          className="w-full h-full object-cover object-center group-hover:scale-[1.01] transition-transform duration-500"
          src={resolveMediaUrl(item.imageUrl)}
        />
        <span className="absolute top-3 left-3 bg-[#0f1e23]/80 backdrop-blur-sm text-primary text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
          {item.category || "E-learning"}
        </span>
        <div className="absolute top-3 right-3 bg-[#0f1e23]/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {item.duration || "--"}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-primary transition-colors line-clamp-1">
          {item.title}
        </h3>
        <p className="text-slate-400 text-sm flex items-center gap-1.5 mb-3">
          <span className="material-symbols-outlined text-[16px]">person</span>
          {item.instructor}
        </p>
        {Array.isArray(item._tags) && item._tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {item._tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto">
          <span
            className={`text-xl font-black ${
              state.status === "purchase_required" || state.status === "member_discount"
                ? "text-primary"
                : state.status === "free"
                  ? "text-slate-400"
                : "text-green-400"
            }`}
          >
            {state.priceLabel}
          </span>
          <div
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              state.canWatch
                ? "bg-primary text-[#0f1e23] hover:shadow-[0_0_15px_rgba(6,188,249,0.3)]"
                : state.canUnlockWithCredit
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : state.status === "subscription_locked"
                    ? "bg-slate-700/80 text-slate-300"
                    : "bg-primary text-[#0f1e23] hover:shadow-[0_0_15px_rgba(6,188,249,0.3)]"
            }`}
          >
            {state.canWatch ? (item.isAdmin ? "Regarder" : "Suivre") : state.ctaLabel}
          </div>
        </div>
      </div>
    </Link>
  );
}
