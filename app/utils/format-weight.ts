import type { WorkoutUnit } from "~~/shared/types/workouts";

export function formatWeightOneDecimal(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return value;

  const [, sign = "", whole = "0", fraction = ""] = match;
  let tenths = Number(whole) * 10 + Number(fraction.charAt(0) || 0);
  if (Number(fraction.charAt(1) || 0) >= 5) tenths += 1;

  return `${sign}${Math.floor(tenths / 10)}.${tenths % 10}`;
}

// Assisted weights are stored as negative numbers but read as assistance.
export function formatSetWeight(
  weight: string,
  unit: WorkoutUnit,
  assisted: boolean,
  format: (value: string) => string = (value) => String(Number(value)),
): string {
  const value = Number(weight);
  if (!assisted) return `${format(weight)} ${unit}`;
  if (value === 0) return "Bodyweight";
  return `${format(String(Math.abs(value)))} ${unit} assist`;
}
