import { EmployeeSidebar } from "@/components/layout/EmployeeSidebar";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: "hsl(40, 20%, 97%)" }}>
      <EmployeeSidebar />
      <main className="flex-1 p-8 lg:p-10 max-w-5xl overflow-y-auto">{children}</main>
    </div>
  );
}
