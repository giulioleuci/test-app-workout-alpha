import { useState } from 'react';

import { Lightbulb, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { LoadSuggestion } from '@/services/loadSuggestionEngine';

interface LoadSuggestionBadgeProps {
  suggestions: LoadSuggestion[];
  onApply: (load: number) => void;
}

const confidenceStyles = {
  high:   'bg-muted text-muted-foreground border-border',
  medium: 'bg-muted text-muted-foreground border-border',
  low:    'bg-muted text-muted-foreground border-border',
};

export default function LoadSuggestionBadge({ suggestions, onApply }: LoadSuggestionBadgeProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const methodLabels: Record<string, string> = {
    percentage1RM: t('loadSuggestion.methodPercentage1RM'),
    lastSession: t('loadSuggestion.methodLastSession'),
    plannedRPE: t('loadSuggestion.methodPlannedRPE'),
  };

  if (suggestions.length === 0) return null;

  const handleApply = (load: number) => {
    onApply(load);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground">
          <Lightbulb className="h-3.5 w-3.5" />
          <span className="text-body-sm">{t('loadSuggestion.title')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t('loadSuggestion.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {suggestions.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`${confidenceStyles[s.confidence]} text-body-sm font-medium`}>
                  {methodLabels[s.method]}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">{s.suggestedLoad} {t('units.kg')}</span>
                  <Button
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => handleApply(s.suggestedLoad)}
                  >
                    {t('loadSuggestion.apply')}
                  </Button>
                </div>
              </div>
              {s.reasoning && (
                <div className="flex items-start gap-1.5 text-caption text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  <p>{s.reasoning}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
