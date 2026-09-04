import { readBody } from "h3";
import { assertUserMutationAllowed } from "./policy.ts";
import { withAdminMutationLock } from "./mutation-lock.ts";

type User = {
  id: string;
  name?: string;
  email?: string;
  role?: string | null;
  banned?: boolean | null;
  createdAt?: Date | string;
  [key: string]: unknown;
};

type Dependencies = {
  auth?: { api: Record<string, (input: any) => Promise<any>> };
  getSession?: (event: any) => Promise<{ user: User } | null>;
  readBody?: (event: any) => Promise<Record<string, unknown>>;
  getUserId?: (event: any) => string | undefined;
};

type ResolvedDependencies = {
  auth: any;
  getSession: NonNullable<Dependencies["getSession"]>;
  readBody: NonNullable<Dependencies["readBody"]>;
  getUserId: NonNullable<Dependencies["getUserId"]>;
};

const error = (statusCode: number, statusMessage: string) => {
  const result = new Error(statusMessage) as Error & { statusCode: number };
  result.statusCode = statusCode;
  return result;
};

const safeAuthError = (operation: string, message: string, cause: unknown) => {
  console.error(`[admin] ${operation} failed`, cause);
  return error(500, message);
};

const authCall = async <T>(operation: string, message: string, call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (cause) {
    throw safeAuthError(operation, message, cause);
  }
};

const sanitize = (user: User) => {
  const allowed = ["id", "name", "email", "role", "banned", "banReason", "banExpires", "createdAt"];
  return Object.fromEntries(allowed.filter((key) => user[key] !== undefined).map((key) => [key, user[key]]));
};

const runtimeDependencies = (event: any, deps: Dependencies): ResolvedDependencies => {
  const auth = deps.auth ?? serverAuth(event);
  const authWithHeaders = event?.headers
    ? {
        ...auth,
        api: new Proxy(auth.api, {
          get(target, property, receiver) {
            const method = Reflect.get(target, property, receiver);
            if (typeof method !== "function") return method;
            return (input: Record<string, unknown> = {}) =>
              method.call(target, { ...input, headers: event.headers });
          },
        }),
      }
    : auth;

  return {
  auth: authWithHeaders,
  getSession: deps.getSession ?? getUserSession,
  readBody: deps.readBody ?? readBody,
  getUserId: deps.getUserId ?? ((currentEvent: any) => getRouterParam(currentEvent, "id")),
  } as ResolvedDependencies;
};

const USER_PAGE_SIZE = 100;

async function listAllUsers(auth: any) {
  const users: User[] = [];
  for (let offset = 0; ; offset += USER_PAGE_SIZE) {
    const page: any = await authCall("list users", "Unable to load users", () => auth.api.listUsers({ query: { limit: USER_PAGE_SIZE, offset } }));
    users.push(...(page.users as User[]));
    if (page.users.length < USER_PAGE_SIZE) return users;
  }
}

export async function requireAdmin(event: any, deps: Dependencies = {}): Promise<{ actor: User }> {
  const { getSession } = runtimeDependencies(event, deps);
  let session;
  try {
    session = await getSession(event);
  } catch (cause) {
    throw safeAuthError("get session", "Unable to verify session", cause);
  }
  if (!session) throw error(401, "Authentication required");
  if (session.user?.role !== "admin") throw error(403, "Admin role required");
  return { actor: session.user };
}

async function usersAndActor(event: any, deps: Dependencies) {
  const { actor } = await requireAdmin(event, deps);
  const { auth } = runtimeDependencies(event, deps);
  return { actor, users: await listAllUsers(auth), auth };
}

async function targetUser(event: any, deps: Dependencies) {
  const { auth, getUserId } = runtimeDependencies(event, deps);
  const id = getUserId(event);
  if (!id) throw error(400, "User id is required");
  const result: any = await authCall("get user", "Unable to load user", () => auth.api.getUser({ query: { id } }));
  const user = result?.user ?? result;
  if (!user) throw error(404, "User not found");
  return { auth, id, user: user as User };
}

function validateString(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) throw error(400, `${field} is required`);
  return value.trim();
}

