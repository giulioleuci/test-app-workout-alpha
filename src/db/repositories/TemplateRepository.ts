/**
 * Repository for Session Templates.
 * Owns table: sessionTemplates
 */
import type { SessionTemplate } from '@/domain/entities';

import { db } from '../database';

export class TemplateRepository {
    static async getAll(): Promise<SessionTemplate[]> {
        return db.sessionTemplates.toArray();
    }

    static async getById(id: string): Promise<SessionTemplate | undefined> {
        return db.sessionTemplates.get(id);
    }

    static async add(template: SessionTemplate): Promise<string> {
        return db.sessionTemplates.add(template);
    }

    static async update(id: string, changes: Partial<SessionTemplate>): Promise<number> {
        return db.sessionTemplates.update(id, changes);
    }

    static async delete(id: string): Promise<void> {
        await db.sessionTemplates.delete(id);
    }
}
