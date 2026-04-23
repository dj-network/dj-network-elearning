"use client";

import Link from "next/link";
import { usePlayer } from "@/components/PlayerContext";
import { resolveMediaUrl } from "@/libs/media";

export default function DashboardClient({
  newestProducts = [],
  studioTools = [],
}) {
  const { playTrack } = usePlayer();

  const parseJsonArray = (value) => {
    if (!value || typeof value !== "string") return [];
    try {
      const out = JSON.parse(value);
      return Array.isArray(out) ? out : [];
    } catch {
      return [];
    }
  };

  const formatPrice = (price, currency = "EUR") => {
    if (price == null) return null;
    const num = typeof price === "number" ? price : Number(price);
    if (!Number.isFinite(num)) return null;
    const formatted = num.toFixed(2).replace(".", ",");
    if (currency === "EUR") return `${formatted}€`;
    return `${formatted} ${currency}`;
  };

  return (
    <>
      <div className="p-8 space-y-8">
        {/* Hero Section */}
        <section className="relative min-h-[420px] py-12 rounded-2xl overflow-hidden group shadow-2xl flex flex-col justify-center">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(15,30,35,0.95), rgba(15,30,35,0.4)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuAsJ5--8OfbGY2E-EBjmpcNAPvShjHHDj_QaiDeYDfbpt8smaTv4c0n3Zp1q0tDHBiEwD5qFJSFw8YSXBiFGB4rSZM6ZmS9ocroc6dlwZ1v5a7PMrdLiXR27-sLuH2V_3WYLv63C9j1ALlJv2FFuRmTNODlRV_n_9MCVgoD3mRdcvi_yzKRTcV0Y_Edd5lhA28a1TtdxcrEitIOrhCTKQcbys_cghgwYXHOGkf6nH-3hegBG35zTUzzfRghI2jBgKxH8LRUAt-PCe8')`,
            }}
          />
          <div className="relative flex flex-col justify-center px-6 sm:px-10 lg:px-12 max-w-2xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-4 w-fit">
              Cours à la une
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              Libérez votre potentiel dans le DJing hybride
            </h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Maîtrisez l&apos;art de combiner les CDJ avec Ableton Live 11.
              Apprenez des géants de l&apos;industrie dans notre nouvelle série
              de masterclass de 12 heures.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
              <Link
                href="/masterclasses"
                className="bg-primary hover:bg-primary/90 text-[#0f1e23] px-6 sm:px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 neon-glow text-center sm:whitespace-nowrap"
              >
                <span className="material-symbols-outlined shrink-0">
                  play_circle
                </span>
                Commencer l&apos;apprentissage
              </Link>
              <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 sm:px-8 py-3 rounded-xl font-bold transition-all border border-slate-700 text-center sm:whitespace-nowrap">
                Voir la bande-annonce
              </button>
            </div>
          </div>
        </section>

        {/* Studio Tools */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">
                Vos outils de studio
              </h3>
              <p className="text-sm text-slate-400">
                Les points forts de votre bibliothèque pour votre flux de
                travail
              </p>
            </div>
            <Link
              href="/bibliotheque"
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              Tout afficher
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>

          {/* Intentionally large cards, matching the "old" dashboard feel */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studioTools.map((p) => {
              const compat = parseJsonArray(p.compatibility);
              const metaParts = [];
              if (p.fileSize) metaParts.push(p.fileSize);
              if (compat[0]) metaParts.push(String(compat[0]));
              if (!metaParts.length) {
                metaParts.push(
                  p.isOwned
                    ? "Dans votre bibliothèque"
                    : p.price == null
                      ? "Gratuit"
                      : formatPrice(p.price, p.currency) || "",
                );
              }

              const href = `/product/${p.slug}`;

              return (
                <Link
                  key={p.id}
                  href={href}
                  className="bg-[#162a31] border border-slate-800 p-4 rounded-xl group hover:border-primary/40 transition-all cursor-pointer"
                >
                  <div className="aspect-video rounded-lg mb-4 overflow-hidden relative bg-slate-800">
                    <img
                      alt={p.title}
                      className="w-full h-full object-contain bg-[#0f1e23] p-2 group-hover:scale-[1.01] transition-transform duration-500"
                      src={resolveMediaUrl(p.imageUrl) || "/logo.png"}
                    />
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-4xl">
                        {p.isOwned ? "download" : "folder_open"}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-100 line-clamp-1">
                    {p.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {metaParts.join(" • ")}
                  </p>
                </Link>
              );
            })}

            {studioTools.length < 3 &&
              Array.from({ length: 3 - studioTools.length }).map((_, i) => (
                <div
                  key={`tool-placeholder-${i}`}
                  className="border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center p-6 text-slate-500 min-h-[200px]"
                >
                  <span className="material-symbols-outlined text-3xl mb-2">
                    inventory_2
                  </span>
                  <p className="text-xs font-medium">Aucun outil</p>
                </div>
              ))}
          </div>
        </section>

        {/* Marketplace + Spotlight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                Nouveautés de la boutique
              </h3>
              <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>

            <div className="space-y-4">
              {newestProducts.length === 0 && (
                <div className="bg-[#162a31] border border-slate-800 p-6 rounded-xl text-slate-400 text-sm">
                  Aucun produit pour le moment.
                </div>
              )}

              {newestProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="bg-[#162a31] border border-slate-800 p-3 sm:p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-800/40 transition-all group"
                >
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden">
                    <img
                      alt={p.title}
                      className="w-full h-full object-cover"
                      src={resolveMediaUrl(p.imageUrl) || "/logo.png"}
                    />
                    {p.demoAudioUrl && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          playTrack({
                            title: p.title,
                            image: resolveMediaUrl(p.imageUrl) || "/logo.png",
                          });
                        }}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-white">
                          play_arrow
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-100 truncate text-sm sm:text-base mb-0.5">
                      {p.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                      {p.author ? `By ${p.author}` : "DJ Network"}{" "}
                      {p.isOwned ? "• dans votre bibliothèque" : ""}
                    </p>
                    {(() => {
                      const compat = parseJsonArray(p.compatibility).slice(
                        0,
                        2,
                      );
                      if (!compat.length) return null;
                      return (
                        <div className="hidden sm:flex items-center gap-2 mt-2">
                          {compat.map((c) => (
                            <div
                              key={c}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase"
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                check_circle
                              </span>
                              {String(c)}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {(() => {
                      const canAccess = p.isOwned || p.price == null;
                      const missingFile = canAccess && !p.fileUrl;
                      return (
                        <>
                    <span className="text-primary font-bold text-[11px] sm:text-sm whitespace-nowrap">
                      {p.isOwned
                        ? "Disponible"
                        : p.price == null
                          ? "Gratuit"
                          : formatPrice(p.price, p.currency) || ""}
                    </span>
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-all border shrink-0 ${
                        missingFile
                          ? "bg-slate-700/30 text-slate-300 border-slate-600/50"
                          : "bg-primary/10 group-hover:bg-primary text-primary group-hover:text-[#0f1e23] border-primary/20"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px] sm:text-[24px]">
                        {missingFile
                          ? "block"
                          : p.isOwned || p.price == null
                            ? "download"
                            : "add_shopping_cart"}
                      </span>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Masterclass Spotlight */}
          <div>
            <h3 className="text-xl font-bold text-white mb-6">
              Masterclass à l&apos;honneur
            </h3>
            <div className="bg-[#162a31] overflow-hidden rounded-2xl flex flex-col border border-slate-800 hover:border-primary/30 transition-all">
              <div className="aspect-[4/3] relative">
                <img
                  alt="Masterclass instructor"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxdKwHCjVXwvnABqv68wmC3BRwkN9Ct_VgSFM3jJtv4noPbySBX8ax4F_D7bU6rsxkr5U5h5V_ODgMVjlepEJO7nu7sM0d-JUqNCR8WJeiic6djGD78o2Skh6cHc6lcRg2NCcLSvpRmPbLor0t9UyvMc9yW9qNHavaz-K_ibPX84tEJDdrM9cFB1cQ6YUledRGHBxtBEMuXkFh42D4zXqqKJONf13Nd2CjmfRnXomBjOVRk9ftqc_1js75cpF5dPoZAdrjIZfoCsM"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-primary text-[#0f1e23] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Meilleure vente
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 bg-[#0f1e23]/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white">
                  8.5 Hours
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h4 className="text-lg font-bold text-white mb-2 leading-tight">
                  Stratégies avancées de mixage harmonique
                </h4>
                <p className="text-sm text-slate-400 mb-6">
                  Apprenez à mélanger les morceaux de manière transparente en
                  utilisant les techniques avancées du Camelot wheel.
                </p>
                <div className="mt-auto space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full border-2 border-[#162a31] bg-slate-700" />
                      <div className="w-6 h-6 rounded-full border-2 border-[#162a31] bg-slate-600" />
                      <div className="w-6 h-6 rounded-full border-2 border-[#162a31] bg-slate-500" />
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      1.2k+ étudiants inscrits
                    </span>
                  </div>
                  <Link
                    href="/masterclasses"
                    className="w-full py-3 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold transition-all inline-flex items-center justify-center"
                  >
                    S&apos;inscrire maintenant
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
