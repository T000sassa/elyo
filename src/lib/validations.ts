import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Mindestens 6 Zeichen"),
});

export const RegisterSchema = z.object({
  companyName: z.string().min(2, "Mindestens 2 Zeichen"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
  name: z.string().min(2, "Mindestens 2 Zeichen"),
});

export const CheckinSchema = z.object({
  mood: z.number().int().min(1).max(10),
  stress: z.number().int().min(1).max(10),
  energy: z.number().int().min(1).max(10),
  note: z.string().max(1000).optional(),
});

export const TeamSchema = z.object({
  name: z.string().min(2, "Mindestens 2 Zeichen"),
  description: z.string().optional(),
  color: z.string().optional(),
});

export const InviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["COMPANY_ADMIN", "COMPANY_MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  teamId: z.string().optional(),
});
