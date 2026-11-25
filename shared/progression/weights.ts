const WEIGHT_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

export function toHundredths(value: string): number {
  const match = WEIGHT_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid weight: ${value}`);

  const [, sign = "", whole = "0", fraction = ""] = match;
  const magnitude = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return sign && magnitude ? -magnitude : magnitude;
}

export function fromHundredths(value: number): string {
  const magnitude = Math.abs(value);
  const whole = Math.floor(magnitude / 100);
  const fraction = magnitude % 100;
  const sign = value < 0 ? "-" : "";
  return `${sign}${whole}.${String(fraction).padStart(2, "0")}`;
}
