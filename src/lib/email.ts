import nodemailer from "nodemailer";

// ── Transport ─────────────────────────────────────────────────────────────────

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Dev fallback: log to console instead of sending
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM = process.env.SMTP_FROM ?? "ELYO Wellbeing <no-reply@elyo.app>";

// ── HTML escaping ─────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Templates ─────────────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ELYO</title>
</head>
<body style="margin:0;padding:0;background:#faf9f6;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #f0ede8;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1f1c,#0d2a26);padding:28px 36px;">
            <span style="color:#14b8a6;font-size:22px;font-weight:700;letter-spacing:-0.5px;">ELYO</span>
            <span style="color:rgba(255,255,255,0.3);font-size:22px;"> · </span>
            <span style="color:rgba(255,255,255,0.6);font-size:14px;">Wellbeing Intelligence</span>
          </td>
        </tr>
        <!-- Content -->
        <tr><td style="padding:36px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f0ede8;background:#fafaf9;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Diese E-Mail wurde automatisch von ELYO Wellbeing generiert.
              Alle Daten sind anonymisiert und DSGVO-konform verarbeitet.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Send helpers ──────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const transport = getTransport();

  if (!transport) {
    // Dev mode: just log
    console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}`);
    return true;
  }

  try {
    await transport.sendMail({ from: FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error("[EMAIL] Send failed:", err);
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function sendCheckinReminder(opts: {
  to: string;
  name: string;
  companyName: string;
  checkinUrl: string;
}): Promise<boolean> {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Dein wöchentlicher Check-in</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
      Hallo ${opts.name}, wie geht es dir diese Woche? Dein Check-in für <strong>${opts.companyName}</strong> steht bereit.
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Es dauert nur <strong>60 Sekunden</strong> — 3 Schieberegler, vollständig anonym.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:linear-gradient(135deg,#14b8a6,#0d9488);border-radius:12px;padding:14px 28px;">
          <a href="${opts.checkinUrl}" style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
            Check-in starten →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#9ca3af;font-size:12px;">
      Deine Antworten sind anonym und werden nur aggregiert ausgewertet.
      Niemand kann deine individuellen Eingaben einsehen.
    </p>
  `;
  return send(opts.to, `✅ Dein ELYO Check-in für diese Woche`, baseTemplate(content));
}

