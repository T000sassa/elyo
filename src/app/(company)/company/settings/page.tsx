export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CompanySettingsPage() {
  const session = await auth();
  const company = await prisma.company.findUnique({
    where: { id: session!.user.companyId },
    select: { name: true, slug: true, industry: true, checkinFrequency: true, anonymityThreshold: true, billingEmail: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Einstellungen</h1>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Unternehmen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">Name</span>
            <span className="text-sm font-medium">{company?.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">Slug</span>
            <span className="text-sm font-medium">{company?.slug}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">Check-in Frequenz</span>
            <span className="text-sm font-medium">{company?.checkinFrequency === "DAILY" ? "Täglich" : "Wöchentlich"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500">Anonymitäts-Schwellenwert</span>
            <span className="text-sm font-medium">{company?.anonymityThreshold} Mitarbeiter</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
