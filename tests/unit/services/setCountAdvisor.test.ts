import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import { describe, it, expect } from 'vitest';

import type { SessionSet, PlannedSet } from '@/domain/entities';
import { SetType, ToFailureIndicator } from '@/domain/enums';
import type { FatigueProgressionProfile } from '@/domain/value-objects';
import { adviseOnSetCount } from '@/services/setCountAdvisor';

describe('adviseOnSetCount', () => {

  const createMockSet = (overrides: Partial<SessionSet> = {}): SessionSet => ({
    id: '1',
    sessionExerciseItemId: '1',
    setType: SetType.Working,
    orderIndex: generateTestRank(0),
    actualLoad: 100,
    actualCount: 10,
    actualRPE: 7,
    actualToFailure: ToFailureIndicator.None,
    expectedRPE: 7,
    isCompleted: true,
    isSkipped: false,
    partials: false,
    forcedReps: 0,
    ...overrides,
  } as SessionSet);

  const createMockPlannedSet = (overrides: Partial<PlannedSet> = {}): PlannedSet => ({
    id: '1',
    plannedExerciseItemId: '1',
    setCountRange: { min: 3, max: 5 },
    countRange: { min: 8, max: 12, toFailure: ToFailureIndicator.None },
    setType: SetType.Working,
    
    orderIndex: generateTestRank(0),
    ...overrides,
  } as PlannedSet);

  describe('Basic Set Count Logic', () => {
    it('should advise "doAnother" when below minimum sets', () => {
      const plannedSet = createMockPlannedSet({ setCountRange: { min: 3, max: 5 } });
      const completedSets = [
        createMockSet({ orderIndex: generateTestRank(0), isCompleted: true }),
        createMockSet({ orderIndex: generateTestRank(1), isCompleted: true }),
      ];

      const result = adviseOnSetCount(completedSets, plannedSet, 'medium');

      expect(result.advice).toBe('doAnother');
      expect(result.reason).toContain('2/3 serie minime completate');
    });

    it('should advise "stop" when max sets reached', () => {
      const plannedSet = createMockPlannedSet({ setCountRange: { min: 3, max: 5 } });
      const completedSets = [
        createMockSet({ orderIndex: generateTestRank(0) }),
        createMockSet({ orderIndex: generateTestRank(1) }),
        createMockSet({ orderIndex: generateTestRank(2) }),
        createMockSet({ orderIndex: generateTestRank(3) }),
        createMockSet({ orderIndex: generateTestRank(4) }),
      ];

      const result = adviseOnSetCount(completedSets, plannedSet, 'medium');

      expect(result.advice).toBe('stop');
      expect(result.reason).toContain('Massimo di 5 serie raggiunto');
    });

    it('should advise "optional" when between min and max sets', () => {
      const plannedSet = createMockPlannedSet({ setCountRange: { min: 3, max: 5 } });
      const completedSets = [
        createMockSet({ orderIndex: generateTestRank(0) }),
        createMockSet({ orderIndex: generateTestRank(1) }),
        createMockSet({ orderIndex: generateTestRank(2) }), // 3 sets completed
      ];

      const result = adviseOnSetCount(completedSets, plannedSet, 'medium');

      expect(result.advice).toBe('optional');
      expect(result.reason).toContain('3 serie completate');
    });
  });

  describe('RPE Ceiling Stop Criteria', () => {
    it('should advise "stop" if RPE ceiling reached (stopCriteria="rpeCeiling") and min sets met', () => {
      const plannedSet = createMockPlannedSet({
        setCountRange: { min: 3, max: 5, stopCriteria: 'rpeCeiling' }
      });
      const completedSets = [
        createMockSet({ orderIndex: generateTestRank(0), actualRPE: 8 }),
        createMockSet({ orderIndex: generateTestRank(1), actualRPE: 9 }),
        createMockSet({ orderIndex: generateTestRank(2), actualRPE: 9.5 }), // Reached medium ceiling (9.5)
      ];

      const result = adviseOnSetCount(completedSets, plannedSet, 'medium'); // medium -> 9.5 ceiling

      expect(result.advice).toBe('stop');
      expect(result.reason).toContain('RPE 9.5 ha raggiunto il tetto');
    });

    it('should use correct RPE ceiling based on fatigue sensitivity', () => {
      const plannedSet = createMockPlannedSet({
        setCountRange: { min: 3, max: 5, stopCriteria: 'rpeCeiling' }
      });

      // Low sensitivity -> ceiling 10
      const resultLow = adviseOnSetCount(
        [
            createMockSet({ orderIndex: generateTestRank(0), actualRPE: 9.5 }),
            createMockSet({ orderIndex: generateTestRank(1), actualRPE: 9.5 }),
            createMockSet({ orderIndex: generateTestRank(2), actualRPE: 9.5 }),
        ],
        plannedSet,
        'low'
      );
      expect(resultLow.advice).toBe('optional'); // Not hit 10 yet

      // High sensitivity -> ceiling 9
      const resultHigh = adviseOnSetCount(
        [
            createMockSet({ orderIndex: generateTestRank(0), actualRPE: 9 }),
            createMockSet({ orderIndex: generateTestRank(1), actualRPE: 9 }),
            createMockSet({ orderIndex: generateTestRank(2), actualRPE: 9 }),
        ],
        plannedSet,
        'high'
      );
      expect(resultHigh.advice).toBe('stop'); // Hit 9
    });

     it('should advise "optional" (warning) if RPE ceiling reached but min sets NOT met', () => {
      const plannedSet = createMockPlannedSet({
        setCountRange: { min: 3, max: 5, stopCriteria: 'rpeCeiling' }
      });
      const completedSets = [
        createMockSet({ orderIndex: generateTestRank(0), actualRPE: 9.5 }), // Hit medium ceiling on first set
      ];

      const result = adviseOnSetCount(completedSets, plannedSet, 'medium');

      expect(result.advice).toBe('optional');
      expect(result.reason).toContain('Mancano 2 serie al minimo');
    });
  });

  describe('Failure Stop Criteria', () => {
    it('should advise "stop" if absolute failure reached and min sets met', () => {
      const plannedSet = createMockPlannedSet({ setCountRange: { min: 3, max: 5 } });
      const completedSets = [
        createMockSet({ orderIndex: generateTestRank(0) }),
        createMockSet({ orderIndex: generateTestRank(1) }),
        createMockSet({ orderIndex: generateTestRank(2), actualToFailure: ToFailureIndicator.AbsoluteFailure }),
      ];

      const result = adviseOnSetCount(completedSets, plannedSet, 'medium');

      expect(result.advice).toBe('stop');
      expect(result.reason).toContain('Cedimento raggiunto');
    });

    it('should advise "stop" if technical failure reached and min sets met', () => {
      const plannedSet = createMockPlannedSet({ setCountRange: { min: 3, max: 5 } });
      const completedSets = [
        createMockSet({ orderIndex: generateTestRank(0) }),
        createMockSet({ orderIndex: generateTestRank(1) }),
        createMockSet({ orderIndex: generateTestRank(2), actualToFailure: ToFailureIndicator.TechnicalFailure }),
      ];

      const result = adviseOnSetCount(completedSets, plannedSet, 'medium');

      expect(result.advice).toBe('stop');
    });
  });

  describe('Fatigue Progression Logic', () => {
    it('should advise "stop" if RPE climbs too fast', () => {
      const profile: FatigueProgressionProfile = {
        expectedRPEIncrementPerSet: 0.5,
        tolerance: 0.5,
      };

      const plannedSet = createMockPlannedSet({
        setCountRange: { min: 3, max: 5 },
        fatigueProgressionProfile: profile
      });

      // Expected climb is 0.5, tolerance 0.5. Threshold for stop is > (0.5 + 0.5*2) = 1.5 climb.
      // Set 2 -> 7.0
      // Set 3 -> 9.0 (climb = 2.0, which is > 1.5)

      const completedSets = [
        createMockSet({ orderIndex: generateTestRank(0), actualRPE: 6.5 }),
        createMockSet({ orderIndex: generateTestRank(1), actualRPE: 7.0 }),
        createMockSet({ orderIndex: generateTestRank(2), actualRPE: 9.0 }),
      ];

      const result = adviseOnSetCount(completedSets, plannedSet, 'medium');

      expect(result.advice).toBe('stop');
      expect(result.reason).toContain('Incremento RPE troppo rapido');
    });

    it('should NOT advise "stop" if RPE climb is within tolerance', () => {
      const profile: FatigueProgressionProfile = {
        expectedRPEIncrementPerSet: 0.5,
        tolerance: 0.5,
      };

      const plannedSet = createMockPlannedSet({
        setCountRange: { min: 3, max: 5 },
        fatigueProgressionProfile: profile
      });

      // Climb 1.0 (<= 1.5 threshold)
      const completedSets = [
        createMockSet({ orderIndex: generateTestRank(0), actualRPE: 7.0 }),
        createMockSet({ orderIndex: generateTestRank(1), actualRPE: 7.5 }),
        createMockSet({ orderIndex: generateTestRank(2), actualRPE: 8.5 }),
      ];

      const result = adviseOnSetCount(completedSets, plannedSet, 'medium');

      expect(result.advice).toBe('optional');
    });
  });

});