export async function sendWeeklyDigest(opts: {
  to: string;
  name: string;
  companyName: string;
  avgScore: number;
  atRiskTeams: number;
  activeRate: number;
  dashboardUrl: string;
}): Promise<boolean> {
  const scoreColor = opts.avgScore >= 7.5 ? "#14b8a6" : opts.avgScore >= 6 ? "#4c8448" : opts.avgScore >= 4.5 ? "#d97706" : "#ef4444";

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Wöchentlicher Wellbeing-Report</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Hallo ${opts.name}, hier ist die Zusammenfassung für <strong>${opts.companyName}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-radius:12px;border:1px solid #f0ede8;overflow:hidden;">
      <tr style="background:#fafaf9;">
        <td style="padding:20px;text-align:center;border-right:1px solid #f0ede8;">
          <div style="font-size:32px;font-weight:700;color:${scoreColor};">${opts.avgScore.toFixed(1)}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Wellbeing Score</div>
        </td>
        <td style="padding:20px;text-align:center;border-right:1px solid #f0ede8;">
          <div style="font-size:32px;font-weight:700;color:${opts.atRiskTeams > 0 ? "#d97706" : "#14b8a6"};">${opts.atRiskTeams}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Teams mit Risiko</div>
        </td>
        <td style="padding:20px;text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#4c8448;">${opts.activeRate}%</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Aktive Nutzerquote</div>
        </td>
      </tr>
    </table>

    ${opts.atRiskTeams > 0 ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">⚠️ ${opts.atRiskTeams} Team${opts.atRiskTeams > 1 ? "s" : ""} mit erhöhtem Stresslevel</p>
      <p style="margin:4px 0 0;font-size:12px;color:#b45309;">Score unter 6.0 — empfehle weitere Maßnahmen.</p>
    </div>` : `
    <div style="background:#f0fdf9;border:1px solid #d1fae5;border-radius:12px;padding:16px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#065f46;font-weight:600;">✅ Alle Teams im grünen Bereich</p>
    </div>`}

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:linear-gradient(135deg,#14b8a6,#0d9488);border-radius:12px;padding:14px 28px;">
          <a href="${opts.dashboardUrl}" style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
            Dashboard öffnen →
          </a>
        </td>
      </tr>
    </table>
  `;
  return send(opts.to, `📊 ELYO Weekly Digest — ${opts.companyName}`, baseTemplate(content));
}

export async function sendInviteEmail(opts: {
  to: string
  companyName: string
  inviteUrl: string
}): Promise<boolean> {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Du wurdest zu ELYO eingeladen 🎉</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
      <strong>${opts.companyName}</strong> nutzt ELYO Wellbeing, um das Wohlbefinden im Team zu stärken.
      Du wurdest eingeladen, mitzumachen.
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      ELYO ist anonym, sicher und dauert weniger als 60 Sekunden täglich.
    </p>
    <a
      href="${opts.inviteUrl}"
      style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;"
    >
      Einladung annehmen →
    </a>
    <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;">
      Dieser Link ist 14 Tage gültig. Du kannst jederzeit ablehnen oder dein Konto löschen.
    </p>
  `
  return send(
    opts.to,
    `${opts.companyName} lädt dich zu ELYO Wellbeing ein`,
    baseTemplate(content),
  )
}

// ── Partner-Lifecycle-E-Mails ─────────────────────────────────────────────────

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://elyo.app'

export async function sendPartnerApprovedEmail(partner: { email: string; name: string }): Promise<void> {
  const content = `
    <h1 style="font-size:22px;color:#0a1f1c;margin:0 0 12px;">Willkommen bei ELYO, ${escapeHtml(partner.name)}.</h1>
    <p style="color:#374151;line-height:1.6;">
      Dein Partner-Profil wurde freigeschaltet. Ab sofort sehen ELYO-Mitarbeiter dein Angebot im Partner-Netzwerk.
    </p>
    <p style="margin:24px 0;">
      <a href="${APP_URL}/partner/dashboard" style="background:#14b8a6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Zum Dashboard
      </a>
    </p>
  `
  const html = baseTemplate(content)
  const transport = getTransport()
  if (!transport) {
    console.log('[email:partner_approved:dev]', partner.email)
    return
  }
  await transport.sendMail({ from: FROM, to: partner.email, subject: 'ELYO: Dein Partner-Profil ist freigeschaltet', html })
}

export async function sendPartnerRejectedEmail(
  partner: { email: string; name: string },
  reason: string,
): Promise<void> {
  const content = `
    <h1 style="font-size:22px;color:#0a1f1c;margin:0 0 12px;">Registrierung konnte nicht freigeschaltet werden</h1>
    <p style="color:#374151;line-height:1.6;">Hallo ${escapeHtml(partner.name)},</p>
    <p style="color:#374151;line-height:1.6;">
      wir haben deine Partner-Registrierung geprüft und sie konnte nicht freigeschaltet werden.
    </p>
    <p style="color:#374151;line-height:1.6;"><strong>Begründung:</strong> ${escapeHtml(reason)}</p>
    <p style="color:#374151;line-height:1.6;">
      Du kannst deine Angaben korrigieren und erneut einen Nachweis einreichen.
    </p>
    <p style="margin:24px 0;">
      <a href="${APP_URL}/partner/login" style="background:#14b8a6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Zum Login
      </a>
    </p>
  `
  const html = baseTemplate(content)
  const transport = getTransport()
  if (!transport) {
    console.log('[email:partner_rejected:dev]', partner.email, reason)
    return
  }
  await transport.sendMail({ from: FROM, to: partner.email, subject: 'ELYO: Registrierung konnte nicht freigeschaltet werden', html })
}

export async function sendPartnerSuspendedEmail(partner: { email: string; name: string }): Promise<void> {
  const content = `
    <h1 style="font-size:22px;color:#0a1f1c;margin:0 0 12px;">Partner-Profil vorübergehend ausgeblendet</h1>
    <p style="color:#374151;line-height:1.6;">Hallo ${escapeHtml(partner.name)},</p>
    <p style="color:#374151;line-height:1.6;">
      dein Partner-Profil wurde vorübergehend ausgeblendet. Bei Fragen wende dich bitte an den Support.
    </p>
  `
  const html = baseTemplate(content)
  const transport = getTransport()
  if (!transport) {
    console.log('[email:partner_suspended:dev]', partner.email)
    return
  }
  await transport.sendMail({ from: FROM, to: partner.email, subject: 'ELYO: Partner-Profil ausgeblendet', html })
}
