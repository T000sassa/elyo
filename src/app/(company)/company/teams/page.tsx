"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Copy, Check, Users, ChevronDown, ChevronUp,
  UserX, UserCheck, Mail, Shield, Crown, Clock, Loader2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: "COMPANY_ADMIN" | "COMPANY_MANAGER" | "EMPLOYEE";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  color?: string | null;
  _count: { members: number };
  manager?: { name: string } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<Member["role"], string> = {
  COMPANY_ADMIN: "Admin",
  COMPANY_MANAGER: "Manager",
  EMPLOYEE: "Mitarbeiter",
};

const ROLE_ICON: Record<Member["role"], React.ReactNode> = {
  COMPANY_ADMIN: <Crown className="w-3 h-3" />,
  COMPANY_MANAGER: <Shield className="w-3 h-3" />,
  EMPLOYEE: null,
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Noch nie";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  if (days < 7) return `Vor ${days} Tagen`;
  if (days < 30) return `Vor ${Math.floor(days / 7)} Wochen`;
  return `Vor ${Math.floor(days / 30)} Monaten`;
}

// ── InviteDialog (inline panel) ───────────────────────────────────────────────

function InvitePanel({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch(`/api/company/teams/${teamId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() || undefined }),
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
    <div
      className="mt-4 rounded-2xl p-5 space-y-4"
      style={{ background: "#f0fdf9", border: "1px solid #d1fae5" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Einladungslink erstellen</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">Schließen</button>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail (optional)"
          className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
          style={{ border: "1px solid #a7f3d0", background: "#fff" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#14b8a6")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#a7f3d0")}
        />
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generieren"}
        </button>
      </div>
      {inviteUrl && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#fff", border: "1px solid #a7f3d0" }}>
          <span className="flex-1 text-xs text-gray-600 truncate font-mono">{inviteUrl}</span>
          <button onClick={copy} className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-gray-100">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      )}
      {inviteUrl && <p className="text-xs text-gray-400">Link ist 7 Tage gültig.</p>}
    </div>
  );
}

// ── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({ member, onToggle }: { member: Member; onToggle: (id: string, active: boolean) => void }) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    await onToggle(member.id, !member.isActive);
    setToggling(false);
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{
        background: member.isActive ? "#ffffff" : "#fafaf9",
        border: "1px solid #f0ede8",
        opacity: member.isActive ? 1 : 0.6,
      }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{
          background: member.isActive ? "linear-gradient(135deg, #14b8a6, #0d9488)" : "#e5e7eb",
          color: member.isActive ? "#fff" : "#9ca3af",
        }}
      >
        {(member.name ?? member.email)[0].toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-800 truncate">{member.name ?? "—"}</p>
          {ROLE_ICON[member.role] && (
            <span className="text-gray-400 flex-shrink-0">{ROLE_ICON[member.role]}</span>
          )}
          {!member.isActive && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Inaktiv</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
            <Mail className="w-3 h-3 flex-shrink-0" />
            {member.email}
          </span>
          <span className="text-xs text-gray-300 flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3" />
            {timeAgo(member.lastLoginAt)}
          </span>
        </div>
      </div>

      {/* Role badge */}
      <span
        className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
        style={{
          background: member.role === "EMPLOYEE" ? "#f0fdf9" : "#fffbeb",
          color: member.role === "EMPLOYEE" ? "#0d9488" : "#d97706",
        }}
      >
        {ROLE_LABEL[member.role]}
      </span>

      {/* Toggle */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        title={member.isActive ? "Deaktivieren" : "Reaktivieren"}
        className="flex-shrink-0 p-1.5 rounded-lg transition-all"
        style={{
          color: member.isActive ? "#9ca3af" : "#14b8a6",
          background: "transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = member.isActive ? "#fef2f2" : "#f0fdf9";
          e.currentTarget.style.color = member.isActive ? "#ef4444" : "#0d9488";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = member.isActive ? "#9ca3af" : "#14b8a6";
        }}
      >
        {toggling ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : member.isActive ? (
          <UserX className="w-4 h-4" />
        ) : (
          <UserCheck className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

// ── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  onInvite,
}: {
  team: Team;
  onInvite: (teamId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const tc = team.color ?? "#14b8a6";

  async function loadMembers() {
    if (members !== null) return;
    setLoadingMembers(true);
    const res = await fetch(`/api/company/teams/${team.id}/members`);
    const data = await res.json();
    setMembers(data.members ?? []);
    setLoadingMembers(false);
  }

  function toggle() {
    if (!expanded) loadMembers();
    setExpanded((e) => !e);
  }

  function handleToggleMember(userId: string, isActive: boolean) {
    return fetch(`/api/company/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setMembers((prev) =>
            prev ? prev.map((m) => (m.id === userId ? { ...m, isActive: data.user.isActive } : m)) : prev
          );
        }
      });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ border: "1px solid #f0ede8", background: "#ffffff" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer group"
        style={{ borderLeft: `3px solid ${tc}` }}
        onClick={toggle}
      >
        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: tc, boxShadow: `0 0 8px ${tc}66` }}
        />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{team.name}</p>
          {team.manager && (
            <p className="text-xs text-gray-400 mt-0.5">Leitung: {team.manager.name}</p>
          )}
        </div>

        {/* Member count */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium text-gray-600">{team._count.members}</span>
        </div>

        {/* Invite button */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowInvite((s) => !s); if (!expanded) { loadMembers(); setExpanded(true); } }}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "#f0fdf9", color: "#0d9488", border: "1px solid #d1fae5" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#d1fae5"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#f0fdf9"; }}
        >
          + Einladen
        </button>

        {/* Expand chevron */}
        <div className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid #f0ede8" }}>
          {showInvite && (
            <InvitePanel teamId={team.id} onClose={() => setShowInvite(false)} />
          )}

          <div className="mt-4 space-y-2">
            {loadingMembers ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Mitglieder laden…
              </div>
            ) : members && members.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">Noch keine Mitglieder in diesem Team.</p>
                <p className="text-xs text-gray-300 mt-1">Lade Mitarbeiter über den Einladungslink ein.</p>
              </div>
            ) : (
              members?.map((member) => (
                <MemberRow key={member.id} member={member} onToggle={handleToggleMember} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/company/teams")
      .then((r) => r.json())
      .then((d) => setTeams(d.teams ?? []));
  }, []);

  async function createTeam() {
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/company/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setTeams((t) => [...t, { ...data.team, _count: { members: 0 }, manager: null }]);
      setName("");
      setShowCreate(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">Organisation</p>
          <h1
            className="text-3xl font-semibold text-gray-900 leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Teams
          </h1>
          <p className="text-gray-400 text-sm mt-1">{teams.length} Teams · Mitarbeiterverwaltung</p>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
        >
          <Plus className="w-4 h-4" />
          Team erstellen
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}
        >
          <p className="text-sm font-semibold text-gray-700">Neues Team</p>
          <div className="flex gap-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTeam()}
              placeholder="z.B. Engineering, Marketing…"
              className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none"
              style={{ border: "1px solid hsl(200, 15%, 88%)", background: "#fff" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#14b8a6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(200, 15%, 88%)")}
            />
            <button
              onClick={createTeam}
              disabled={creating || !name.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Erstellen"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setName(""); }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Teams list */}
      {teams.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: "#fafaf9", border: "1px solid #f0ede8" }}
        >
          <div className="text-4xl mb-3">👥</div>
          <p className="font-semibold text-gray-700">Noch keine Teams erstellt</p>
          <p className="text-sm text-gray-400 mt-1">Erstelle dein erstes Team und lade Mitarbeiter ein.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} onInvite={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
