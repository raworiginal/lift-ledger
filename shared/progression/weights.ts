const WEIGHT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function toHundredths(value: string): number {
  if (!WEIGHT_PATTERN.test(value)) throw new Error(`Invalid weight: ${value}`);

  const [whole = "0", fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function fromHundredths(value: number): string {
  const whole = Math.floor(value / 100);
  const fraction = value % 100;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}
