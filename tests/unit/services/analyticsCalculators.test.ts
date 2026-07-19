import { describe, it, expect } from 'vitest';

import { ComplianceStatus } from '@/domain/enums';
import {
  loadProgressionChangePct,
  calculateComplianceDistribution,
  calculateRPEAccuracy,
  calculateWeeklyFrequency,
  buildSessionHistoryFromFlatData,
  buildSessionHistory,
  calculateComplianceStats,
  calculateRPEStats,
  calculateVolumeStats,
  calculateFrequencyStats,
  convertVolumeMapToExtended,
} from '@/services/analyticsCalculators';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeSession = (id: string, startedAt: Date, completedAt?: Date) =>
  ({ id, startedAt, completedAt } as any);

const makeSet = (overrides: Record<string, unknown> = {}) => ({
  sessionExerciseItemId: 'i1',
  isCompleted: true,
  actualRPE: null,
  actualLoad: null,
  actualCount: null,
  ...overrides,
});

const makeRelevantSet = (setOverrides: Record<string, unknown> = {}, sessionDate = new Date()) => ({
  set: { ...makeSet(), ...setOverrides } as any,
  item: { id: 'i1', exerciseId: 'ex1', sessionExerciseGroupId: 'g1', orderIndex: '0' } as any,
  session: makeSession('s1', sessionDate),
});

// ─── loadProgressionChangePct ─────────────────────────────────────────────────

describe('loadProgressionChangePct', () => {
  it('returns null for fewer than 2 points', () => {
    expect(loadProgressionChangePct([])).toBeNull();
    expect(loadProgressionChangePct([{ avgLoad: 100 }])).toBeNull();
  });

  it('returns null when first point load is 0', () => {
    expect(loadProgressionChangePct([{ avgLoad: 0 }, { avgLoad: 100 }])).toBeNull();
  });

  it('returns null when first point load is negative', () => {
    expect(loadProgressionChangePct([{ avgLoad: -10 }, { avgLoad: 100 }])).toBeNull();
  });

  it('calculates positive progression', () => {
    expect(loadProgressionChangePct([{ avgLoad: 100 }, { avgLoad: 110 }])).toBe(10);
  });

  it('calculates negative progression', () => {
    expect(loadProgressionChangePct([{ avgLoad: 100 }, { avgLoad: 90 }])).toBe(-10);
  });

  it('calculates zero progression when load unchanged', () => {
    expect(loadProgressionChangePct([{ avgLoad: 100 }, { avgLoad: 100 }])).toBe(0);
  });

  it('uses first and last points only when multiple exist', () => {
    const points = [{ avgLoad: 100 }, { avgLoad: 200 }, { avgLoad: 50 }];
    expect(loadProgressionChangePct(points)).toBe(-50);
  });
});

// ─── calculateComplianceDistribution ─────────────────────────────────────────

describe('calculateComplianceDistribution', () => {
  it('returns empty array for no sets', () => {
    expect(calculateComplianceDistribution([])).toEqual([]);
  });

  it('calculates single status group', () => {
    const items = [
      makeRelevantSet({ complianceStatus: ComplianceStatus.FullyCompliant }),
      makeRelevantSet({ complianceStatus: ComplianceStatus.FullyCompliant }),
    ];
    const dist = calculateComplianceDistribution(items);
    expect(dist).toHaveLength(1);
    expect(dist[0].status).toBe(ComplianceStatus.FullyCompliant);
    expect(dist[0].count).toBe(2);
    expect(dist[0].percentage).toBe(100);
  });

  it('calculates multiple status groups with correct percentages', () => {
    const items = [
      makeRelevantSet({ complianceStatus: ComplianceStatus.FullyCompliant }),
      makeRelevantSet({ complianceStatus: ComplianceStatus.FullyCompliant }),
      makeRelevantSet({ complianceStatus: ComplianceStatus.BelowMinimum }),
    ];
    const dist = calculateComplianceDistribution(items);
    const compliant = dist.find(d => d.status === ComplianceStatus.FullyCompliant)!;
    const below = dist.find(d => d.status === ComplianceStatus.BelowMinimum)!;
    expect(compliant.percentage).toBe(67);
    expect(below.percentage).toBe(33);
  });
});

// ─── calculateRPEAccuracy ─────────────────────────────────────────────────────

