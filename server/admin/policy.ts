type User = { id: string; role?: string | null };

const authorizationError = (message: string) => {
  const error = new Error(message) as Error & { statusCode: number };
  error.name = "AuthorizationError";
  error.statusCode = 403;
  return error;
};

export function assertAdminUser(user: User | null | undefined): void {
  if (user?.role !== "admin") {
    throw authorizationError("Admin role required");
  }
}

export function assertUserMutationAllowed({
  actor,
  target,
  action,
  adminCount,
}: {
  actor: User;
  target: User;
  action: "delete" | "demote";
  adminCount: number;
}): void {
  assertAdminUser(actor);

  if (actor.id === target.id && (action === "delete" || action === "demote")) {
    throw authorizationError("Users cannot modify themselves");
  }

  if (
    adminCount <= 1 &&
    target.role === "admin" &&
    (action === "delete" || action === "demote")
  ) {
    throw authorizationError("Cannot remove the last admin");
  }
}
