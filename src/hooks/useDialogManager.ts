import { useState, useCallback } from 'react';

export function useDialogManager<T extends string = string>() {
  const [activeDialogs, setActiveDialogs] = useState<Set<T>>(new Set());

  const open = useCallback((dialog: T) => {
    setActiveDialogs(prev => {
      const next = new Set(prev);
      next.add(dialog);
      return next;
    });
  }, []);

  const close = useCallback((dialog: T) => {
    setActiveDialogs(prev => {
      const next = new Set(prev);
      next.delete(dialog);
      return next;
    });
  }, []);

  const toggle = useCallback((dialog: T) => {
    setActiveDialogs(prev => {
      const next = new Set(prev);
      if (next.has(dialog)) {
        next.delete(dialog);
      } else {
        next.add(dialog);
      }
      return next;
    });
  }, []);

  const isOpen = useCallback((dialog: T) => activeDialogs.has(dialog), [activeDialogs]);

  return { open, close, toggle, isOpen };
}
