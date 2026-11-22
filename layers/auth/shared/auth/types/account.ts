export type LinkedAccount = {
  id: string;
  providerId: string;
  accountId: string;
};

export type UserSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  current: boolean;
};
