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

export const OnboardingSchema = z.object({
  companyName:        z.string().min(2, 'Mindestens 2 Zeichen').max(120),
  industry:           z.string().max(80).optional(),
  employeeRange:      z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  country:            z.string().length(2).default('DE'),
  adminName:          z.string().min(2, 'Mindestens 2 Zeichen').max(100),
  email:              z.string().email('Ungültige E-Mail-Adresse'),
  password:           z.string().min(8, 'Mindestens 8 Zeichen'),
  anonymityThreshold: z.number().int().min(3).max(20).default(5),
  checkinFrequency:   z.enum(['DAILY', 'WEEKLY']).default('WEEKLY'),
});

export const BulkInviteSchema = z.object({
  emails: z.array(z.string().email('Ungültige E-Mail-Adresse')).min(1).max(500),
});
