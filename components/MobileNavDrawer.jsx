"use client";

export default function MobileNavDrawer() {
  return (
    <label
      htmlFor="mobile-drawer"
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/50 text-slate-200 transition-colors hover:bg-slate-800 lg:hidden"
      aria-label="Ouvrir le menu"
    >
      <span className="material-symbols-outlined">menu</span>
    </label>
  );
}