describe('calculateRPEAccuracy', () => {
  it('returns empty array when no sets have both RPEs', () => {
    const items = [makeRelevantSet({ actualRPE: null, expectedRPE: 8 })];
    expect(calculateRPEAccuracy(items)).toHaveLength(0);
  });

  it('calculates deviation correctly', () => {
    const date = new Date('2024-01-15');
    const items = [makeRelevantSet({ actualRPE: 9, expectedRPE: 8 }, date)];
    const result = calculateRPEAccuracy(items);
    expect(result).toHaveLength(1);
    expect(result[0].deviation).toBe(1);
    expect(result[0].actualRPE).toBe(9);
    expect(result[0].expectedRPE).toBe(8);
  });

  it('handles negative deviation (actual below expected)', () => {
    const items = [makeRelevantSet({ actualRPE: 7, expectedRPE: 8 })];
    const result = calculateRPEAccuracy(items);
    expect(result[0].deviation).toBe(-1);
  });

  it('skips sets missing either RPE value', () => {
    const items = [
      makeRelevantSet({ actualRPE: 8, expectedRPE: null }),
      makeRelevantSet({ actualRPE: null, expectedRPE: 8 }),
      makeRelevantSet({ actualRPE: 8, expectedRPE: 8 }),
    ];
    expect(calculateRPEAccuracy(items)).toHaveLength(1);
  });
});

// ─── calculateWeeklyFrequency ─────────────────────────────────────────────────

describe('calculateWeeklyFrequency', () => {
  it('returns empty array when from >= to', () => {
    const d = new Date('2024-01-01');
    expect(calculateWeeklyFrequency(d, d, [], null)).toHaveLength(0);
  });

  it('counts sessions in the correct week', () => {
    const from = new Date('2024-01-01');
    const to = new Date('2024-01-31');
    const sessions = [makeSession('s1', new Date('2024-01-10'), new Date('2024-01-10'))];
    const result = calculateWeeklyFrequency(from, to, sessions, 3);
    const weekWithSession = result.find(w => w.actual > 0);
    expect(weekWithSession).toBeDefined();
    expect(weekWithSession!.target).toBe(3);
  });

  it('includes target even for weeks with no sessions', () => {
    const from = new Date('2024-01-01');
    const to = new Date('2024-01-31');
    const result = calculateWeeklyFrequency(from, to, [], 4);
    expect(result.length).toBeGreaterThan(0);
    result.forEach(w => {
      expect(w.actual).toBe(0);
      expect(w.target).toBe(4);
    });
  });

  it('handles null target', () => {
    const from = new Date('2024-01-01');
    const to = new Date('2024-01-14');
    const result = calculateWeeklyFrequency(from, to, [], null);
    result.forEach(w => expect(w.target).toBeNull());
  });
});

// ─── buildSessionHistoryFromFlatData ─────────────────────────────────────────

describe('buildSessionHistoryFromFlatData', () => {
  it('returns empty array for no sessions', () => {
    expect(buildSessionHistoryFromFlatData([], [], [], [])).toEqual([]);
  });

  it('aggregates sets correctly', () => {
    const session = makeSession('s1', new Date('2024-01-10'), new Date('2024-01-10'));
    const groups = [{ id: 'g1', workoutSessionId: 's1' }];
    const items = [{ id: 'i1', sessionExerciseGroupId: 'g1' }];
    const sets = [
      { sessionExerciseItemId: 'i1', isCompleted: true, actualRPE: 8, actualLoad: 100, actualCount: 5 },
      { sessionExerciseItemId: 'i1', isCompleted: false, actualRPE: null, actualLoad: null, actualCount: null },
    ];

    const result = buildSessionHistoryFromFlatData([session], groups, items, sets);
    expect(result).toHaveLength(1);
    expect(result[0].totalVolume).toBe(500);
    expect(result[0].avgRPE).toBe(8);
  });

  it('sorts by date descending', () => {
    const s1 = makeSession('s1', new Date('2024-01-01'), new Date('2024-01-01'));
    const s2 = makeSession('s2', new Date('2024-01-10'), new Date('2024-01-10'));
    const result = buildSessionHistoryFromFlatData([s1, s2], [], [], []);
    expect(result[0].id).toBe('s2');
    expect(result[1].id).toBe('s1');
  });

  it('uses session.totalSets when available', () => {
    const session = { ...makeSession('s1', new Date()), totalSets: 10 };
    const result = buildSessionHistoryFromFlatData([session], [], [], []);
    expect(result[0].totalSets).toBe(10);
  });
});

