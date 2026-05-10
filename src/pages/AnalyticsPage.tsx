import { useEffect, useState, useMemo } from 'react';

import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AnalyticsFilters from '@/components/analytics/AnalyticsFilters';
import AnalyticsToolsSection from '@/components/analytics/AnalyticsToolsSection';
import ComplianceSection from '@/components/analytics/ComplianceSection';
import LoadSection from '@/components/analytics/LoadSection';
import RPESection from '@/components/analytics/RPESection';
import VolumeSection from '@/components/analytics/VolumeSection';
import { Card, CardContent } from '@/components/ui/card';
import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAnalyticsData } from '@/hooks/queries/analyticsQueries';
import dayjs from '@/lib/dayjs';

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<string>('1w');
  const [fromDate, setFromDate] = useState<Date>(() => dayjs().subtract(7, 'day').toDate());
  const [toDate, setToDate] = useState<Date>(() => dayjs().toDate());
  const [workoutId, setWorkoutId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [plannedGroupId, setPlannedGroupId] = useState<string | undefined>();
  const [plannedExerciseItemId, setPlannedExerciseItemId] = useState<string | undefined>();
  const [selectedExercise, setSelectedExercise] = useState<string>('all');

  useEffect(() => {
    // Compute from/to based on preset
    if (dateRange !== 'custom') {
      const now = dayjs();
      if (dateRange === 'all') {
        setFromDate(dayjs(0).toDate());
        setToDate(now.toDate());
      } else {
        const amount = 
          dateRange === '1w' ? 1 : 
          dateRange === '4w' ? 4 : 
          dateRange === '12w' ? 12 : 
          dateRange === '26w' ? 26 : 
          dateRange === '52w' ? 52 : 1;
        setFromDate(now.subtract(amount, 'week').toDate());
        setToDate(now.toDate());
      }
    }
  }, [dateRange]);

  const filters = useMemo(() => ({
    fromDate, toDate, workoutId, sessionId, plannedGroupId, plannedExerciseItemId
  }), [fromDate, toDate, workoutId, sessionId, plannedGroupId, plannedExerciseItemId]);

  const { data, isLoading } = useAnalyticsData(filters);

  if (isLoading || !data) {
    return <DetailPageSkeleton />;
  }

  if (data.frequency.totalSessions === 0) {
    return (
      <div className="space-y-6">
        <AnalyticsFilters
          dateRange={dateRange} onDateRangeChange={setDateRange}
          fromDate={fromDate} toDate={toDate}
          onFromDateChange={setFromDate} onToDateChange={setToDate}
          workoutId={workoutId} onWorkoutIdChange={setWorkoutId}
          sessionId={sessionId} onSessionIdChange={setSessionId}
          plannedGroupId={plannedGroupId} onPlannedGroupIdChange={setPlannedGroupId}
          plannedExerciseItemId={plannedExerciseItemId} onPlannedExerciseItemIdChange={setPlannedExerciseItemId}
        />
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <BarChart3 className="h-12 w-12" />
          <p>{t('analytics.noSessionsForStats')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">

      {/* Filters */}
      <AnalyticsFilters
        dateRange={dateRange} onDateRangeChange={setDateRange}
        fromDate={fromDate} toDate={toDate}
        onFromDateChange={setFromDate} onToDateChange={setToDate}
        workoutId={workoutId} onWorkoutIdChange={setWorkoutId}
        sessionId={sessionId} onSessionIdChange={setSessionId}
        plannedGroupId={plannedGroupId} onPlannedGroupIdChange={setPlannedGroupId}
        plannedExerciseItemId={plannedExerciseItemId} onPlannedExerciseItemIdChange={setPlannedExerciseItemId}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-caption text-muted-foreground">{t('analytics.sessionsLabel')}</p>
            <p className="text-h4 font-bold">{data.frequency.totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-caption text-muted-foreground">{t('analytics.setsLabel')}</p>
            <p className="text-h4 font-bold">{data.volume.totalSets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-caption text-muted-foreground">{t('analytics.complianceLabel')}</p>
            <p className="text-h4 font-bold">{data.compliance.avgCompliance}%</p>
          </CardContent>
        </Card>
      </div>

      <AnalyticsToolsSection />

      {/* Tabs */}
      <Tabs defaultValue="volume" className="w-full">
        <TabsList className="grid h-9 w-full grid-cols-4">
          <TabsTrigger value="volume" className="text-caption px-1">{t('analytics.tabVolume')}</TabsTrigger>
          <TabsTrigger value="load" className="text-caption px-1">{t('analytics.tabLoad')}</TabsTrigger>
          <TabsTrigger value="compliance" className="text-caption px-1">{t('analytics.tabCompliance')}</TabsTrigger>
          <TabsTrigger value="rpe" className="text-caption px-1">{t('analytics.tabRPE')}</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="mt-4">
          <VolumeSection
            volumeData={data.volume}
          />
        </TabsContent>

        <TabsContent value="load" className="mt-4">
          <LoadSection
            loadData={data.load}
            bodyWeightData={data.bodyWeight}
            selectedExercise={selectedExercise}
            onSelectExercise={setSelectedExercise}
          />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <ComplianceSection
            complianceData={data.compliance}
            frequencyData={data.frequency}
          />
        </TabsContent>

        <TabsContent value="rpe" className="mt-4">
          <RPESection rpeData={data.rpe} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
