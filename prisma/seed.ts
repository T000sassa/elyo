import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ELYO demo data...");

  const passwordHash = await bcrypt.hash("demo1234", 12);

  // Demo-Company
  const company = await prisma.company.upsert({
    where: { slug: "demo-gmbh" },
    update: {},
    create: {
      name: "Demo GmbH",
      slug: "demo-gmbh",
      industry: "Technology",
      checkinFrequency: "WEEKLY",
      anonymityThreshold: 3, // Kleiner Schwellenwert für Demo
    },
  });

  console.log("✅ Company created:", company.name);

  // Admin-User
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.de" },
    update: {},
    create: {
      email: "admin@demo.de",
      name: "Anna Admin",
      passwordHash,
      role: "COMPANY_ADMIN",
      companyId: company.id,
    },
  });

  console.log("✅ Admin:", admin.email);

  // Team
  const team = await prisma.team.upsert({
    where: { id: "seed-team-engineering" },
    update: {},
    create: {
      id: "seed-team-engineering",
      name: "Engineering",
      color: "#14b8a6",
      companyId: company.id,
    },
  });

  // 8 Demo-Mitarbeiter
  const employees = [];
  for (let i = 1; i <= 8; i++) {
    const emp = await prisma.user.upsert({
      where: { email: `mitarbeiter${i}@demo.de` },
      update: {},
      create: {
        email: `mitarbeiter${i}@demo.de`,
        name: `Mitarbeiter ${i}`,
        passwordHash,
        role: "EMPLOYEE",
        companyId: company.id,
        teamId: team.id,
      },
    });
    employees.push(emp);
  }

  console.log(`✅ ${employees.length} employees created`);

  // 4 Wochen Wellbeing-Daten
  const now = new Date();
  const weekKeys = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const weekNum = Math.ceil(
      ((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 +
        new Date(d.getFullYear(), 0, 1).getDay() +
        1) /
        7
    );
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  });

  for (const emp of employees) {
    for (const periodKey of weekKeys) {
      const mood = Math.floor(Math.random() * 4) + 6; // 6-9
      const stress = Math.floor(Math.random() * 4) + 3; // 3-6
      const energy = Math.floor(Math.random() * 4) + 5; // 5-8
      const score = Math.round(((mood + (11 - stress) + energy) / 3) * 10) / 10;

      await prisma.wellbeingEntry.upsert({
        where: { userId_periodKey: { userId: emp.id, periodKey } },
        update: {},
        create: {
          userId: emp.id,
          companyId: company.id,
          mood,
          stress,
          energy,
          score,
          periodKey,
        },
      });
    }
  }

  console.log("✅ Wellbeing entries seeded for", weekKeys.length, "weeks");

  console.log("\n🎉 Seed complete!\n");
  console.log("  Company Admin:  admin@demo.de / demo1234");
  console.log("  Employee:       mitarbeiter1@demo.de / demo1234");
  console.log("  → Login: http://localhost:3000/auth/login\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