// ─── buildSessionHistory ──────────────────────────────────────────────────────

describe('buildSessionHistory', () => {
  it('returns empty array for empty input', () => {
    expect(buildSessionHistory([])).toEqual([]);
  });

  it('aggregates completed sets and volume', () => {
    const hydratedSessions = [
      {
        session: makeSession('s1', new Date('2024-01-05'), new Date('2024-01-05')),
        groups: [
          {
            items: [
              {
                sets: [
                  makeSet({ isCompleted: true, actualLoad: 80, actualCount: 8, actualRPE: 7 }),
                  makeSet({ isCompleted: false }),
                ],
              },
            ],
          },
        ],
      },
    ];
    const result = buildSessionHistory(hydratedSessions);
    expect(result).toHaveLength(1);
    expect(result[0].totalVolume).toBe(640);
    expect(result[0].avgRPE).toBe(7);
  });

  it('handles session with totalLoad override', () => {
    const session = { ...makeSession('s1', new Date()), totalLoad: 999 };
    const result = buildSessionHistory([{ session, groups: [] }]);
    expect(result[0].totalVolume).toBe(999);
  });

  it('returns null avgRPE when no completed sets have RPE', () => {
    const session = makeSession('s1', new Date());
    const result = buildSessionHistory([{
      session,
      groups: [{ items: [{ sets: [makeSet({ isCompleted: true, actualRPE: null })] }] }],
    }]);
    expect(result[0].avgRPE).toBeNull();
  });
});

// ─── calculateComplianceStats ─────────────────────────────────────────────────

describe('calculateComplianceStats', () => {
  it('returns 0 compliance for empty sets', () => {
    const result = calculateComplianceStats([], null);
    expect(result.avgCompliance).toBe(0);
    expect(result.complianceTrend).toBeNull();
  });

  it('calculates 100% when all sets are fully compliant', () => {
    const items = [
      makeRelevantSet({ complianceStatus: ComplianceStatus.FullyCompliant }),
      makeRelevantSet({ complianceStatus: ComplianceStatus.WithinRange }),
    ];
    const result = calculateComplianceStats(items, 5);
    expect(result.avgCompliance).toBe(100);
    expect(result.complianceTrend).toBe(5);
  });

  it('calculates 50% when half compliant', () => {
    const items = [
      makeRelevantSet({ complianceStatus: ComplianceStatus.FullyCompliant }),
      makeRelevantSet({ complianceStatus: ComplianceStatus.BelowMinimum }),
    ];
    const result = calculateComplianceStats(items, null);
    expect(result.avgCompliance).toBe(50);
  });
});

// ─── calculateRPEStats ────────────────────────────────────────────────────────

describe('calculateRPEStats', () => {
  it('returns zeros for empty accuracy list', () => {
    const result = calculateRPEStats([]);
    expect(result.avgDeviation).toBe(0);
    expect(result.withinHalfPercent).toBe(0);
    expect(result.rpeTrend).toBeNull();
  });

  it('calculates average absolute deviation', () => {
    const points = [
      { date: '01/01', expectedRPE: 8, actualRPE: 9, deviation: 1 },
      { date: '02/01', expectedRPE: 8, actualRPE: 7, deviation: -1 },
    ];
    const result = calculateRPEStats(points);
    expect(result.avgDeviation).toBe(1);
    expect(result.withinHalfPercent).toBe(0);
  });

  it('calculates withinHalf correctly', () => {
    const points = [
      { date: '01/01', expectedRPE: 8, actualRPE: 8.5, deviation: 0.5 },
      { date: '02/01', expectedRPE: 8, actualRPE: 7.5, deviation: -0.5 },
      { date: '03/01', expectedRPE: 8, actualRPE: 10, deviation: 2 },
    ];
    const result = calculateRPEStats(points);
    expect(result.withinHalfPercent).toBe(67);
  });

  it('computes rpeTrend with 3+ points', () => {
    const points = [
      { date: '01/01', expectedRPE: 8, actualRPE: 8, deviation: 0 },
      { date: '02/01', expectedRPE: 8, actualRPE: 8.5, deviation: 0.5 },
      { date: '03/01', expectedRPE: 8, actualRPE: 9, deviation: 1 },
    ];
    const result = calculateRPEStats(points);
    expect(result.rpeTrend).not.toBeNull();
  });

  it('rpeTrend is null with fewer than 3 points', () => {
    const points = [
      { date: '01/01', expectedRPE: 8, actualRPE: 8, deviation: 0 },
      { date: '02/01', expectedRPE: 8, actualRPE: 8, deviation: 0 },
    ];
    const result = calculateRPEStats(points);
    expect(result.rpeTrend).toBeNull();
  });
});

