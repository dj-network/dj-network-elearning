import { signOut } from "@/auth";
import Link from "next/link";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import UserMenu from "@/components/UserMenu";

export default function HeaderBar({ session }) {
  const role = session?.user?.role || "user";

  return (
    <header className="h-[72px] sticky top-0 z-30 flex items-center justify-between px-8 lg:px-10 py-2 bg-[#0f1e23]/95 backdrop-blur-xl shrink-0 border-b border-transparent">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <MobileNavDrawer role={role} />

        <div className="hidden sm:block min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">
            Espace e-learning
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 sm:gap-6 ml-4 sm:ml-8 shrink-0">
        {session ? (
          <>
            <UserMenu
              user={session.user}
              onSignOut={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            />
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 rounded-xl transition-colors font-bold text-sm"
          >
            Se connecter
            <span className="material-symbols-outlined text-sm font-bold">
              login
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
