import { useEffect, useState } from 'react';

import { Timer, X, Play, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { INPUT_STEPS } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { formatDurationMMSS } from '@/lib/formatting';
import { nativeDeviceService } from '@/services/nativeDeviceService';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

export default function RestTimer() {
  const { t } = useTranslation();
  const {
    restTimerEndAt, restTimerDuration, restTimerPausedRemaining,
    pauseRestTimer, resumeRestTimer, clearRestTimer
  } = useActiveSessionStore();
  const [remaining, setRemaining] = useState(0);
  const [overtime, setOvertime] = useState(0);

  const isPaused = restTimerPausedRemaining != null && restTimerPausedRemaining > 0;

  useEffect(() => {
    if (isPaused) {
      setRemaining(restTimerPausedRemaining);
      setOvertime(0);
      return;
    }
    if (!restTimerEndAt) { 
      setRemaining(0); 
      setOvertime(0); 
      // If timer is cleared, cancel any pending notification
      void nativeDeviceService.cancelRestNotifications();
      return; 
    }
    
    const tick = () => {
      const diffMs = dayjs(restTimerEndAt).diff(dayjs());
      if (diffMs > 0) {
        setRemaining(Math.ceil(diffMs / 1000));
        setOvertime(0);
      } else {
        setRemaining(0);
        setOvertime(Math.floor(Math.abs(diffMs) / 1000));
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [restTimerEndAt, isPaused, restTimerPausedRemaining]);

  const isActive = restTimerEndAt !== null || isPaused;
  const isOvertime = overtime > 0 && !isPaused;
  const progress = isActive && restTimerDuration > 0
    ? Math.min(100, (remaining / restTimerDuration) * 100)
    : 0;

  const formatTime = (s: number) => {
    return formatDurationMMSS(s);
  };

  const handlePause = () => {
    pauseRestTimer();
    void nativeDeviceService.cancelRestNotifications();
  };

  const handleResume = () => {
    resumeRestTimer();
    if (restTimerPausedRemaining) {
      void nativeDeviceService.scheduleRestNotification(restTimerPausedRemaining);
    }
  };

  const handleClear = () => {
    clearRestTimer();
    void nativeDeviceService.cancelRestNotifications();
  };

  if (isActive) {
    return (
      <div 
        className="fixed left-0 right-0 z-overlay border-t border-warning/30 bg-warning/15 px-4 py-2 text-warning backdrop-blur-sm md:bottom-0 md:left-64"
        style={{ bottom: 'calc(3.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-sm items-center gap-3">
          <span className={`font-mono text-lg font-semibold tabular-nums ${isOvertime ? 'text-destructive' : ''} ${isPaused ? 'opacity-50' : ''}`}>
            {isOvertime ? `+${formatTime(overtime)}` : formatTime(remaining)}
          </span>
          <Progress
            value={isOvertime ? 0 : progress}
            className="h-1.5 flex-1"
            indicatorClassName={isOvertime ? 'bg-destructive' : 'bg-warning'}
          />
          <div className="flex items-center gap-1">
            {isPaused ?
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleResume} title={t('activeSession.resume')}>
                <Play className="h-4 w-4" />
              </Button> :
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handlePause} title={t('activeSession.pause')}>
                <Pause className="h-4 w-4" />
              </Button>
            }
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleClear} title={t('actions.close')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>);
  }

  return null;
}

/** Inline rest timer start control — used inside ActiveSession only */
export function RestTimerStartControl() {
  const { t } = useTranslation();
  const { startRestTimer } = useActiveSessionStore();
  const [customDuration, setCustomDuration] = useState(120);

  const handleStartRest = () => {
    startRestTimer(customDuration);
    void nativeDeviceService.scheduleRestNotification(customDuration);
  };

  return (
    <div className="flex items-center gap-2">
      <Timer className="h-4 w-4 text-muted-foreground" />
      <Input
        type="number"
        value={customDuration}
        onChange={(e) => setCustomDuration(Number(e.target.value))}
        className="text-body-sm h-8 w-20"
        step={INPUT_STEPS.count}
        min={0} />

      <span className="text-body-sm text-muted-foreground">{t('time.seconds')}</span>
      <Button variant="outline" size="sm" className="text-body-sm h-8" onClick={handleStartRest}>
        <Play className="mr-1 h-3 w-3" />
        {t('activeSession.startRest')}
      </Button>
    </div>);
}
