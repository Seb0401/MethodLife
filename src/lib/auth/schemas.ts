import { z } from "zod";
import { es } from "@/lib/i18n/es";

export const loginSchema = z.object({
  email: z.email(es.auth.errors.emailInvalid),
  password: z.string().min(8, es.auth.errors.passwordMin),
});

export const registerSchema = loginSchema.extend({
  displayName: z.string().trim().min(1, es.auth.errors.nameRequired),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
