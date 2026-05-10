import type { BodyWeightRecord } from '@/domain/entities';
import dayjs from '@/lib/dayjs';

export function findClosestWeight(records: BodyWeightRecord[], date: Date): BodyWeightRecord | null {
  if (records.length === 0) return null;
  const target = dayjs(date);
  let closest = records[0];
  let minDiff = Math.abs(dayjs(closest.recordedAt).diff(target));
  for (const rec of records) {
    const diff = Math.abs(dayjs(rec.recordedAt).diff(target));
    if (diff < minDiff) { minDiff = diff; closest = rec; }
  }
  return closest;
}

export function strengthRatio(load: number, bodyWeight: number): string {
  return (load / bodyWeight).toFixed(1) + '\u00d7BW';
}
