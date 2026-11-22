export const HEATMAP_WEEKS = 52;

const DAY_MS = 86_400_000;

export interface HeatmapCell {
  date: string;
  active: boolean;
}

function toUtcDate(value: string): Date {
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return toIsoDate(new Date(toUtcDate(value).getTime() + days * DAY_MS));
}

export function mondayOf(value: string): string {
  const weekday = toUtcDate(value).getUTCDay();
  return addDays(value, -((weekday + 6) % 7));
}

export function heatmapWindow(today: string): { start: string; end: string } {
  const monday = mondayOf(today);
  return {
    start: addDays(monday, -7 * (HEATMAP_WEEKS - 1)),
    end: addDays(monday, 6),
  };
}

export function heatmapCells(
  today: string,
  activeDates: Iterable<string>,
): HeatmapCell[] {
  const { start, end } = heatmapWindow(today);
  const active = new Set(activeDates);
  const cells: HeatmapCell[] = [];

  for (let date = start; date <= end; date = addDays(date, 1)) {
    cells.push({ date, active: active.has(date) });
  }

  return cells;
}
