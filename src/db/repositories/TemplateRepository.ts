/**
 * Repository for Session Templates.
 * Owns table: sessionTemplates
 */
import type { SessionTemplate } from '@/domain/entities';
import { SessionTemplateSchema } from '@/domain/schemas';

import { db } from '../database';
import { BaseRepository } from './BaseRepository';

export class TemplateRepository extends BaseRepository {
    static async getAll(): Promise<SessionTemplate[]> {
        return db.sessionTemplates.toArray();
    }

    static async getById(id: string): Promise<SessionTemplate | undefined> {
        return db.sessionTemplates.get(id);
    }

    static async add(template: SessionTemplate): Promise<string> {
        this.validateData(SessionTemplateSchema, template);
        return db.sessionTemplates.add(template);
    }

    static async update(id: string, changes: Partial<SessionTemplate>): Promise<number> {
        this.validateData(SessionTemplateSchema.partial(), changes);
        return db.sessionTemplates.update(id, changes);
    }

    static async delete(id: string): Promise<void> {
        await db.sessionTemplates.delete(id);
    }
}
