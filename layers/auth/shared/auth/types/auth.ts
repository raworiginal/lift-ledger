import { z } from "zod";
import {
  passwordChangeSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from "#shared/auth/schemas/auth";

export type SocialProvider = "google" | "github";

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ChangePasswordFormData = z.infer<typeof passwordChangeSchema>;
