import { CompanySidebar } from "@/components/layout/CompanySidebar";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: "hsl(40, 20%, 97%)" }}>
      <CompanySidebar />
      <main className="flex-1 p-8 lg:p-10 max-w-6xl overflow-y-auto">{children}</main>
    </div>
  );
}
