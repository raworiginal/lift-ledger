export function formatWeightOneDecimal(value: string): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return value;

  const [, whole, fraction = ""] = match;
  let tenths = Number(whole) * 10 + Number(fraction.charAt(0) || 0);
  if (Number(fraction.charAt(1) || 0) >= 5) tenths += 1;

  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}
