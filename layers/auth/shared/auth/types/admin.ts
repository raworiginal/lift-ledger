import { z } from "zod";
import {
  createAdminUserSchema,
  editAdminUserSchema,
  listUsersOptionsSchema,
  listAdminUserProvidersResultSchema,
  resetAdminUserPasswordSchema,
  banAdminUserSchema,
  unbanAdminUserSchema,
  listAdminUserSessionsSchema,
  adminUserSessionSchema,
  selectedAdminUserSessionIdSchema,
  selectedAdminUserIdSchema,
  revokeAllAdminUserSessionsSchema,
} from "#shared/auth/schemas/admin";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | Date | null;
  providers?: string[];
};

export type ListUsersSearchOptions = {
  searchValue?: string;
  searchField?: "email" | "name";
  searchOperator?: "contains" | "starts_with" | "ends_with";
};

export type ListUsersResult = {
  users: AdminUser[];
  total: number;
  limit?: number;
  offset?: number;
};

export type ListUsersOptions = z.infer<typeof listUsersOptionsSchema>;
export type ListAdminUserProvidersResult = z.infer<
  typeof listAdminUserProvidersResultSchema
>;

export type CreateAdminUserFormData = z.input<typeof createAdminUserSchema>;

export type ResetAdminUserPasswordFormData = Omit<
  z.input<typeof resetAdminUserPasswordSchema>,
  "userId"
>;
export type ResetAdminUserPasswordInput = z.input<
  typeof resetAdminUserPasswordSchema
>;
export type EditAdminUserFormData = Omit<
  z.input<typeof editAdminUserSchema>,
  "userId"
>;
export type EditAdminUserInput = z.output<typeof editAdminUserSchema>;

export type BanAdminUserFormData = Omit<
  z.input<typeof banAdminUserSchema>,
  "userId"
>;
export type BanAdminUserInput = z.input<typeof banAdminUserSchema>;

export type UnbanAdminUserInput = z.input<typeof unbanAdminUserSchema>;

export type ListAdminUserSessionsInput = z.input<
  typeof listAdminUserSessionsSchema
>;
export type AdminUserSession = z.infer<typeof adminUserSessionSchema>;
export type RevokeAdminUserSessionInput = z.input<
  typeof selectedAdminUserSessionIdSchema
>;
export type RevokeAllAdminUserSessionsInput = z.input<
  typeof revokeAllAdminUserSessionsSchema
>;
export type RemoveAdminUserInput = z.input<typeof selectedAdminUserIdSchema>;
