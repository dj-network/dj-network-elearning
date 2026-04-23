"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { resolveMediaUrl } from "@/libs/media";
import { RedeemCreditButton } from "@/components/SubscriptionActionButtons";

export default function BibliothequeClient({ initialItems, tabs }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("Tous les produits");
  const didFocusRef = useRef(false);

  const filteredItems =
    activeTab === "Tous les produits"
      ? initialItems
      : initialItems.filter((item) => item.category === activeTab);

  const focusKey = useMemo(() => {
    const v = searchParams?.get("focus");
    return v ? String(v) : "";
  }, [searchParams]);

  useEffect(() => {
    if (!focusKey || didFocusRef.current) return;
    const [kind, id] = focusKey.split(":");
    if (!kind || !id) return;

    const target =
      initialItems.find((i) => i.type === kind && i.id === id) || null;
    if (!target) return;

    requestAnimationFrame(() => {
      setActiveTab(target.category);

      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-focus-key="${focusKey}"]`);
        if (el?.scrollIntoView) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        didFocusRef.current = true;
      });
    });
  }, [focusKey, initialItems]);

  function getCardHref(res) {
    if (res.action === "watch" && res.actionUrl) return res.actionUrl;
    if (res.action === "download" && res.actionUrl) return res.actionUrl;
    if (res.actionUrl) return res.actionUrl;
    if (res.type === "masterclass") return `/masterclasses/${res.slug}`;
    if (res.type === "elearning") return `/e-learning/${res.slug}`;
    return `/product/${res.slug}`;
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 text-white">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Ma Bibliothèque</h1>
        <p className="text-slate-400 max-w-2xl leading-relaxed">
          Accédez à tous vos packs de samples, templates et formations
          e-learning.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors outline-none ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((res) => (
          <div
            key={res.id + res.type}
            data-focus-key={`${res.type}:${res.id}`}
            role="link"
            tabIndex={0}
            onClick={() => router.push(getCardHref(res))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(getCardHref(res));
              }
            }}
            className={`bg-[#162a31] border border-slate-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all flex flex-col group shadow-lg cursor-pointer ${
              focusKey === `${res.type}:${res.id}`
                ? "ring-2 ring-primary/40 border-primary/30"
                : ""
            }`}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                alt={res.title}
                className="w-full h-full object-contain bg-[#0f1e23] p-2 group-hover:scale-[1.01] transition-transform duration-500"
                src={resolveMediaUrl(res.image) || "/logo.png"}
              />
              <span className="absolute top-3 left-3 bg-[#0f1e23]/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30">
                {res.tag}
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="mb-4">
                <h3 className="font-bold text-base text-slate-100 leading-tight group-hover:text-primary transition-colors line-clamp-1">
                  {res.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">{res.author}</p>
              </div>

              <div className="flex items-center gap-4 mb-6 text-[10px] text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">
                    calendar_today
                  </span>
                  <span>{res.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">
                    {res.sizeIcon || "hard_drive"}
                  </span>
                  <span>{res.size}</span>
                </div>
              </div>

              {res.priceLabel ? (
                <div className="mb-4">
                  <span
                    className={`text-lg font-black ${
                      res.priceLabel === "Gratuit"
                        ? "text-slate-400"
                        : res.action === "unlock"
                          ? "text-primary"
                          : "text-green-400"
                    }`}
                  >
                    {res.priceLabel}
                  </span>
                </div>
              ) : null}

              {res.action === "watch" ? (
                <Link
                  href={res.actionUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full mt-auto bg-primary hover:bg-primary/90 text-[#0f1e23] py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">
                    play_circle
                  </span>
                  Regarder
                </Link>
              ) : res.action === "unlock" ? (
                <div onClick={(e) => e.stopPropagation()} className="mt-auto">
                  <RedeemCreditButton
                    itemType={res.type}
                    itemId={res.id}
                    className="w-full bg-primary hover:bg-primary/90 text-[#0f1e23] py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/20 active:scale-95"
                  >
                    Utiliser un crédit
                  </RedeemCreditButton>
                </div>
              ) : res.action === "download" ? (
                <Link
                  href={res.actionUrl || `/product/${res.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full mt-auto bg-primary hover:bg-primary/90 text-[#0f1e23] py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Télécharger
                </Link>
              ) : (
                <Link
                  href={res.actionUrl || `/product/${res.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full mt-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">info</span>
                  Voir la fiche
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20 bg-[#162a31]/50 rounded-2xl border border-dashed border-slate-800">
          <span className="material-symbols-outlined text-5xl text-slate-600 mb-4">
            folder_off
          </span>
          <p className="text-slate-400">
            Aucun produit trouvé dans cette catégorie.
          </p>
        </div>
      )}
    </div>
  );
}
