import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedPartners } from '../src/lib/partners/seed';

const prisma = new PrismaClient();

function weekKey(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(
    ((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function businessTimestamp(periodKey: string): Date {
  const [yearStr, wStr] = periodKey.split("-W");
  const year = parseInt(yearStr);
  const week = parseInt(wStr);
  const jan1 = new Date(year, 0, 1);
  const monday = new Date(jan1.getTime() + (week - 1) * 7 * 86400000);
  const dow = monday.getDay();
  monday.setDate(monday.getDate() + (dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow));
  const dayOffset = Math.floor(Math.random() * 5);
  const hourWeights = [7,8,9,9,9,10,10,11,12,13,14,14,15,15,16,17,18,19,20];
  const hour = hourWeights[Math.floor(Math.random() * hourWeights.length)];
  const minute = Math.floor(Math.random() * 60);
  const d = new Date(monday);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seeding ELYO demo data...");
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const company = await prisma.company.upsert({
    where: { slug: "demo-gmbh" },
    update: {},
    create: { name: "Demo GmbH", slug: "demo-gmbh", industry: "Technology", checkinFrequency: "WEEKLY", anonymityThreshold: 3 },
  });
  console.log("✅ Company:", company.name);

  await prisma.user.upsert({
    where: { email: "admin@demo.de" },
    update: {},
    create: { email: "admin@demo.de", name: "Anna Admin", passwordHash, role: "COMPANY_ADMIN", companyId: company.id },
  });

  const teamDefs = [
    { id: "seed-team-engineering", name: "Engineering", color: "#14b8a6" },
    { id: "seed-team-marketing",   name: "Marketing",   color: "#8b5cf6" },
    { id: "seed-team-hr",          name: "People & HR", color: "#f59e0b" },
  ];
  const teams = [];
  for (const td of teamDefs) {
    const t = await prisma.team.upsert({
      where: { id: td.id },
      update: {},
      create: { id: td.id, name: td.name, color: td.color, companyId: company.id },
    });
    teams.push(t);
  }
  console.log("✅ Teams:", teams.map(t => t.name).join(", "));

  const managerDefs = [
    { email: "manager.eng@demo.de", name: "Max Manager",  teamIdx: 0 },
    { email: "manager.mkt@demo.de", name: "Mia Marketing", teamIdx: 1 },
    { email: "manager.hr@demo.de",  name: "Helga HR",      teamIdx: 2 },
  ];
  for (const md of managerDefs) {
    const mgr = await prisma.user.upsert({
      where: { email: md.email },
      update: {},
      create: { email: md.email, name: md.name, passwordHash, role: "COMPANY_MANAGER", companyId: company.id, teamId: teams[md.teamIdx].id },
    });
    await prisma.team.update({ where: { id: teams[md.teamIdx].id }, data: { managerId: mgr.id } });
  }
  console.log("✅ Managers created");

  const allEmployees: { id: string; teamIdx: number }[] = [];
  let empIdx = 1;
  for (let ti = 0; ti < teams.length; ti++) {
    for (let e = 0; e < 6; e++) {
      const emp = await prisma.user.upsert({
        where: { email: `mitarbeiter${empIdx}@demo.de` },
        update: {},
        create: { email: `mitarbeiter${empIdx}@demo.de`, name: `Mitarbeiter ${empIdx}`, passwordHash, role: "EMPLOYEE", companyId: company.id, teamId: teams[ti].id },
      });
      allEmployees.push({ id: emp.id, teamIdx: ti });
      empIdx++;
    }
  }
  console.log(`✅ ${allEmployees.length} employees created`);

  const now = new Date();
  const periodKeys = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    return weekKey(d);
  });

  const teamProfile = [
    { moodBase: 6, stressBase: 4, energyBase: 5 },
    { moodBase: 7, stressBase: 3, energyBase: 7 },
    { moodBase: 4, stressBase: 7, energyBase: 4 },
  ];

  await prisma.wellbeingEntry.deleteMany({ where: { companyId: company.id } });

  let entryCount = 0;
  for (const { id: userId, teamIdx } of allEmployees) {
    const profile = teamProfile[teamIdx];
    for (const periodKey of periodKeys) {
      if (Math.random() < 0.15) continue;
      const mood   = Math.max(1, Math.min(10, profile.moodBase   + Math.floor(Math.random() * 3) - 1));
      const stress = Math.max(1, Math.min(10, profile.stressBase + Math.floor(Math.random() * 3) - 1));
      const energy = Math.max(1, Math.min(10, profile.energyBase + Math.floor(Math.random() * 3) - 1));
      const score  = Math.round(((mood + (11 - stress) + energy) / 3) * 10) / 10;
      const createdAt = businessTimestamp(periodKey);
      await prisma.wellbeingEntry.create({
        data: { userId, companyId: company.id, mood, stress, energy, score, periodKey, createdAt },
      });
      entryCount++;
    }
  }
  console.log(`✅ ${entryCount} wellbeing entries with business-hour timestamps`);

  const existingSurvey = await prisma.survey.findFirst({
    where: { companyId: company.id, title: "Quarterly Pulse Check" },
  });
  if (!existingSurvey) {
    await prisma.survey.create({
      data: {
        title: "Quarterly Pulse Check",
        description: "Kurzumfrage zu Teamklima und Arbeitsbelastung – 4 Fragen, 2 Minuten.",
        status: "ACTIVE",
        isAnonymous: true,
        companyId: company.id,
        questions: {
          create: [
            { text: "Wie zufrieden bist du mit dem Teamklima?", type: "SCALE", order: 0, scaleMinLabel: "Sehr unzufrieden", scaleMaxLabel: "Sehr zufrieden" },
            { text: "Fühlst du dich mit deiner Arbeitslast überfordert?", type: "YES_NO", order: 1 },
            { text: "Welches Thema sollte das Team als nächstes angehen?", type: "MULTIPLE_CHOICE", order: 2, options: JSON.stringify(["Kommunikation verbessern", "Meetings reduzieren", "Weiterbildung", "Prozesse vereinfachen"]) },
            { text: "Gibt es etwas, das du deiner Führungskraft mitteilen möchtest?", type: "TEXT", order: 3, isRequired: false },
          ],
        },
      },
    });
    console.log("✅ Demo survey created");
  }

  // WearableSync mock data for first employee
  const firstEmployee = allEmployees[0]
  if (firstEmployee) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const syncEntries = [
      { daysAgo: 2, steps: 7840, sleepHours: 7.1, heartRate: 68.5 },
      { daysAgo: 1, steps: 9210, sleepHours: 6.8, heartRate: 71.2 },
      { daysAgo: 0, steps: 4120, sleepHours: null, heartRate: 65.0 },
    ]
    for (const entry of syncEntries) {
      const date = new Date(today)
      date.setDate(date.getDate() - entry.daysAgo)
      await prisma.wearableSync.upsert({
        where: { userId_source_date: { userId: firstEmployee.id, source: 'google_health', date } },
        update: {},
        create: {
          userId: firstEmployee.id,
          source: 'google_health',
          date,
          steps: entry.steps,
          sleepHours: entry.sleepHours,
          heartRate: entry.heartRate,
        },
      })
    }
    console.log('✅ 3 WearableSync entries created for first employee')
  }

  // ── ELYO-Staff Seed ────────────────────────────────────────────────────────
  const elyoEmail = process.env.ELYO_INITIAL_ADMIN_EMAIL
  const elyoPassword = process.env.ELYO_INITIAL_ADMIN_PASSWORD
  if (elyoEmail && elyoPassword) {
    const elyoHash = await bcrypt.hash(elyoPassword, 12)
    await prisma.user.upsert({
      where: { email: elyoEmail },
      update: {},
      create: {
        email: elyoEmail,
        name: 'ELYO Admin',
        passwordHash: elyoHash,
        role: 'ELYO_ADMIN',
        companyId: null,
      },
    })
    console.log('✅ ELYO_ADMIN:', elyoEmail)
  } else {
    console.log('ℹ️  Skipped ELYO_ADMIN seed (ELYO_INITIAL_ADMIN_EMAIL/PASSWORD not set)')
  }

  // ── Partner Seed ───────────────────────────────────────────────────────────
  await seedPartners(prisma)
  console.log('✅ Seeded 8 demo partners')

  console.log("\n🎉 Seed complete!\n");
  console.log("  Company Admin:    admin@demo.de / demo1234");
  console.log("  Team Manager:     manager.eng@demo.de / demo1234");
  console.log("  Employee:         mitarbeiter1@demo.de / demo1234");
  console.log("  → http://localhost:3000/auth/login\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
