import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMuscleFreshness } from '@/hooks/queries/dashboardQueries';

export default function MuscleFreshnessList() {
  const { t } = useTranslation();
  const { data: freshnessData, isLoading } = useMuscleFreshness();

  if (isLoading || !freshnessData) return null;

  // Filter out muscles never trained if needed, but the user asked for a list
  // I'll show all muscles, but sort them (already sorted in service)
  
  const getFreshnessColor = (hours: number | null) => {
    if (hours === null) return 'bg-muted text-muted-foreground opacity-50'; // Never trained
    if (hours < 24) return 'bg-destructive/10 text-destructive border-destructive/20'; // Trained recently (still recovering)
    if (hours < 48) return 'bg-warning/10 text-warning border-warning/20'; // Moderate
    if (hours < 72) return 'bg-success/10 text-success border-success/20'; // Good
    return 'bg-primary/10 text-primary border-primary/20'; // Ready (Fresh)
  };

  const getFreshnessLabel = (hours: number | null) => {
    if (hours === null) return t('common.noData');
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return `1 ${t('common.day')}`;
    return `${days} ${t('common.days')}`;
  };

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
            {t('dashboard.muscleFreshness')}
          </p>
          <Clock className="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
        <ScrollArea className="-mx-1 flex-1 px-1">
          <div className="flex flex-col gap-2 pb-1 pt-1">
            {freshnessData.map(({ muscle, hoursSinceLastTrained }) => (
              <div 
                key={muscle} 
                className="flex items-center justify-between rounded-md border border-muted/50 p-2 transition-colors hover:bg-muted/30"
              >
                <span className="text-body-sm font-medium">
                  {t(`enums.muscle.${muscle}`)}
                </span>
                <Badge variant="outline" className={`text-caption font-semibold ${getFreshnessColor(hoursSinceLastTrained)}`}>
                  {getFreshnessLabel(hoursSinceLastTrained)}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