// ─── calculateVolumeStats ─────────────────────────────────────────────────────

describe('calculateVolumeStats', () => {
  it('returns nulls for empty data', () => {
    const result = calculateVolumeStats([], [], []);
    expect(result.avgSetsPerWeek).toBe(0);
    expect(result.mostTrainedMuscle).toBeNull();
    expect(result.leastTrainedMuscle).toBeNull();
  });

  it('computes avgSetsPerWeek', () => {
    const sets = [makeRelevantSet(), makeRelevantSet(), makeRelevantSet()];
    const weeks = [
      { weekLabel: 'w1', weekStart: new Date(), actual: 1, target: null },
      { weekLabel: 'w2', weekStart: new Date(), actual: 2, target: null },
    ];
    const result = calculateVolumeStats(sets, weeks, []);
    expect(result.avgSetsPerWeek).toBe(1.5);
  });

  it('identifies most and least trained muscles', () => {
    const volumeByMuscle = [
      { name: 'chest', weightedSets: 10, setsTimesReps: 100, volumeTonnage: 1000 },
      { name: 'back', weightedSets: 5, setsTimesReps: 50, volumeTonnage: 500 },
    ];
    const result = calculateVolumeStats([], [], volumeByMuscle);
    expect(result.mostTrainedMuscle).toBe('chest');
    expect(result.leastTrainedMuscle).toBe('back');
  });

  it('leastTrainedMuscle is null with fewer than 2 muscles', () => {
    const volumeByMuscle = [{ name: 'chest', weightedSets: 10, setsTimesReps: 100, volumeTonnage: 1000 }];
    const result = calculateVolumeStats([], [], volumeByMuscle);
    expect(result.mostTrainedMuscle).toBe('chest');
    expect(result.leastTrainedMuscle).toBeNull();
  });
});

// ─── calculateFrequencyStats ──────────────────────────────────────────────────

describe('calculateFrequencyStats', () => {
  it('returns 0 for empty weeks', () => {
    expect(calculateFrequencyStats([]).avgWeeklyFrequency).toBe(0);
  });

  it('computes correct average', () => {
    const weeks = [
      { weekLabel: 'w1', weekStart: new Date(), actual: 2, target: null },
      { weekLabel: 'w2', weekStart: new Date(), actual: 4, target: null },
    ];
    expect(calculateFrequencyStats(weeks).avgWeeklyFrequency).toBe(3);
  });
});

// ─── convertVolumeMapToExtended ───────────────────────────────────────────────

describe('convertVolumeMapToExtended', () => {
  it('returns empty array for empty map', () => {
    expect(convertVolumeMapToExtended(new Map())).toEqual([]);
  });

  it('filters out entries with 0 weightedSets', () => {
    const m = new Map([
      ['chest', { weightedSets: 0, setsTimesReps: 0, volumeTonnage: 0 }],
      ['back', { weightedSets: 5, setsTimesReps: 50, volumeTonnage: 500 }],
    ]);
    const result = convertVolumeMapToExtended(m);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('back');
  });

  it('sorts by weightedSets descending', () => {
    const m = new Map([
      ['legs', { weightedSets: 3, setsTimesReps: 30, volumeTonnage: 300 }],
      ['chest', { weightedSets: 10, setsTimesReps: 100, volumeTonnage: 1000 }],
    ]);
    const result = convertVolumeMapToExtended(m);
    expect(result[0].name).toBe('chest');
    expect(result[1].name).toBe('legs');
  });

  it('rounds values correctly', () => {
    const m = new Map([
      ['chest', { weightedSets: 1.999, setsTimesReps: 19.999, volumeTonnage: 999.9 }],
    ]);
    const result = convertVolumeMapToExtended(m);
    expect(result[0].weightedSets).toBe(2);
    expect(result[0].setsTimesReps).toBe(20);
    expect(result[0].volumeTonnage).toBe(1000);
  });
});
