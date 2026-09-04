let pending = Promise.resolve();

// ponytail: process-local lock, distributed lock if the app runs on multiple instances
export function withAdminMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const current = pending.then(operation, operation);
  pending = current.then(() => undefined, () => undefined);
  return current;
}
