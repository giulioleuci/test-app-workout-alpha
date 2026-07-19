import { CounterType, type Muscle } from '@/domain/enums';
import { computeSetEstimates, filterCompleted } from '@/services/logic/setStats';

import type { SessionFinishingPort } from './ports';

export class SessionFinishingUseCases {
  constructor(private readonly sessions: SessionFinishingPort) {}
  async finishSession(sessionId: string, completedAt: Date): Promise<void> {
    const groups = await this.sessions.getGroups(sessionId); const bodyWeight = (await this.sessions.getLatestBodyWeight())?.weight;
    let totalSets = 0; let totalLoad = 0; let totalReps = 0; let totalDuration = 0; const primary = new Set<Muscle>(); const secondary = new Set<Muscle>();
    for (const group of groups) {
      for (const item of await this.sessions.getItems(group.id)) {
        const completed = filterCompleted(await this.sessions.getSets(item.id));
        if (!completed.length) { await this.sessions.deleteSets(item.id); await this.sessions.deleteItem(item.id); continue; }
        const version = await this.sessions.getExerciseVersion(item.exerciseId); const counter = version?.counterType ?? CounterType.Reps;
        version?.primaryMuscles.forEach(muscle => primary.add(muscle)); version?.secondaryMuscles.forEach(muscle => secondary.add(muscle));
        for (const set of completed) {
          const estimates = computeSetEstimates(set.actualLoad, set.actualCount, set.actualRPE, bodyWeight); if (estimates.e1rm != null) set.e1rm = estimates.e1rm; if (estimates.relativeIntensity != null) set.relativeIntensity = estimates.relativeIntensity;
          if (set.e1rm || set.relativeIntensity) await this.sessions.updateSet(set.id, { e1rm: set.e1rm, relativeIntensity: set.relativeIntensity });
          totalSets++; const count = set.actualCount ?? 0; const load = set.actualLoad ?? 0; if (counter === CounterType.Reps) { totalReps += count; totalLoad += count * load; } else if (counter === CounterType.Seconds || counter === CounterType.Minutes) totalDuration += counter === CounterType.Minutes ? count * 60 : count;
        }
        await this.sessions.updateItem(item.id, { completedAt, isCompleted: true, exerciseVersionId: version?.id });
      }
      const remaining = await this.sessions.getItems(group.id); if (!remaining.length) await this.sessions.deleteGroup(group.id); else await this.sessions.updateGroup(group.id, { completedAt, isCompleted: true });
    }
    await this.sessions.updateSession(sessionId, { totalSets, totalLoad: Math.round(totalLoad), totalReps, totalDuration, primaryMusclesSnapshot: [...primary], secondaryMusclesSnapshot: [...secondary] });
    await this.sessions.completeSession(sessionId, completedAt); await this.sessions.analyzeSession(sessionId);
  }
  discardSession(id: string) { return this.sessions.discardSession(id); }
}
