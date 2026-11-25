let startupTasks: Promise<void> = Promise.resolve();

export function setStartupTasks(tasks: Promise<void>) {
  startupTasks = tasks;
}

export function waitForStartupTasks(): Promise<void> {
  return startupTasks;
}
