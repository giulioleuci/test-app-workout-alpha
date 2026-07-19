import { type SessionSet, type SessionExerciseItem, type WorkoutSession, type OneRepMaxRecord, type BodyWeightRecord } from './entities';
import { type ComplianceStatus, type FatigueProgressionStatus } from './enums';

export interface HistoryEstimate {
  value: number;
  unit: 'kg' | 'lbs';
  load: number;
  reps: number;
  rpe: number;
  date: Date;
}

export interface ComplianceDistribution {
    status: string;
    count: number;
    percentage: number;
}

export interface RPEAccuracyPoint {
    date: string;
    expectedRPE: number;
    actualRPE: number;
    deviation: number;
}

export interface LoadProgressionPoint {
    date: string;
    exerciseName: string;
    avgLoad: number;
    maxLoad: number;
}

export interface ExtendedVolumeEntry {
    name: string;
    weightedSets: number;
    setsTimesReps: number;
    volumeTonnage: number;
}

export interface WeeklyFrequency {
    weekLabel: string;
    weekStart: Date;
    actual: number;
    target: number | null;
}

export interface SessionSummary {
    id: string;
    date: Date;
    totalSets: number;
    completedSets: number;
    avgRPE: number | null;
    totalVolume: number;
    duration: number | null;
}

export interface RelevantSetItem { 
  set: SessionSet; 
  item: SessionExerciseItem; 
  session: WorkoutSession 
}

export interface ComplianceAnalytics {
    compliance: ComplianceDistribution[];
    avgCompliance: number;
    complianceTrend: number | null;
}

export interface LoadProgressionAnalytics {
    loadProgression: Record<string, LoadProgressionPoint[]>;
    historyEstimates: Record<string, HistoryEstimate>;
    oneRMRecords: OneRepMaxRecord[];
}

export interface VolumeAnalytics {
    volumeByMuscle: ExtendedVolumeEntry[];
    volumeByMuscleGroup: ExtendedVolumeEntry[];
    volumeByMovement: ExtendedVolumeEntry[];
    objectiveDistribution: ExtendedVolumeEntry[];
    totalSets: number;
    avgSetsPerWeek: number;
    mostTrainedMuscle: string | null;
    leastTrainedMuscle: string | null;
}

export interface FrequencyAnalytics {
    weeklyFrequency: WeeklyFrequency[];
    totalSessions: number;
    avgWeeklyFrequency: number;
}

export interface SessionHistoryAnalytics {
    sessionHistory: SessionSummary[];
}

export interface BodyWeightAnalytics {
    bodyWeightRecords: BodyWeightRecord[];
}

export interface RPEAnalytics {
    rpeAccuracy: RPEAccuracyPoint[];
    avgDeviation: number;
    withinHalfPercent: number;
    rpeTrend: number | null;
}

export interface ParameterCompliance {
  status: ComplianceStatus;
  actual: number | null;
  plannedMin: number;
  plannedMax: number | null;
  deviation: number; // negative = below min, positive = above max, 0 = in range
}

export interface SetComplianceResult {
  overall: ComplianceStatus;
  count: ParameterCompliance | null;
  load: ParameterCompliance | null;
  rpe: ParameterCompliance | null;
}

export interface FatigueAnalysisResult {
  status: FatigueProgressionStatus;
  expectedRPE: number | null;
  actualRPE: number | null;
  rpeClimbPerSet: number | null;   // actual RPE increment from previous set
  expectedClimbPerSet: number;     // from fatigue profile
  tolerance: number;
  deviation: number | null;        // actual climb - expected climb
  setIndex: number;                // 0-based within the exercise
}

export interface AnalyticsData {
    compliance: ComplianceAnalytics;
    load: LoadProgressionAnalytics;
    volume: VolumeAnalytics;
    frequency: FrequencyAnalytics;
    sessionHistory: SessionHistoryAnalytics;
    bodyWeight: BodyWeightAnalytics;
    rpe: RPEAnalytics;
}
