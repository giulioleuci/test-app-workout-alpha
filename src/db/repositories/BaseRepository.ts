import { ZodError, type ZodType } from 'zod';

/**
 * Base class for all Dexie repositories.
 * Call `this.validateData(Schema, data)` before any write operation.
 */
export class BaseRepository {
  protected static validateData<T>(schema: ZodType<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = err.errors
          .map(e => `${e.path.join('.') || 'root'}: ${e.message}`)
          .join('; ');
        throw new Error(`Repository validation failed — ${fields}`);
      }
      throw err;
    }
  }
}
