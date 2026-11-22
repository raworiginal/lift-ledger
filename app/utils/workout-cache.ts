export function workoutCacheKey(...parts: string[]): string {
  const { user } = useUserSession();
  return ["workouts", user.value?.id ?? "anonymous", ...parts].join(":");
}
