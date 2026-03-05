"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Check } from "lucide-react";

interface Team {
  id: string;
  name: string;
  description?: string;
  color?: string;
  _count: { members: number };
  manager?: { name: string } | null;
}

function InviteDialog({ teamId }: { teamId: string }) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch(`/api/company/teams/${teamId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setInviteUrl(data.inviteUrl);
  }

  function copy() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Mitarbeiter einladen</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label>E-Mail (optional)</Label>
          <Input
            placeholder="mitarbeiter@unternehmen.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-slate-500">Leer lassen für generischen Link</p>
        </div>
        {!inviteUrl ? (
          <Button onClick={generate} disabled={loading} className="w-full bg-elyo-500 hover:bg-elyo-600 text-white">
            {loading ? "Generiert..." : "Einladungslink erstellen"}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600 flex-1 truncate">{inviteUrl}</p>
              <button onClick={copy} className="text-slate-400 hover:text-elyo-500 transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">Link ist 7 Tage gültig.</p>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/company/teams")
      .then((r) => r.json())
      .then((d) => setTeams(d.teams ?? []));
  }, []);

  async function createTeam() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/company/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setTeams((t) => [...t, { ...data.team, _count: { members: 0 }, manager: null }]);
      setName("");
      setOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Teams</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-elyo-500 hover:bg-elyo-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Team erstellen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Teamname</Label>
                <Input placeholder="z.B. Engineering" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button onClick={createTeam} disabled={loading} className="w-full bg-elyo-500 hover:bg-elyo-600 text-white">
                {loading ? "Erstellt..." : "Team erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center text-slate-500">
            Noch keine Teams erstellt.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <Card key={team.id} className="shadow-card">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{team.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{team._count.members} Mitglieder</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Mitarbeiter einladen</Button>
                    </DialogTrigger>
                    <InviteDialog teamId={team.id} />
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
