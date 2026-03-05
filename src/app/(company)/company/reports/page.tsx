export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { getTrendData } from "@/lib/anonymize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  const trend = await getTrendData(session!.user.companyId, { limit: 12 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 mt-1">Wellbeing-Trends über Zeit</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-elyo-700 bg-elyo-50 border border-elyo-200 rounded-lg px-4 py-2.5 w-fit">
        <Shield className="w-4 h-4" />
        Nur Perioden mit ausreichend Daten werden angezeigt
      </div>

      {trend.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center text-slate-500">
            Noch keine auswertbaren Daten vorhanden.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Score-Verlauf</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-4 font-medium text-slate-500">Periode</th>
                    <th className="text-right py-2 pr-4 font-medium text-slate-500">Score</th>
                    <th className="text-right py-2 pr-4 font-medium text-slate-500">Stimmung</th>
                    <th className="text-right py-2 pr-4 font-medium text-slate-500">Stress</th>
                    <th className="text-right py-2 font-medium text-slate-500">Energie</th>
                    <th className="text-right py-2 font-medium text-slate-500">Teilnahme</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((row) => (
                    <tr key={row.period} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium text-slate-800">{row.period}</td>
                      <td className={`text-right py-3 pr-4 font-bold ${row.avgScore >= 7 ? "text-elyo-600" : row.avgScore >= 5 ? "text-amber-600" : "text-red-500"}`}>
                        {row.avgScore.toFixed(1)}
                      </td>
                      <td className="text-right py-3 pr-4 text-slate-700">{row.avgMood.toFixed(1)}</td>
                      <td className="text-right py-3 pr-4 text-amber-600">{row.avgStress.toFixed(1)}</td>
                      <td className="text-right py-3 text-green-600">{row.avgEnergy.toFixed(1)}</td>
                      <td className="text-right py-3 text-slate-500">{row.respondents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
