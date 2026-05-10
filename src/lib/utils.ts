import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sortByLocaleName<T extends { name?: string; exercise?: { name: string } }>(
  a: T,
  b: T,
  locale = 'it',
  direction: 'asc' | 'desc' = 'asc'
): number {
  const nameA = a.name ?? a.exercise?.name ?? '';
  const nameB = b.name ?? b.exercise?.name ?? '';

  if (direction === 'asc') {
    return nameA.localeCompare(nameB, locale);
  }
  return nameB.localeCompare(nameA, locale);
}
