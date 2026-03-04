import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAggregatedMetrics, getTrendData } from "@/lib/anonymize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function KpiCard({
  label,
  value,
  max = 10,
  colorClass = "text-elyo-600",
}: {
  label: string;
  value: number;
  max?: number;
  colorClass?: string;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${colorClass}`}>{value.toFixed(1)}</p>
        <p className="text-xs text-slate-400 mt-1">von {max}</p>
      </CardContent>
    </Card>
  );
}

export default async function CompanyDashboard() {
  const session = await auth();
  const companyId = session!.user.companyId;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, anonymityThreshold: true },
  });

  const [metrics, teams] = await Promise.all([
    getAggregatedMetrics(companyId),
    prisma.team.findMany({
      where: { companyId },
      select: { id: true, name: true, color: true, _count: { select: { members: true } } },
    }),
  ]);

  const teamsWithMetrics = await Promise.all(
    teams.map(async (team) => {
      const m = await getAggregatedMetrics(companyId, { teamId: team.id });
      return { ...team, metrics: m };
    })
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{company?.name}</h1>
          <p className="text-slate-500 mt-1">Wellbeing-Übersicht deines Unternehmens</p>
        </div>
        <Link href="/company/teams">
          <Button variant="outline">Teams verwalten</Button>
        </Link>
      </div>

      {/* Anonymitäts-Badge */}
      <div className="flex items-center gap-2 text-sm text-elyo-700 bg-elyo-50 border border-elyo-200 rounded-lg px-4 py-2.5 w-fit">
        <Shield className="w-4 h-4" />
        Alle Daten anonymisiert — Mindestgröße: {company?.anonymityThreshold} Mitarbeiter
      </div>

      {/* KPIs */}
      {metrics.isAboveThreshold ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Wellbeing Score" value={metrics.avgScore} colorClass={metrics.avgScore >= 7 ? "text-elyo-600" : metrics.avgScore >= 5 ? "text-amber-600" : "text-red-500"} />
          <KpiCard label="Stimmung" value={metrics.avgMood} />
          <KpiCard label="Stress" value={metrics.avgStress} colorClass="text-amber-600" />
          <KpiCard label="Energie" value={metrics.avgEnergy} colorClass="text-green-600" />
        </div>
      ) : (
        <Card className="shadow-card border-slate-200">
          <CardContent className="pt-6 text-center text-slate-500">
            Noch nicht genug Check-ins für eine Auswertung.
            <br />
            <span className="text-sm">Mindestens {company?.anonymityThreshold} Mitarbeiter müssen sich eingeloggt haben.</span>
          </CardContent>
        </Card>
      )}

      {/* Teams */}
      {teamsWithMetrics.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Teams</h2>
          <div className="space-y-3">
            {teamsWithMetrics.map((team) => (
              <Card key={team.id} className="shadow-card">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.color ?? "#14b8a6" }}
                      />
                      <div>
                        <p className="font-medium text-slate-800">{team.name}</p>
                        <p className="text-xs text-slate-400">{team._count.members} Mitglieder</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {team.metrics.isAboveThreshold ? (
                        <>
                          <div className="text-center">
                            <p className="text-xs text-slate-400">Score</p>
                            <p className={`font-bold ${team.metrics.avgScore >= 7 ? "text-elyo-600" : team.metrics.avgScore >= 5 ? "text-amber-600" : "text-red-500"}`}>
                              {team.metrics.avgScore.toFixed(1)}
                            </p>
                          </div>
                          {team.metrics.avgScore < 6 && (
                            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                              Erhöhter Stress
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Zu wenig Daten (min. {company?.anonymityThreshold})
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
