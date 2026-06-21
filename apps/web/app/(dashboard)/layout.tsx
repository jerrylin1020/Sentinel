import { NavBar } from "@/components/layout/NavBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-[1400px] px-4 py-4">{children}</main>
    </div>
  );
}
