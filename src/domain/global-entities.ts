export interface GlobalUser {
  id: string;
  name: string;
  pinHash: string | null;
  avatarColor: string;
  createdAt: Date;
}

export interface GlobalAppState {
  id: 'singleton';
  lastActiveUserId: string | null;
  language: 'en' | 'it' | 'es' | 'fr' | 'zh';
}

export const AVATAR_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
] as const;
