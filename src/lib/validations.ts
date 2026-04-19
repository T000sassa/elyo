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
})

export const AnamnesisSchema = z.object({
  // Wave 1
  birthYear:      z.number().int().min(1920).max(new Date().getFullYear() - 16).optional(),
  biologicalSex:  z.enum(['male', 'female', 'diverse', 'prefer_not']).optional(),
  activityLevel:  z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  sleepQuality:   z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
  stressTendency: z.enum(['low', 'medium', 'high']).optional(),
  // Wave 2
  smokingStatus:  z.enum(['never', 'former', 'current']).optional(),
  nutritionType:  z.enum(['omnivore', 'vegetarian', 'vegan', 'other']).optional(),
  // Wave 3
  chronicPatterns: z.array(z.string().max(50)).max(10).optional(),
  hasMedication:  z.boolean().optional(),
});

export const PartnerRegisterSchema = z.object({
  email:        z.string().email('Ungültige E-Mail-Adresse'),
  password:     z.string().min(8, 'Mindestens 8 Zeichen'),
  name:         z.string().min(2, 'Mindestens 2 Zeichen').max(120),
  type:         z.enum(['LOCAL', 'EXPERT', 'DIGITAL']),
  categories:   z.array(z.string().min(1)).min(1, 'Mindestens eine Kategorie').max(6),
  description:  z.string().min(40, 'Mindestens 40 Zeichen').max(2000),
  address:      z.string().max(200).optional(),
  city:         z.string().max(100).optional(),
  website:      z.string().url().optional().or(z.literal('')),
  phone:        z.string().max(40).optional(),
  minimumLevel: z.enum(['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).default('STARTER'),
});

export const PartnerLoginSchema = z.object({
  email:    z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1),
});

export const AdminPartnerActionSchema = z.object({
  action:          z.enum(['approve', 'reject', 'suspend', 'unsuspend']),
  rejectionReason: z.string().min(5).max(500).optional(),
}).refine(
  (data) => data.action !== 'reject' || (data.rejectionReason && data.rejectionReason.length >= 5),
  { message: 'rejectionReason required for reject', path: ['rejectionReason'] },
);
