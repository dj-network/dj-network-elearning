"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { resolveMediaUrl } from "@/libs/media";

function displayUserName(user) {
  const fn = (user?.firstName || "").trim();
  const ln = (user?.lastName || "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || user?.name || "Compte";
}

function getAccountLabel(user) {
  if (user?.role === "admin") {
    return { label: "ADMIN", colorClass: "text-secondary" };
  }
  if (user?.role === "formateur") {
    return { label: "FORMATEUR", colorClass: "text-amber-300" };
  }
  return {
    label: "ÉLÈVE",
    colorClass: "text-primary",
  };
}

export default function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const { label: planLabel, colorClass: planColorClass } = getAccountLabel(user);

  useEffect(() => {
    const onDoc = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-2xl px-2 py-1 hover:bg-slate-800/40 transition-colors"
        title="Compte"
      >
        <div className="hidden sm:block text-left">
          <p className="text-sm font-bold text-slate-100">
            {displayUserName(user)}
          </p>
          <div className="mt-0.5 flex items-center justify-start gap-2">
            <p className={`text-[10px] font-bold uppercase tracking-tighter ${planColorClass}`}>
              {planLabel}
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600/50 p-0.5 overflow-hidden flex items-center justify-center">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="User profile"
              className="w-full h-full object-cover rounded-full"
              src={resolveMediaUrl(user.image)}
            />
          ) : (
            <span className="material-symbols-outlined text-slate-400">
              person
            </span>
          )}
        </div>
        <span className="material-symbols-outlined text-slate-500 text-base hidden sm:block">
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-60">
          <div className="bg-[#0f1e23]/95 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="w-full px-4 py-3 hover:bg-slate-800/40 transition-colors flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-slate-300">
                settings
              </span>
              <span className="text-sm font-bold text-white">
                Paramètres
              </span>
            </Link>

            <div className="border-t border-slate-800/60" />

            <form action={onSignOut}>
              <button
                type="submit"
                className="w-full px-4 py-3 hover:bg-red-500/10 transition-colors flex items-center gap-3 text-left"
              >
                <span className="material-symbols-outlined text-red-400">
                  logout
                </span>
                <span className="text-sm font-bold text-red-200">
                  Déconnexion
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