function validateEmail(body: Record<string, unknown>) {
  const email = validateString(body, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw error(400, "Invalid email");
  return email;
}

function validatePassword(body: Record<string, unknown>) {
  const password = validateString(body, "password");
  if (password.length < 8) throw error(400, "Password must be at least 8 characters");
  return password;
}

export async function listAdminUsers(event: any, deps: Dependencies = {}) {
  const { users } = await usersAndActor(event, deps);
  return users.map(sanitize);
}

export async function createAdminUser(event: any, deps: Dependencies = {}) {
  await requireAdmin(event, deps);
  const { auth, readBody } = runtimeDependencies(event, deps);
  const body = await readBody(event);
  const name = validateString(body, "name");
  const email = validateEmail(body);
  const password = validatePassword(body);
  const role = body.role === undefined ? "user" : body.role;
  if (role !== "admin" && role !== "user") throw error(400, "Invalid role");
  const result: any = await authCall("create user", "Unable to create user", () => auth.api.createUser({ body: { name, email, password, role } }));
  return sanitize(result.user ?? result);
}

export async function updateAdminUser(event: any, deps: Dependencies = {}) {
  return withAdminMutationLock(async () => {
    const { actor, users, auth } = await usersAndActor(event, deps);
    const { id, user } = await targetUser(event, deps);
    const body = await runtimeDependencies(event, deps).readBody(event);
    const role = body.role;
    if (role !== undefined && role !== "admin" && role !== "user") throw error(400, "Invalid role");
    const name = body.name === undefined ? undefined : validateString(body, "name");
    const email = body.email === undefined ? undefined : validateEmail(body);
    if (body.banned !== undefined && typeof body.banned !== "boolean") {
      throw error(400, "Invalid banned status");
    }
    if (role === "user" && role !== user.role) {
      assertUserMutationAllowed({ actor, target: user, action: "demote", adminCount: users.filter((item) => item.role === "admin").length });
    }

    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    const roleChanged = role !== undefined && role !== user.role;
    const dataChanged = Object.keys(data).length > 0;
    const statusChanged = body.banned !== undefined && body.banned !== Boolean(user.banned);
    let result: any = user;
    let roleAttempted = false;
    let dataCompleted = false;
    let statusAttempted = false;
    try {
      if (roleChanged) {
        roleAttempted = true;
        await authCall("set user role", "Unable to update user", () => auth.api.setRole({ body: { userId: id, role } }));
      }
      if (dataChanged) {
        result = await authCall("update user profile", "Unable to update user", () => auth.api.adminUpdateUser({ body: { userId: id, data } }));
        dataCompleted = true;
      }
      if (body.banned !== undefined) {
        statusAttempted = true;
        result = await authCall("update user status", "Unable to update user", () => auth.api[body.banned ? "banUser" : "unbanUser"]({ body: { userId: id } }));
      }
    } catch (cause) {
      if (statusAttempted && statusChanged) {
        await rollback("user status", () => auth.api[user.banned ? "banUser" : "unbanUser"]({ body: { userId: id } }));
      }
      if (dataCompleted) {
        const previousData = Object.fromEntries(Object.keys(data).map((key) => [key, user[key]]));
        await rollback("user profile", () => auth.api.adminUpdateUser({ body: { userId: id, data: previousData } }));
      }
      if (roleAttempted) {
        await rollback("user role", () => auth.api.setRole({ body: { userId: id, role: user.role ?? "user" } }));
      }
      throw cause;
    }
    return sanitize(result.user ?? result);
  });
}

export async function resetAdminPassword(event: any, deps: Dependencies = {}) {
  await requireAdmin(event, deps);
  const { auth, getUserId, readBody } = runtimeDependencies(event, deps);
  const id = getUserId(event);
  if (!id) throw error(400, "User id is required");
  const password = validatePassword(await readBody(event));
  await authCall("reset user password", "Unable to reset password", () => auth.api.setUserPassword({ body: { userId: id, newPassword: password } }));
  return { success: true };
}

export async function deleteAdminUser(event: any, deps: Dependencies = {}) {
  return withAdminMutationLock(async () => {
    const { actor, users, auth } = await usersAndActor(event, deps);
    const { id, user } = await targetUser(event, deps);
    assertUserMutationAllowed({ actor, target: user, action: "delete", adminCount: users.filter((item) => item.role === "admin").length });
    await authCall("delete user", "Unable to delete user", () => auth.api.removeUser({ body: { userId: id } }));
    return { success: true };
  });
}

async function rollback(operation: string, call: () => Promise<unknown>) {
  try {
    await call();
  } catch (cause) {
    console.error(`[admin] rollback ${operation} failed`, cause);
  }
}
