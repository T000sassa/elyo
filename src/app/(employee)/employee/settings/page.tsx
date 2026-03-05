export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EmployeeSettingsPage() {
  const session = await auth();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Einstellungen</h1>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Mein Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">Name</span>
            <span className="text-sm font-medium">{session?.user.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500">E-Mail</span>
            <span className="text-sm font-medium">{session?.user.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
