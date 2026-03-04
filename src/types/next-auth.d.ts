import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      companyId: string;
    };
  }

  interface User {
    role: Role;
    companyId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    companyId: string;
  }
}
