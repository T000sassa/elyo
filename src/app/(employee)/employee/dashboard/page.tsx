import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function scoreColor(score: number) {
  if (score >= 7) return "text-elyo-600";
  if (score >= 5) return "text-amber-600";
  return "text-red-500";
}

function scoreLabel(score: number) {
  if (score >= 7.5) return "Sehr gut";
  if (score >= 6) return "Gut";
  if (score >= 4.5) return "OK";
  if (score >= 3) return "Niedrig";
  return "Sehr niedrig";
}

export default async function EmployeeDashboard() {
  const session = await auth();
  const userId = session!.user.id;

  const entries = await prisma.wellbeingEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 7,
    select: { periodKey: true, score: true, mood: true, stress: true, energy: true, createdAt: true },
  });

  const latest = entries[0] ?? null;
  const hasCheckinToday = !!latest;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hallo, {session!.user.name ?? "👋"}</h1>
          <p className="text-slate-500 mt-1">Dein persönliches Wellbeing-Dashboard</p>
        </div>
        <Link href="/employee/checkin">
          <Button className="bg-elyo-500 hover:bg-elyo-600 text-white">
            + Check-in starten
          </Button>
        </Link>
      </div>

      {/* Score-Karte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card col-span-1 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Aktueller Score</CardTitle>
          </CardHeader>
          <CardContent>
            {latest ? (
              <>
                <p className={`text-4xl font-bold ${scoreColor(latest.score)}`}>
                  {latest.score.toFixed(1)}
                </p>
                <p className="text-sm text-slate-500 mt-1">{scoreLabel(latest.score)}</p>
              </>
            ) : (
              <p className="text-slate-400 text-sm">Noch kein Check-in</p>
            )}
          </CardContent>
        </Card>

        {latest && (
          <>
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Stimmung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-elyo-600">{latest.mood}/10</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Stress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{latest.stress}/10</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Energie</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{latest.energy}/10</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Letzten 7 Perioden */}
      {entries.length > 1 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Verlauf (letzte {entries.length} Einträge)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {[...entries].reverse().map((e) => (
                <div key={e.periodKey} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-elyo-400 min-h-[4px] transition-all"
                    style={{ height: `${(e.score / 10) * 88}px` }}
                    title={`${e.periodKey}: ${e.score.toFixed(1)}`}
                  />
                  <span className="text-[10px] text-slate-400 truncate max-w-full">
                    {e.periodKey.slice(-3)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!hasCheckinToday && (
        <Card className="shadow-card border-elyo-200 bg-elyo-50">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-elyo-800">Kein Check-in für diese Periode</p>
              <p className="text-sm text-elyo-600 mt-1">Nimm dir 2 Minuten für dein Wellbeing.</p>
            </div>
            <Link href="/employee/checkin">
              <Button className="bg-elyo-500 hover:bg-elyo-600 text-white">Jetzt starten</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
