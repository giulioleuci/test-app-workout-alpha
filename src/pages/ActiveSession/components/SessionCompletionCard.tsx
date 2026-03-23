import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SessionCompletionCardProps {
  onEndSession: () => void;
}

export default function SessionCompletionCard({ onEndSession }: SessionCompletionCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="space-y-3 py-8 text-center">
        <Check className="mx-auto h-12 w-12 text-success" />
        <h2 className="text-h4 font-semibold">{t('activeSession.sessionCompleted')}</h2>
        <p className="text-sm text-muted-foreground">{t('activeSession.allSetsCompleted')}</p>
        <Button onClick={onEndSession}>{t('activeSession.endSession')}</Button>
      </CardContent>
    </Card>
  );
}
