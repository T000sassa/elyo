import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HistoryPage() {
  const session = await auth();

  const entries = await prisma.wellbeingEntry.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { periodKey: true, score: true, mood: true, stress: true, energy: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Mein Verlauf</h1>

      {entries.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center text-slate-500">
            Noch keine Check-ins vorhanden.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.periodKey} className="shadow-card">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{e.periodKey}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(e.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Score</p>
                      <p className="font-bold text-elyo-600">{e.score.toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Stimmung</p>
                      <p className="font-semibold">{e.mood}/10</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Stress</p>
                      <p className="font-semibold text-amber-600">{e.stress}/10</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Energie</p>
                      <p className="font-semibold text-green-600">{e.energy}/10</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
