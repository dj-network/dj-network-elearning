"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { resolveMediaUrl } from "@/libs/media";

export default function HeaderSearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = (searchParams?.get("q") || "").trim();
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    products: [],
    masterclasses: [],
    elearnings: [],
  });
  const abortRef = useRef(null);
  const blurTimerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  const close = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setOpen(false);
    // Make sure the dropdown doesn't stay pinned open.
    try {
      inputRef.current?.blur?.();
    } catch {}
  };

  const hasAny = useMemo(() => {
    return (
      (results.products?.length || 0) +
        (results.masterclasses?.length || 0) +
        (results.elearnings?.length || 0) >
      0
    );
  }, [results]);

  const go = (q) => {
    const next = String(q || "").trim();
    if (!next) return;
    router.push(`/recherche?q=${encodeURIComponent(next)}`);
    close();
  };

  useEffect(() => {
    // Close the dropdown on navigation.
    close();
  }, [pathname]);

  useEffect(() => {
    const q = String(value || "").trim();
    if (!q) {
      setResults({ products: [], masterclasses: [], elearnings: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current?.abort?.();
    abortRef.current = ctrl;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        setResults({
          products: Array.isArray(data.products) ? data.products : [],
          masterclasses: Array.isArray(data.masterclasses)
            ? data.masterclasses
            : [],
          elearnings: Array.isArray(data.elearnings) ? data.elearnings : [],
        });
      } catch (e) {
        if (e?.name === "AbortError") return;
        setResults({ products: [], masterclasses: [], elearnings: [] });
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [value]);

  return (
    <form
      className="relative group max-w-3xl flex-1 min-w-0 hidden sm:block"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
    >
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors text-xl">
        search
      </span>
      <input
        className="w-full bg-[#162a31] border border-slate-700/50 rounded-2xl py-2 pl-12 pr-4 text-sm text-slate-200 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-slate-500 outline-none"
        placeholder="Rechercher des samples, templates, cours..."
        type="search"
        value={value}
        ref={inputRef}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => {
          if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
          setOpen(true);
        }}
        onBlur={() => {
          // Let clicks on dropdown register before closing.
          blurTimerRef.current = setTimeout(() => setOpen(false), 140);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue("");
            (e.currentTarget).blur();
            close();
          }
        }}
      />

      {open && String(value || "").trim() && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50">
          <div className="bg-[#0f1e23]/95 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(value)}
              className="w-full text-left px-4 py-3 hover:bg-slate-800/40 transition-colors flex items-center justify-between"
            >
              <span className="text-sm font-bold text-white truncate">
                Rechercher: {String(value || "").trim()}
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Entrée
              </span>
            </button>

            <div className="border-t border-slate-700/40" />

            <div className="max-h-[60vh] overflow-auto">
              {loading && (
                <div className="px-4 py-3 text-xs text-slate-400">
                  Recherche...
                </div>
              )}

              {!loading && !hasAny && (
                <div className="px-4 py-3 text-xs text-slate-500">
                  Aucun résultat.
                </div>
              )}

              {results.products?.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Produits
                  </div>
                  {results.products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        close();
                        router.push(`/product/${p.slug}`);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-800/40 transition-colors flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt=""
                          src={resolveMediaUrl(p.imageUrl) || "/logo.png"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {p.author ? `Par ${p.author}` : "Produit"}
                          {p.isPublished === false ? " • Non publié" : ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.masterclasses?.length > 0 && (
                <div className="py-2 border-t border-slate-800/60">
                  <div className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Masterclasses
                  </div>
                  {results.masterclasses.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        close();
                        router.push(`/masterclasses/${m.slug}`);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-800/40 transition-colors flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt=""
                          src={resolveMediaUrl(m.imageUrl) || "/logo.png"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">
                          {m.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {m.instructor ? `Par ${m.instructor}` : "Masterclass"}
                          {m.isPublished === false ? " • Non publiée" : ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.elearnings?.length > 0 && (
                <div className="py-2 border-t border-slate-800/60">
                  <div className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    E-learning
                  </div>
                  {results.elearnings.map((el) => (
                    <button
                      key={el.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        close();
                        router.push(`/e-learning/${el.slug}`);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-800/40 transition-colors flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt=""
                          src={resolveMediaUrl(el.imageUrl) || "/logo.png"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">
                          {el.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {el.instructor ? `Par ${el.instructor}` : "E-learning"}
                          {el.isPublished === false ? " • Non publiée" : ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
