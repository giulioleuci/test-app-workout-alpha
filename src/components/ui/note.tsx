import { StickyNote } from 'lucide-react';

import { cn } from '@/lib/utils';

interface NoteProps {
  content?: string | null;
  className?: string;
}

export function Note({ content, className }: NoteProps) {
  if (!content) return null;
  return (
    <div className={cn("flex items-start gap-1.5 text-caption text-muted-foreground bg-muted/40 rounded px-2 py-1.5", className)}>
      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{content}</span>
    </div>
  );
}
