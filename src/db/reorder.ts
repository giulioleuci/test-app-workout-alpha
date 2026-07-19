/**
 * Reusable reordering helper: assigns fresh sequential LexoRanks to a set of
 * rows in the given order, inside a single transaction.
 */
import { generateSequentialRanks } from '@/lib/lexorank';

import { db } from './database';

import type { Table } from 'dexie';

export async function reorderByIds<T extends { orderIndex: string }>(
  table: Table<T>,
  orderedIds: string[],
): Promise<void> {
  const ranks = generateSequentialRanks(orderedIds.length);
  await db.transaction('rw', table, async () => {
    await Promise.all(
      orderedIds.map((id, index) =>
        table.update(id, { orderIndex: ranks[index] } as unknown as Partial<T>),
      ),
    );
  });
}
