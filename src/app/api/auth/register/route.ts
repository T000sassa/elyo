import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let i = 0;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${++i}`;
  }
  return slug;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { companyName, email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-Mail bereits registriert." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const slug = await uniqueSlug(companyName);

  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug,
      users: {
        create: {
          email,
          name,
          passwordHash,
          role: "COMPANY_ADMIN",
        },
      },
    },
  });

  return NextResponse.json({ success: true, companyId: company.id }, { status: 201 });
}
