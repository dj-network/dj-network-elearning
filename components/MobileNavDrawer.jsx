"use client";

export default function MobileNavDrawer() {
  return (
    <label
      htmlFor="mobile-drawer"
      className="lg:hidden w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-slate-700/60 flex items-center justify-center transition-colors cursor-pointer"
      aria-label="Ouvrir le menu"
    >
      <span className="material-symbols-outlined">menu</span>
    </label>
  );
}

