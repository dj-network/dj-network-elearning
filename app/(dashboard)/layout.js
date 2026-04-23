import SidebarNav from "@/components/SidebarNav";
import HeaderBar from "@/components/HeaderBar";
import { auth } from "@/auth";

export default async function DashboardLayout({ children }) {
  const session = await auth();
  const role = session?.user?.role || "user";

  return (
    <div className="drawer lg:drawer-open h-screen overflow-hidden bg-bg-dark">
      <input id="mobile-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        <HeaderBar session={session} />

        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col">{children}</div>
        </main>
      </div>

      <div className="drawer-side z-[100]">
        <label
          htmlFor="mobile-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <div className="w-72 min-h-full bg-[#0f1e23]">
          <SidebarNav role={role} user={session?.user || null} variant="side" />
        </div>
      </div>
    </div>
  );
}
