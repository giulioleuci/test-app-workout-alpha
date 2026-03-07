import { LexoRank } from 'lexorank';

function generateRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for (let i = 0; i < index; i++) rank = rank.genNext();
  return rank.toString();
}


import { nanoid } from 'nanoid';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import type { Exercise, PlannedWorkout, PlannedSession, WorkoutSession, SessionExerciseGroup, SessionExerciseItem, SessionSet } from '@/domain/entities';
import { Muscle, Equipment, MovementPattern, CounterType, MuscleGroup, ExerciseGroupType, ExerciseType, SetType, WorkType, ObjectiveType, PlannedWorkoutStatus, PlannedSessionStatus, ComplianceStatus } from '@/domain/enums';
import { ToFailureIndicator } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

import { db } from './database';
import { roundToHalf } from '@/lib/math';

// ===== 30 Common Exercises (Italian naming conventions) =====

const seedExerciseData: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'variantIds'>[] = [
  {
    name: 'Panca piana', type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest], secondaryMuscles: [Muscle.Triceps, Muscle.Shoulders], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg',
    description: 'Esercizio multiarticolare fondamentale per lo sviluppo di petto, tricipiti e deltoidi anteriori. Si esegue sdraiati su panca con bilanciere impugnato poco oltre la larghezza delle spalle. Il carico viene controllato in discesa fino a sfiorare il petto nella parte medio-bassa dello sterno, quindi spinto verso l\'alto fino a completa estensione dei gomiti.',
    keyPoints: 'Scapole addotte e depresse, piedi ben ancorati e leg drive attivo.\nPolsi neutri e avambracci perpendicolari al suolo.\nBilanciere in linea medio-bassa sul petto.\nControllo dell\'eccentrica, niente rimbalzo.\nCore in tensione e glutei a contatto con la panca.',
  },
  {
    name: 'Panca inclinata', type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest, Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg',
    description: 'Variante della panca piana con panca inclinata (30-45°) che enfatizza il fascio clavicolare del pettorale e i deltoidi anteriori.',
    keyPoints: 'Inclinazione tra 30° e 45° per massimizzare l\'attivazione del petto alto.\nScapole retratte e depresse come nella panca piana.\nTraiettoria del bilanciere leggermente obliqua verso la clavicola.',
  },
  { name: 'Panca piana manubri', type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest], secondaryMuscles: [Muscle.Triceps, Muscle.Shoulders], equipment: [Equipment.Dumbbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  {
    name: 'Squat', type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps, Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings, Muscle.Abs], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg',
    description: 'Il re degli esercizi per le gambe. Bilanciere in posizione high-bar o low-bar sulle spalle. Discesa controllata fino sotto il parallelo mantenendo il torso eretto e le ginocchia in linea con le punte dei piedi.',
    keyPoints: 'Piedi alla larghezza delle spalle, punte leggermente extraruotate.\nGinocchia che seguono la direzione delle punte durante tutta l\'esecuzione.\nDiscesa sotto il parallelo dell\'anca.\nCore braced, respiro diaframmatico con Valsalva.\nBilanciere sopra il centro del piede.',
  },
  { name: 'Squat frontale', type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps], secondaryMuscles: [Muscle.Glutes, Muscle.Abs], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  {
    name: 'Stacco da terra', type: ExerciseType.Compound, primaryMuscles: [Muscle.Hamstrings, Muscle.Glutes, Muscle.LowerBack], secondaryMuscles: [Muscle.UpperBack, Muscle.Forearms], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Hinge, counterType: CounterType.Reps, defaultLoadUnit: 'kg',
    description: 'Esercizio multiarticolare che coinvolge quasi tutti i muscoli del corpo. Il bilanciere viene sollevato dal suolo fino all\'estensione completa di anche e ginocchia mantenendo la schiena neutra.',
    keyPoints: 'Barra vicina al corpo per tutta l\'esecuzione (shin scrape).\nSchiena neutra — niente iperflessione lombare.\nExtend hips and knees simultaneously (non tirare con la schiena).\nScapole retratte, latissimi attivati.\nRespiro e Valsalva prima di iniziare il sollevamento.',
  },
  { name: 'Stacco rumeno', type: ExerciseType.Compound, primaryMuscles: [Muscle.Hamstrings, Muscle.Glutes], secondaryMuscles: [Muscle.LowerBack], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Hinge, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  {
    name: 'Military press', type: ExerciseType.Compound, primaryMuscles: [Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Barbell], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg',
    description: 'Pressa verticale con bilanciere da posizione in piedi o seduta. Sviluppa deltoidi, trapezi superiori e tricipiti.',
    keyPoints: 'Presa poco oltre la larghezza delle spalle.\nCore braced, glutei contratti per evitare iperlordosi.\nBilanciere scende davanti al viso fino all\'altezza del mento.\nEstensione completa dei gomiti in alto senza iperestendere la schiena.',
  },
  { name: 'Lento avanti manubri', type: ExerciseType.Compound, primaryMuscles: [Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  {
    name: 'Trazioni alla sbarra', type: ExerciseType.Compound, primaryMuscles: [Muscle.Lats, Muscle.UpperBack], secondaryMuscles: [Muscle.Biceps], equipment: [Equipment.Bodyweight, Equipment.PullUpBar], movementPattern: MovementPattern.VerticalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg',
    description: 'Esercizio a corpo libero di trazione verticale. Mento sopra la sbarra partendo da braccia completamente estese. Eccellente per latissimi, romboidi e bicipiti.',
    keyPoints: 'Partire da dead hang completo.\nScapole depresse prima di iniziare la trazione.\nGomiti verso il basso e verso l\'interno.\nEvitare oscillazioni e kipping (in allenamento di forza/ipertrofia).\nControllo dell\'eccentrica.',
  },
  { name: 'Lat machine', type: ExerciseType.Compound, primaryMuscles: [Muscle.Lats], secondaryMuscles: [Muscle.Biceps, Muscle.UpperBack], equipment: [Equipment.Cable], movementPattern: MovementPattern.VerticalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Rematore con bilanciere', type: ExerciseType.Compound, primaryMuscles: [Muscle.UpperBack, Muscle.Lats], secondaryMuscles: [Muscle.Biceps, Muscle.Forearms], equipment: [Equipment.Barbell], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Rematore con manubrio', type: ExerciseType.Compound, primaryMuscles: [Muscle.UpperBack, Muscle.Lats], secondaryMuscles: [Muscle.Biceps], equipment: [Equipment.Dumbbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Curl con bilanciere', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Biceps], secondaryMuscles: [Muscle.Forearms], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Curl con manubri', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Biceps], secondaryMuscles: [Muscle.Forearms], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'French press', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Triceps], secondaryMuscles: [], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Push down al cavo', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Triceps], secondaryMuscles: [], equipment: [Equipment.Cable], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Leg press', type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps, Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings], equipment: [Equipment.Machine], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Leg curl', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Hamstrings], secondaryMuscles: [], equipment: [Equipment.Machine], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Leg extension', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Quadriceps], secondaryMuscles: [], equipment: [Equipment.Machine], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Alzate laterali', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Deltoids], secondaryMuscles: [Muscle.Traps], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Crunch', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Abs], secondaryMuscles: [], equipment: [Equipment.Bodyweight], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Plank', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Abs, Muscle.LowerBack], secondaryMuscles: [Muscle.Shoulders], equipment: [Equipment.Bodyweight], movementPattern: MovementPattern.Isometric, counterType: CounterType.Seconds, defaultLoadUnit: 'kg' },
  { name: 'Calf raise', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Calves], secondaryMuscles: [], equipment: [Equipment.Machine], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  // 6 new exercises
  { name: 'Hip thrust', type: ExerciseType.Compound, primaryMuscles: [Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.Hinge, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Pulley basso', type: ExerciseType.Compound, primaryMuscles: [Muscle.UpperBack, Muscle.Lats], secondaryMuscles: [Muscle.Biceps], equipment: [Equipment.Cable], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Dip alle parallele', type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest, Muscle.Triceps], secondaryMuscles: [Muscle.Shoulders], equipment: [Equipment.Bodyweight, Equipment.ParallelBars], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Facepull al cavo', type: ExerciseType.Isolation, primaryMuscles: [Muscle.Deltoids, Muscle.UpperBack], secondaryMuscles: [Muscle.Traps], equipment: [Equipment.Cable], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Bulgarian split squat', type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps, Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
  { name: 'Pressa per spalle', type: ExerciseType.Compound, primaryMuscles: [Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Machine], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' },
];

// ===== Exported seed functions =====

export async function seedExercises(): Promise<void> {
  const now = dayjs().toDate();
  const exercises: Exercise[] = seedExerciseData.map(e => ({
    ...e,
    id: nanoid(),
    variantIds: [],
    createdAt: now,
    updatedAt: now,
  }));
  await db.exercises.bulkAdd(exercises);
}

// Global cache for exercise IDs during seeding
const exerciseIdCache = new Map<string, string>();

// Optimized: find exercise ID by name using cache or repo
async function findExerciseId(name: string): Promise<string> {
  if (exerciseIdCache.has(name)) {
    return exerciseIdCache.get(name)!;
  }

  // Use Repository findByName
  const ex = await ExerciseRepository.findByName(name);
  if (!ex) throw new Error(`Seed exercise not found: ${name}`);

  exerciseIdCache.set(name, ex.id);
  return ex.id;
}

// Helper: create a standard group with one exercise and one set block
async function createStandardGroup(
  sessionId: string,
  exerciseName: string,
  orderIndex: number,
  config: { repsMin: number; repsMax: number; rpeMin: number; rpeMax: number; restMin: number; restMax: number; sets: number }
): Promise<void> {
  const exerciseId = await findExerciseId(exerciseName);
  const groupId = nanoid();
  const itemId = nanoid();

  await db.plannedExerciseGroups.add({
    id: groupId,
    plannedSessionId: sessionId,
    groupType: ExerciseGroupType.Standard,
    orderIndex: generateRank(orderIndex),
  });

  await db.plannedExerciseItems.add({
    id: itemId,
    plannedExerciseGroupId: groupId,
    exerciseId,
    counterType: CounterType.Reps,
    orderIndex: generateRank(0),
  });

  await db.plannedSets.add({
    id: nanoid(),
    plannedExerciseItemId: itemId,
    setCountRange: { min: config.sets, max: config.sets },
    countRange: { min: config.repsMin, max: config.repsMax, toFailure: ToFailureIndicator.None },
    rpeRange: { min: config.rpeMin, max: config.rpeMax },
    restSecondsRange: { min: config.restMin, max: config.restMax, isFixed: config.restMin === config.restMax },
    setType: SetType.Working,
    orderIndex: generateRank(0),
  });
}

// ===== History Generation Helper =====

export async function seedHistory(workoutId: string, monthsBack = 6): Promise<void> {
  const sessions = await db.plannedSessions.where('plannedWorkoutId').equals(workoutId).sortBy('orderIndex');
  if (sessions.length === 0) return;

  const sessionDetails = await Promise.all(sessions.map(async (s) => {
    const groups = await db.plannedExerciseGroups.where('plannedSessionId').equals(s.id).sortBy('orderIndex');
    const groupsWithItems = await Promise.all(groups.map(async (g) => {
      const items = await db.plannedExerciseItems.where('plannedExerciseGroupId').equals(g.id).sortBy('orderIndex');
      const itemsWithSets = await Promise.all(items.map(async (i) => {
        const sets = await db.plannedSets.where('plannedExerciseItemId').equals(i.id).sortBy('orderIndex');
        return { ...i, sets };
      }));
      return { ...g, items: itemsWithSets };
    }));
    return { ...s, groups: groupsWithItems };
  }));

  const progress = new Map<string, { baseLoad: number; microcycleInc: number }>();

  const getInitialLoad = (exerciseName: string) => {
    const lowerName = exerciseName.toLowerCase();
    if (lowerName.includes('squat')) return 40;
    if (lowerName.includes('stacco')) return 60;
    if (lowerName.includes('panca')) return 40;
    if (lowerName.includes('military') || lowerName.includes('spalle')) return 20;
    if (lowerName.includes('curl') || lowerName.includes('french')) return 10;
    return 30; // default
  };

  const getIncrement = (exerciseName: string) => {
    const lowerName = exerciseName.toLowerCase();
    if (lowerName.includes('squat') || lowerName.includes('stacco')) return 2.5;
    if (lowerName.includes('panca')) return 2.0;
    if (lowerName.includes('military')) return 1.0;
    if (lowerName.includes('curl') || lowerName.includes('french')) return 0.5;
    return 1.25; // default
  };

  const startDate = dayjs().subtract(monthsBack, 'month').startOf('day').toDate();
  const today = dayjs().startOf('day').toDate();
  let currentDate = startDate;
  let sessionIndex = 0;

  const workoutSessions: WorkoutSession[] = [];
  const sessionExerciseGroups: SessionExerciseGroup[] = [];
  const sessionExerciseItems: SessionExerciseItem[] = [];
  const sessionSets: SessionSet[] = [];

  // Simple routine: train every other day
  let isRestDay = false;
  let absoluteSessionCount = 0;

  while (currentDate < today) {
    if (isRestDay) {
      isRestDay = false;
      currentDate = dayjs(currentDate).add(1, 'day').toDate();
      continue;
    }

    const plannedSession = sessionDetails[sessionIndex];
    const workoutSessionId = nanoid();

    // 4-week mesocycle: 3 weeks accumulation, 1 week deload
    // Assuming training every other day -> 3.5 sessions per week -> 14 sessions per mesocycle
    const mesocycleSession = absoluteSessionCount % 14;
    const isDeload = mesocycleSession >= 11;
    const plannedRpeBase = isDeload ? 6.5 : 8 + (mesocycleSession / 14) * 1.5; // ramps up from 8 to 9+ before deload
    const overallRPE = roundToHalf(plannedRpeBase + (Math.random() * 0.5 - 0.25));

    workoutSessions.push({
      id: workoutSessionId,
      plannedSessionId: plannedSession.id,
      plannedWorkoutId: workoutId,
      startedAt: dayjs(currentDate).add(12, 'hour').toDate(),
      completedAt: dayjs(currentDate).add(13, 'hour').toDate(),
      overallRPE,
      notes: isDeload ? 'Settimana di scarico.' : 'Progressione normale.',
    });

    for (const group of plannedSession.groups) {
      const sessionGroupId = nanoid();
      sessionExerciseGroups.push({
        id: sessionGroupId,
        workoutSessionId,
        plannedExerciseGroupId: group.id,
        groupType: group.groupType,
        orderIndex: group.orderIndex,
        isCompleted: true,
      });

      for (const item of group.items) {
        const sessionItemId = nanoid();
        sessionExerciseItems.push({
          id: sessionItemId,
          sessionExerciseGroupId: sessionGroupId,
          plannedExerciseItemId: item.id,
          exerciseId: item.exerciseId,
          orderIndex: item.orderIndex,
          isCompleted: true,
        });

        if (!progress.has(item.exerciseId)) {
          // hack logic to retrieve exercise name: we don't have it easily without a map, so we'll just try to infer from typical load sizes if possible
          const exerciseName = "Unknown";
          // Try to get from seed data based on random chance or just let getInitialLoad handle default
          progress.set(item.exerciseId, { baseLoad: getInitialLoad(exerciseName), microcycleInc: getIncrement(exerciseName) });
        }

        const currentStats = progress.get(item.exerciseId)!;

        // Progression applied per mesocycle
        const mesocyclesCompleted = Math.floor(absoluteSessionCount / 14);
        const accumulatedLoad = currentStats.baseLoad + (mesocyclesCompleted * currentStats.microcycleInc);
        const currentLoadRaw = isDeload ? accumulatedLoad * 0.8 : accumulatedLoad;

        // Snap load to nearest 2.5/1.25/0.5 etc based on typical plates? Let's snap to nearest 0.5
        const load = roundToHalf(currentLoadRaw);

        let setIndex = 0;
        for (const set of item.sets) {
          const setRpePlanned = plannedRpeBase + (setIndex * 0.25); // fatigue across sets
          const actualRpeRaw = setRpePlanned + (Math.random() * 0.5 - 0.25);
          const actRPE = Math.min(10, Math.max(5, roundToHalf(actualRpeRaw)));

          sessionSets.push({
            id: nanoid(),
            sessionExerciseItemId: sessionItemId,
            plannedSetId: set.id,
            setType: set.setType,
            orderIndex: set.orderIndex,
            actualLoad: load,
            actualCount: set.countRange.min, // Assuming hitting target reps
            actualRPE: actRPE,
            actualToFailure: actRPE >= 10 ? ToFailureIndicator.TechnicalFailure : ToFailureIndicator.None,
            expectedRPE: set.rpeRange?.min ?? 8,
            completedAt: dayjs(currentDate).add(12, 'hour').add(setIndex * 3, 'minute').toDate(),
            isCompleted: true,
            isSkipped: false,
            complianceStatus: ComplianceStatus.FullyCompliant,
            partials: false,
            forcedReps: 0,
          });
          setIndex++;
        }
      }
    }

    sessionIndex = (sessionIndex + 1) % sessionDetails.length;
    isRestDay = true;
    absoluteSessionCount++;
    currentDate = dayjs(currentDate).add(1, 'day').toDate();
  }

  await db.workoutSessions.bulkAdd(workoutSessions);
  await db.sessionExerciseGroups.bulkAdd(sessionExerciseGroups);
  await db.sessionExerciseItems.bulkAdd(sessionExerciseItems);
  await db.sessionSets.bulkAdd(sessionSets);
}

// ===== Full Body 2x =====

export interface SeedOptions {
  withHistory?: boolean;
}

export async function seedFullBody2x(
  status: PlannedWorkoutStatus = PlannedWorkoutStatus.Active,
  options: SeedOptions = {}
): Promise<void> {
  const now = dayjs().toDate();
  const workoutId = nanoid();

  const workout: PlannedWorkout = {
    id: workoutId,
    name: 'Full body 2x',
    objectiveType: ObjectiveType.Hypertrophy,
    workType: WorkType.Accumulation,
    status,
    createdAt: now,
    updatedAt: now,
  };
  await db.plannedWorkouts.add(workout);

  // Day A
  const dayAId = nanoid();
  const sessionA: PlannedSession = {
    id: dayAId,
    plannedWorkoutId: workoutId,
    name: 'Giorno A',
    dayNumber: 1,
    focusMuscleGroups: [MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Legs, MuscleGroup.Shoulders, MuscleGroup.Arms],
    status: PlannedSessionStatus.Pending,
    orderIndex: generateRank(0),
    createdAt: now,
    updatedAt: now,
  };

  // Day B
  const dayBId = nanoid();
  const sessionB: PlannedSession = {
    id: dayBId,
    plannedWorkoutId: workoutId,
    name: 'Giorno B',
    dayNumber: 2,
    focusMuscleGroups: [MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Legs, MuscleGroup.Shoulders, MuscleGroup.Arms],
    status: PlannedSessionStatus.Pending,
    orderIndex: generateRank(1),
    createdAt: now,
    updatedAt: now,
  };

  await db.plannedSessions.bulkAdd([sessionA, sessionB]);

  const hyp = { repsMin: 8, repsMax: 12, rpeMin: 7, rpeMax: 9, restMin: 90, restMax: 120, sets: 3 };

  // Day A exercises
  const dayAExercises = ['Squat', 'Panca piana', 'Rematore con bilanciere', 'Military press', 'Curl con bilanciere', 'Crunch'];
  for (let i = 0; i < dayAExercises.length; i++) {
    await createStandardGroup(dayAId, dayAExercises[i], i, hyp);
  }

  // Day B exercises
  const dayBExercises = ['Stacco rumeno', 'Panca inclinata', 'Lat machine', 'Alzate laterali', 'French press', 'Leg curl'];
  for (let i = 0; i < dayBExercises.length; i++) {
    await createStandardGroup(dayBId, dayBExercises[i], i, hyp);
  }

  if (options.withHistory) {
    await seedHistory(workoutId, 2);
  }
}

// ===== Push-Pull-Legs 3x =====

export async function seedPPL3x(status: PlannedWorkoutStatus = PlannedWorkoutStatus.Active): Promise<void> {
  const now = dayjs().toDate();
  const workoutId = nanoid();

  await db.plannedWorkouts.add({
    id: workoutId,
    name: 'Push-Pull-Legs',
    objectiveType: ObjectiveType.Hypertrophy,
    workType: WorkType.Accumulation,
    status,
    createdAt: now,
    updatedAt: now,
  });

  const hyp = { repsMin: 8, repsMax: 12, rpeMin: 7, rpeMax: 9, restMin: 90, restMax: 120, sets: 3 };

  const sessions = [
    { name: 'Push', dayNumber: 1, focus: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Arms], exercises: ['Panca piana', 'Military press', 'Panca piana manubri', 'Alzate laterali', 'French press'] },
    { name: 'Pull', dayNumber: 2, focus: [MuscleGroup.Back, MuscleGroup.Arms, MuscleGroup.Shoulders], exercises: ['Trazioni alla sbarra', 'Rematore con bilanciere', 'Lat machine', 'Curl con bilanciere', 'Facepull al cavo'] },
    { name: 'Legs', dayNumber: 3, focus: [MuscleGroup.Legs], exercises: ['Squat', 'Stacco rumeno', 'Leg press', 'Leg curl', 'Calf raise'] },
  ];

  for (let s = 0; s < sessions.length; s++) {
    const sessionId = nanoid();
    await db.plannedSessions.add({
      id: sessionId,
      plannedWorkoutId: workoutId,
      name: sessions[s].name,
      dayNumber: sessions[s].dayNumber,
      focusMuscleGroups: sessions[s].focus,
      status: PlannedSessionStatus.Pending,
      orderIndex: generateRank(s),
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 0; i < sessions[s].exercises.length; i++) {
      await createStandardGroup(sessionId, sessions[s].exercises[i], i, hyp);
    }
  }
}

// ===== Upper-Lower 4x =====

export async function seedUpperLower4x(status: PlannedWorkoutStatus = PlannedWorkoutStatus.Active): Promise<void> {
  const now = dayjs().toDate();
  const workoutId = nanoid();

  await db.plannedWorkouts.add({
    id: workoutId,
    name: 'Upper-Lower 4x',
    objectiveType: ObjectiveType.GeneralStrength,
    workType: WorkType.Accumulation,
    status,
    createdAt: now,
    updatedAt: now,
  });

  const strength = { repsMin: 3, repsMax: 5, rpeMin: 8, rpeMax: 9.5, restMin: 180, restMax: 240, sets: 3 };
  const hypertrophy = { repsMin: 8, repsMax: 12, rpeMin: 7, rpeMax: 9, restMin: 90, restMax: 120, sets: 3 };

  const sessions = [
    { name: 'Upper forza', dayNumber: 1, focus: [MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Shoulders, MuscleGroup.Arms], exercises: ['Panca piana', 'Rematore con bilanciere', 'Military press', 'Trazioni alla sbarra', 'Curl con bilanciere'], config: strength },
    { name: 'Lower forza', dayNumber: 2, focus: [MuscleGroup.Legs], exercises: ['Squat', 'Stacco da terra', 'Leg press', 'Leg curl', 'Calf raise'], config: strength },
    { name: 'Upper ipertrofia', dayNumber: 3, focus: [MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Shoulders, MuscleGroup.Arms], exercises: ['Panca piana manubri', 'Lat machine', 'Alzate laterali', 'French press', 'Curl con manubri'], config: hypertrophy },
    { name: 'Lower ipertrofia', dayNumber: 4, focus: [MuscleGroup.Legs], exercises: ['Squat frontale', 'Stacco rumeno', 'Leg extension', 'Leg curl', 'Hip thrust'], config: hypertrophy },
  ];

  for (let s = 0; s < sessions.length; s++) {
    const sessionId = nanoid();
    await db.plannedSessions.add({
      id: sessionId,
      plannedWorkoutId: workoutId,
      name: sessions[s].name,
      dayNumber: sessions[s].dayNumber,
      focusMuscleGroups: sessions[s].focus,
      status: PlannedSessionStatus.Pending,
      orderIndex: generateRank(s),
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 0; i < sessions[s].exercises.length; i++) {
      await createStandardGroup(sessionId, sessions[s].exercises[i], i, sessions[s].config);
    }
  }
}
