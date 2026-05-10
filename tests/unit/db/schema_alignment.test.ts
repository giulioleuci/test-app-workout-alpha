import { describe, it, expect } from 'vitest';

import { ALL_TABLES } from '@/services/backupService';
import { validateRecord } from '@/services/backupValidation';

import { testDb as db } from '../../utils/testHelpers';
describe('Schema Alignment', () => {
  it('should have all backup tables in the database schema', () => {
    // Check that every table listed in ALL_TABLES exists in db.tables
    ALL_TABLES.forEach((tableName) => {
      const table = (db as any)[tableName];
      expect(table, `Table ${tableName} should exist in DB`).toBeDefined();
    });
  });

  it('should have a validation schema for every table', () => {
    // Check that validateRecord has a schema for every table in ALL_TABLES.
    // validateRecord returns null if validation fails (schema exists),
    // and returns the record itself (with a console.warn) if no schema is found.
    ALL_TABLES.forEach((tableName) => {
      const result = validateRecord(tableName, {});

      // If result is null, it means schema exists and validation failed (correct behavior for empty input).
      // If result is {}, it means no schema was found and it returned the input.
      expect(result, `Schema for table ${tableName} should exist`).toBeNull();
    });
  });
});
