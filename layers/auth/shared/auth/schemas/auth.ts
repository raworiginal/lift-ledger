import { z } from "zod";
import { nameSchema, passwordSchema } from "./fields";

export const registerSchema = z
  .object({
    email: z.email("Enter a valid email address"),
    name: nameSchema,
    password: passwordSchema,

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string(),
});

export const profileSchema = z.object({
  name: nameSchema,
  image: z.url("Enter a valid URL").or(z.literal("")),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
