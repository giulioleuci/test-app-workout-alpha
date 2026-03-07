import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

interface ActiveSessionNoSessionProps {
  onReset: () => void;
}

export default function ActiveSessionNoSession({ onReset }: ActiveSessionNoSessionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-4 py-12 text-center">
      <p className="text-muted-foreground">{t('activeSession.noActiveSession')}</p>
      <Button variant="outline" onClick={() => { onReset(); navigate('/workouts'); }}>
        {t('activeSession.goToWorkouts')}
      </Button>
    </div>
  );
}
