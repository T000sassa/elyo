import { Card, CardContent } from "@/components/ui/card";

export default function EmployeeSurveysPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Umfragen</h1>
      <Card className="shadow-card">
        <CardContent className="pt-6 text-center text-slate-500">
          Keine offenen Umfragen. 🎉
        </CardContent>
      </Card>
    </div>
  );
}
