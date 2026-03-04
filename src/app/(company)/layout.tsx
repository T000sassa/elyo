import { CompanySidebar } from "@/components/layout/CompanySidebar";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <CompanySidebar />
      <main className="flex-1 p-8 max-w-6xl">{children}</main>
    </div>
  );
}
