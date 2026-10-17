/** Clé de jour locale « AAAA-MM-JJ » (fuseau de l'appareil). */
export function dayKey(d: Date | number = new Date()): string {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const j = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${j}`;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}
