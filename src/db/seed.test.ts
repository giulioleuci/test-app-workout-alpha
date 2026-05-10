import { describe, it, expect, beforeEach } from 'vitest';

import { db } from './database';
import { seedExercises } from './seed';

describe('Seed Localization', () => {
  beforeEach(async () => {
    await db.exercises.clear();
  });

  it('produces "Bench Press" (Title Case) and English descriptions for language="en"', async () => {
    await seedExercises('en');
    const exercises = await db.exercises.toArray();
    
    const benchPress = exercises.find(e => e.name === 'Bench Press');
    expect(benchPress).toBeDefined();
    expect(benchPress?.description).toContain('Fundamental multi-joint exercise');
    
    // Check Title Case
    const squat = exercises.find(e => e.name === 'Squat');
    expect(squat).toBeDefined();
    
    const dumbbellBench = exercises.find(e => e.name === 'Dumbbell Bench Press');
    expect(dumbbellBench).toBeDefined();
  });

  it('produces "Panca piana" (Sentence case) and Italian descriptions for language="it"', async () => {
    await seedExercises('it');
    const exercises = await db.exercises.toArray();
    
    const pancaPiana = exercises.find(e => e.name === 'Panca piana');
    expect(pancaPiana).toBeDefined();
    expect(pancaPiana?.description).toContain('Esercizio multiarticolare fondamentale');
    
    // Check Sentence case (first letter upper, rest lower except proper nouns if any)
    const pancaInclinata = exercises.find(e => e.name === 'Panca inclinata');
    expect(pancaInclinata).toBeDefined();
  });
});
