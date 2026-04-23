"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { resolveMediaUrl } from "@/libs/media";

const menuItems = [
  { href: "/", icon: "school", label: "Mes formations" },
];

function NavLink({ href, icon, label, isActive, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isActive
          ? "bg-primary/10 text-primary border border-primary/20"
          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
      }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

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

  return { label: "ÉLÈVE", colorClass: "text-primary" };
}

export default function SidebarNav({ role = "user", user = null, onNavigate }) {
  const pathname = usePathname();
  const isStaff = role === "admin" || role === "formateur";
  const isAdmin = role === "admin";
  const { label: accountLabel, colorClass: accountColorClass } = getAccountLabel(user);

  const handleNavigate = () => {
    const toggle = document.getElementById("mobile-drawer");
    if (toggle) toggle.checked = false;
    if (onNavigate) onNavigate();
  };

  const asideClass = "w-full bg-[#0f1e23] flex flex-col h-full";

  return (
    <aside className={asideClass}>
      {/* Logo */}
      <Link href="/" className="h-[72px] px-6 py-2 flex items-center justify-start hover:opacity-80 transition-opacity">
        <Image
          src="/logo.png"
          alt="DJ Network Hub"
          width={160}
          height={48}
          className="w-auto h-10"
          priority
        />
      </Link>

      {/* Main Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4">
        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 py-4">
          LMS
        </div>
        {menuItems.map((item) => (
          <NavLink
            key={item.href + item.label}
            {...item}
            isActive={pathname === item.href}
            onNavigate={handleNavigate}
          />
        ))}

        {isStaff && (
          <>
            <div className="text-secondary text-[10px] font-bold uppercase tracking-widest px-3 py-4 mt-4">
              Administration
            </div>
            <NavLink
              href="/admin/e-learning"
              icon="school"
              label="Formations LMS"
              isActive={pathname === "/admin/e-learning"}
              onNavigate={handleNavigate}
            />
            {isAdmin ? (
              <NavLink
                href="/admin/access"
                icon="manage_accounts"
                label="Accès élèves"
                isActive={pathname === "/admin/access"}
                onNavigate={handleNavigate}
              />
            ) : null}
          </>
        )}
      </nav>

      {user ? (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800/70">
          <Link
            href="/settings"
            onClick={handleNavigate}
            className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-[#162a31]/70 px-3 py-3 hover:border-primary/30 hover:bg-[#162a31] transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700/60 overflow-hidden flex items-center justify-center shrink-0">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Photo de profil"
                  src={resolveMediaUrl(user.image)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-slate-400">person</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">
                {displayUserName(user)}
              </p>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${accountColorClass}`}>
                  {accountLabel}
                </span>
              </div>
            </div>
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
