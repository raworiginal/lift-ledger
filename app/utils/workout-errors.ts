import type { ZodType } from "zod";

export function readApiError(
  error: unknown,
  fallback: string,
): { statusCode?: number; message: string } {
  const candidate = error as {
    statusCode?: number;
    data?: { statusMessage?: string };
  };
  return {
    statusCode: candidate?.statusCode,
    message: candidate?.data?.statusMessage ?? fallback,
  };
}

export function firstIssueMessage(
  schema: ZodType,
  value: unknown,
): string | undefined {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}
