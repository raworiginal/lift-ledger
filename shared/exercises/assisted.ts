import { toHundredths } from "../progression/weights";

const ASSISTED_PATTERN = /\bassisted\b/i;

// Assisted exercises are identified by their English name. Stored weights are
// zero or negative for them (the machine takes weight off) and zero or positive
// for everything else.
export function isAssistedExercise(nameEn: string): boolean {
  return ASSISTED_PATTERN.test(nameEn);
}

export function weightFitsExercise(weight: string, assisted: boolean): boolean {
  const hundredths = toHundredths(weight);
  return assisted ? hundredths <= 0 : hundredths >= 0;
}

// The form takes assistance as a positive number. Storage keeps it negative.
export function assistanceToStored(entry: string, assisted: boolean): string {
  if (!assisted || /^0+(\.0+)?$/.test(entry)) return entry;
  return `-${entry}`;
}

export function storedToEntry(stored: string, assisted: boolean): string {
  return assisted ? String(Math.abs(Number(stored))) : String(Number(stored));
}
