import { useEffect, useState, useRef } from 'react';

import dayjs from '@/lib/dayjs';
import { formatDurationHHMMSS } from '@/lib/formatting';

interface TimerDisplayProps {
  startedAt: Date;
}

export default function TimerDisplay({ startedAt }: TimerDisplayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startedAt) return;
    const update = () => setElapsedSeconds(Math.floor(dayjs().diff(dayjs(startedAt), 'second')));
    update();
    timerRef.current = setInterval(update, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startedAt]);

  const formatted = formatDurationHHMMSS(elapsedSeconds);

  return (
    <span className="font-mono text-xs">
      {formatted}
    </span>
  );
}
