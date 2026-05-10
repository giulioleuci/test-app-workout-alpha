import { useState } from 'react';

import { StickyNote } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';

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

interface NoteViewerButtonProps {
  content: string;
  title?: string;
  className?: string;
}

export function NoteViewerButton({ content, title, className }: NoteViewerButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
          className
        )}
        title={title ?? content}
      >
        <StickyNote className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 shrink-0" />
              {title ?? 'Note'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {content}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
