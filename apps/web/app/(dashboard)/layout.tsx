import { NavBar } from "@/components/layout/NavBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="app-main">{children}</main>
    </div>
  );
}
