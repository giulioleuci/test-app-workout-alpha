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

// ===== Exercise Translation Dictionary =====

export interface ExerciseTranslation {
  name: string;
  description?: string;
  keyPoints?: string;
}

export const EXERCISE_DICTIONARY: Record<string, Record<'en' | 'it' | 'es' | 'fr' | 'zh', ExerciseTranslation>> = {
  'panca_piana': {
    it: {
      name: 'Panca piana',
      description: 'Esercizio multiarticolare fondamentale per lo sviluppo di petto, tricipiti e deltoidi anteriori. Si esegue sdraiati su panca con bilanciere impugnato poco oltre la larghezza delle spalle. Il carico viene controllato in discesa fino a sfiorare il petto nella parte medio-bassa dello sterno, quindi spinto verso l\'alto fino a completa estensione dei gomiti.',
      keyPoints: 'Scapole addotte e depresse, piedi ben ancorati e leg drive attivo.\nPolsi neutri e avambracci perpendicolari al suolo.\nBilanciere in linea medio-bassa sul petto.\nControllo dell\'eccentrica, niente rimbalzo.\nCore in tensione e glutei a contatto con la panca.'
    },
    en: {
      name: 'Bench Press',
      description: 'Fundamental multi-joint exercise for developing the chest, triceps, and anterior deltoids. Performed lying on a bench with a barbell gripped slightly wider than shoulder width. The load is controlled during the descent until it brushes the chest at the mid-to-lower sternum, then pushed upward until elbows are fully extended.',
      keyPoints: 'Scapulae adducted and depressed, feet firmly anchored and active leg drive.\nNeutral wrists and forearms perpendicular to the floor.\nBarbell in the mid-to-lower line on the chest.\nEccentric control, no bouncing.\nCore braced and glutes in contact with the bench.'
    },
    es: {
      name: 'Bench Press',
      description: 'Fundamental multi-joint exercise for developing the chest, triceps, and anterior deltoids. Performed lying on a bench with a barbell gripped slightly wider than shoulder width. The load is controlled during the descent until it brushes the chest at the mid-to-lower sternum, then pushed upward until elbows are fully extended.',
      keyPoints: 'Scapulae adducted and depressed, feet firmly anchored and active leg drive.\nNeutral wrists and forearms perpendicular to the floor.\nBarbell in the mid-to-lower line on the chest.\nEccentric control, no bouncing.\nCore braced and glutes in contact with the bench.'
    },
    fr: {
      name: 'Bench Press',
      description: 'Fundamental multi-joint exercise for developing the chest, triceps, and anterior deltoids. Performed lying on a bench with a barbell gripped slightly wider than shoulder width. The load is controlled during the descent until it brushes the chest at the mid-to-lower sternum, then pushed upward until elbows are fully extended.',
      keyPoints: 'Scapulae adducted and depressed, feet firmly anchored and active leg drive.\nNeutral wrists and forearms perpendicular to the floor.\nBarbell in the mid-to-lower line on the chest.\nEccentric control, no bouncing.\nCore braced and glutes in contact with the bench.'
    },
    zh: {
      name: 'Bench Press',
      description: 'Fundamental multi-joint exercise for developing the chest, triceps, and anterior deltoids. Performed lying on a bench with a barbell gripped slightly wider than shoulder width. The load is controlled during the descent until it brushes the chest at the mid-to-lower sternum, then pushed upward until elbows are fully extended.',
      keyPoints: 'Scapulae adducted and depressed, feet firmly anchored and active leg drive.\nNeutral wrists and forearms perpendicular to the floor.\nBarbell in the mid-to-lower line on the chest.\nEccentric control, no bouncing.\nCore braced and glutes in contact with the bench.'
    }
  },
  'panca_inclinata': {
    it: {
      name: 'Panca inclinata',
      description: 'Variante della panca piana con panca inclinata (30-45°) che enfatizza il fascio clavicolare del pettorale e i deltoidi anteriori.',
      keyPoints: 'Inclinazione tra 30° e 45° per massimizzare l\'attivazione del petto alto.\nScapole retratte e depresse come nella panca piana.\nTraiettoria del bilanciere leggermente obliqua verso la clavicola.'
    },
    en: {
      name: 'Incline Bench Press',
      description: 'A variation of the bench press with the bench inclined (30-45°) to emphasize the clavicular head of the pectorals and the anterior deltoids.',
      keyPoints: 'Inclination between 30° and 45° to maximize upper chest activation.\nScapulae retracted and depressed as in the flat bench press.\nBarbell path slightly diagonal towards the clavicle.'
    },
    es: {
      name: 'Incline Bench Press',
      description: 'A variation of the bench press with the bench inclined (30-45°) to emphasize the clavicular head of the pectorals and the anterior deltoids.',
      keyPoints: 'Inclination between 30° and 45° to maximize upper chest activation.\nScapulae retracted and depressed as in the flat bench press.\nBarbell path slightly diagonal towards the clavicle.'
    },
    fr: {
      name: 'Incline Bench Press',
      description: 'A variation of the bench press with the bench inclined (30-45°) to emphasize the clavicular head of the pectorals and the anterior deltoids.',
      keyPoints: 'Inclination between 30° and 45° to maximize upper chest activation.\nScapulae retracted and depressed as in the flat bench press.\nBarbell path slightly diagonal towards the clavicle.'
    },
    zh: {
      name: 'Incline Bench Press',
      description: 'A variation of the bench press with the bench inclined (30-45°) to emphasize the clavicular head of the pectorals and the anterior deltoids.',
      keyPoints: 'Inclination between 30° and 45° to maximize upper chest activation.\nScapulae retracted and depressed as in the flat bench press.\nBarbell path slightly diagonal towards the clavicle.'
    }
  },
  'panca_piana_manubri': {
    it: { name: 'Panca piana manubri' },
    en: { name: 'Dumbbell Bench Press' },
    es: { name: 'Dumbbell Bench Press' },
    fr: { name: 'Dumbbell Bench Press' },
    zh: { name: 'Dumbbell Bench Press' }
  },
  'squat': {
    it: {
      name: 'Squat',
      description: 'Il re degli esercizi per le gambe. Bilanciere in posizione high-bar o low-bar sulle spalle. Discesa controllata fino sotto il parallelo mantenendo il torso eretto e le ginocchia in linea con le punte dei piedi.',
      keyPoints: 'Piedi alla larghezza delle spalle, punte leggermente extraruotate.\nGinocchia che seguono la direzione delle punte durante tutta l\'esecuzione.\nDiscesa sotto il parallelo dell\'anca.\nCore braced, respiro diaframmatico con Valsalva.\nBilanciere sopra il centro del piede.'
    },
    en: {
      name: 'Squat',
      description: 'The king of leg exercises. Barbell in high-bar or low-bar position on the shoulders. Controlled descent to below parallel while maintaining an upright torso and knees in line with the toes.',
      keyPoints: 'Feet shoulder-width apart, toes slightly turned out.\nKnees following the direction of the toes throughout the movement.\nDescent below the hip parallel.\nCore braced, diaphragmatic breathing with Valsalva.\nBarbell over the mid-foot.'
    },
    es: {
      name: 'Squat',
      description: 'The king of leg exercises. Barbell in high-bar or low-bar position on the shoulders. Controlled descent to below parallel while maintaining an upright torso and knees in line with the toes.',
      keyPoints: 'Feet shoulder-width apart, toes slightly turned out.\nKnees following the direction of the toes throughout the movement.\nDescent below the hip parallel.\nCore braced, diaphragmatic breathing with Valsalva.\nBarbell over the mid-foot.'
    },
    fr: {
      name: 'Squat',
      description: 'The king of leg exercises. Barbell in high-bar or low-bar position on the shoulders. Controlled descent to below parallel while maintaining an upright torso and knees in line with the toes.',
      keyPoints: 'Feet shoulder-width apart, toes slightly turned out.\nKnees following the direction of the toes throughout the movement.\nDescent below the hip parallel.\nCore braced, diaphragmatic breathing with Valsalva.\nBarbell over the mid-foot.'
    },
    zh: {
      name: 'Squat',
      description: 'The king of leg exercises. Barbell in high-bar or low-bar position on the shoulders. Controlled descent to below parallel while maintaining an upright torso and knees in line with the toes.',
      keyPoints: 'Feet shoulder-width apart, toes slightly turned out.\nKnees following the direction of the toes throughout the movement.\nDescent below the hip parallel.\nCore braced, diaphragmatic breathing with Valsalva.\nBarbell over the mid-foot.'
    }
  },
  'squat_frontale': {
    it: { name: 'Squat frontale' },
    en: { name: 'Front Squat' },
    es: { name: 'Front Squat' },
    fr: { name: 'Front Squat' },
    zh: { name: 'Front Squat' }
  },
  'stacco_da_terra': {
    it: {
      name: 'Stacco da terra',
      description: 'Esercizio multiarticolare che coinvolge quasi tutti i muscoli del corpo. Il bilanciere viene sollevato dal suolo fino all\'estensione completa di anche e ginocchia mantenendo la schiena neutra.',
      keyPoints: 'Barra vicina al corpo per tutta l\'esecuzione (shin scrape).\nSchiena neutra — niente iperflessione lombare.\nEstensione simultanea di anche e ginocchia (non tirare con la schiena).\nScapole retratte, latissimi attivati.\nRespiro e Valsalva prima di iniziare il sollevamento.'
    },
    en: {
      name: 'Deadlift',
      description: 'Multi-joint exercise involving almost every muscle in the body. The barbell is lifted from the ground until full extension of hips and knees while maintaining a neutral spine.',
      keyPoints: 'Bar close to the body throughout the movement (shin scrape).\nNeutral spine — no lumbar hyperflexion.\nExtend hips and knees simultaneously (don\'t pull with the back).\nScapulae retracted, lats engaged.\nBreathing and Valsalva before starting the lift.'
    },
    es: {
      name: 'Deadlift',
      description: 'Multi-joint exercise involving almost every muscle in the body. The barbell is lifted from the ground until full extension of hips and knees while maintaining a neutral spine.',
      keyPoints: 'Bar close to the body throughout the movement (shin scrape).\nNeutral spine — no lumbar hyperflexion.\nExtend hips and knees simultaneously (don\'t pull with the back).\nScapulae retracted, lats engaged.\nBreathing and Valsalva before starting the lift.'
    },
    fr: {
      name: 'Deadlift',
      description: 'Multi-joint exercise involving almost every muscle in the body. The barbell is lifted from the ground until full extension of hips and knees while maintaining a neutral spine.',
      keyPoints: 'Bar close to the body throughout the movement (shin scrape).\nNeutral spine — no lumbar hyperflexion.\nExtend hips and knees simultaneously (don\'t pull with the back).\nScapulae retracted, lats engaged.\nBreathing and Valsalva before starting the lift.'
    },
    zh: {
      name: 'Deadlift',
      description: 'Multi-joint exercise involving almost every muscle in the body. The barbell is lifted from the ground until full extension of hips and knees while maintaining a neutral spine.',
      keyPoints: 'Bar close to the body throughout the movement (shin scrape).\nNeutral spine — no lumbar hyperflexion.\nExtend hips and knees simultaneously (don\'t pull with the back).\nScapulae retracted, lats engaged.\nBreathing and Valsalva before starting the lift.'
    }
  },
  'stacco_rumeno': {
    it: { name: 'Stacco rumeno' },
    en: { name: 'Romanian Deadlift' },
    es: { name: 'Romanian Deadlift' },
    fr: { name: 'Romanian Deadlift' },
    zh: { name: 'Romanian Deadlift' }
  },
  'military_press': {
    it: {
      name: 'Military press',
      description: 'Pressa verticale con bilanciere da posizione in piedi o seduta. Sviluppa deltoidi, trapezi superiori e tricipiti.',
      keyPoints: 'Presa poco oltre la larghezza delle spalle.\nCore braced, glutei contratti per evitare iperlordosi.\nBilanciere scende davanti al viso fino all\'altezza del mento.\nEstensione completa dei gomiti in alto senza iperestendere la schiena.'
    },
    en: {
      name: 'Military Press',
      description: 'Vertical barbell press from a standing or seated position. Develops deltoids, upper traps, and triceps.',
      keyPoints: 'Grip slightly wider than shoulder width.\nCore braced, glutes contracted to avoid hyperlordosis.\nBarbell descends in front of the face to chin height.\nFull elbow extension at the top without hyperextending the back.'
    },
    es: {
      name: 'Military Press',
      description: 'Vertical barbell press from a standing or seated position. Develops deltoids, upper traps, and triceps.',
      keyPoints: 'Grip slightly wider than shoulder width.\nCore braced, glutes contracted to avoid hyperlordosis.\nBarbell descends in front of the face to chin height.\nFull elbow extension at the top without hyperextending the back.'
    },
    fr: {
      name: 'Military Press',
      description: 'Vertical barbell press from a standing or seated position. Develops deltoids, upper traps, and triceps.',
      keyPoints: 'Grip slightly wider than shoulder width.\nCore braced, glutes contracted to avoid hyperlordosis.\nBarbell descends in front of the face to chin height.\nFull elbow extension at the top without hyperextending the back.'
    },
    zh: {
      name: 'Military Press',
      description: 'Vertical barbell press from a standing or seated position. Develops deltoids, upper traps, and triceps.',
      keyPoints: 'Grip slightly wider than shoulder width.\nCore braced, glutes contracted to avoid hyperlordosis.\nBarbell descends in front of the face to chin height.\nFull elbow extension at the top without hyperextending the back.'
    }
  },
  'lento_avanti_manubri': {
    it: { name: 'Lento avanti manubri' },
    en: { name: 'Dumbbell Shoulder Press' },
    es: { name: 'Dumbbell Shoulder Press' },
    fr: { name: 'Dumbbell Shoulder Press' },
    zh: { name: 'Dumbbell Shoulder Press' }
  },
  'trazioni_alla_sbarra': {
    it: {
      name: 'Trazioni alla sbarra',
      description: 'Esercizio a corpo libero di trazione verticale. Mento sopra la sbarra partendo da braccia completamente estese. Eccellente per latissimi, romboidi e bicipiti.',
      keyPoints: 'Partire da dead hang completo.\nScapole depresse prima di iniziare la trazione.\nGomiti verso il basso e verso l\'interno.\nEvitare oscillazioni e kipping (in allenamento di forza/ipertrofia).\nControllo dell\'eccentrica.'
    },
    en: {
      name: 'Pull-ups',
      description: 'Bodyweight vertical pulling exercise. Chin over the bar starting from fully extended arms. Excellent for lats, rhomboids, and biceps.',
      keyPoints: 'Start from a full dead hang.\nScapulae depressed before starting the pull.\nElbows down and in.\nAvoid swinging and kipping (in strength/hypertrophy training).\nEccentric control.'
    },
    es: {
      name: 'Pull-ups',
      description: 'Bodyweight vertical pulling exercise. Chin over the bar starting from fully extended arms. Excellent for lats, rhomboids, and biceps.',
      keyPoints: 'Start from a full dead hang.\nScapulae depressed before starting the pull.\nElbows down and in.\nAvoid swinging and kipping (in strength/hypertrophy training).\nEccentric control.'
    },
    fr: {
      name: 'Pull-ups',
      description: 'Bodyweight vertical pulling exercise. Chin over the bar starting from fully extended arms. Excellent for lats, rhomboids, and biceps.',
      keyPoints: 'Start from a full dead hang.\nScapulae depressed before starting the pull.\nElbows down and in.\nAvoid swinging and kipping (in strength/hypertrophy training).\nEccentric control.'
    },
    zh: {
      name: 'Pull-ups',
      description: 'Bodyweight vertical pulling exercise. Chin over the bar starting from fully extended arms. Excellent for lats, rhomboids, and biceps.',
      keyPoints: 'Start from a full dead hang.\nScapulae depressed before starting the pull.\nElbows down and in.\nAvoid swinging and kipping (in strength/hypertrophy training).\nEccentric control.'
    }
  },
  'lat_machine': {
    it: { name: 'Lat machine' },
    en: { name: 'Lat Pulldown' },
    es: { name: 'Lat Pulldown' },
    fr: { name: 'Lat Pulldown' },
    zh: { name: 'Lat Pulldown' }
  },
  'rematore_bilanciere': {
    it: { name: 'Rematore con bilanciere' },
    en: { name: 'Barbell Row' },
    es: { name: 'Barbell Row' },
    fr: { name: 'Barbell Row' },
    zh: { name: 'Barbell Row' }
  },
  'rematore_manubrio': {
    it: { name: 'Rematore con manubrio' },
    en: { name: 'Dumbbell Row' },
    es: { name: 'Dumbbell Row' },
    fr: { name: 'Dumbbell Row' },
    zh: { name: 'Dumbbell Row' }
  },
  'curl_bilanciere': {
    it: { name: 'Curl con bilanciere' },
    en: { name: 'Barbell Curl' },
    es: { name: 'Barbell Curl' },
    fr: { name: 'Barbell Curl' },
    zh: { name: 'Barbell Curl' }
  },
  'curl_manubri': {
    it: { name: 'Curl con manubri' },
    en: { name: 'Dumbbell Curl' },
    es: { name: 'Dumbbell Curl' },
    fr: { name: 'Dumbbell Curl' },
    zh: { name: 'Dumbbell Curl' }
  },
  'french_press': {
    it: { name: 'French press' },
    en: { name: 'French Press' },
    es: { name: 'French Press' },
    fr: { name: 'French Press' },
    zh: { name: 'French Press' }
  },
  'push_down_cavo': {
    it: { name: 'Push down al cavo' },
    en: { name: 'Cable Pushdown' },
    es: { name: 'Cable Pushdown' },
    fr: { name: 'Cable Pushdown' },
    zh: { name: 'Cable Pushdown' }
  },
  'leg_press': {
    it: { name: 'Leg press' },
    en: { name: 'Leg Press' },
    es: { name: 'Leg Press' },
    fr: { name: 'Leg Press' },
    zh: { name: 'Leg Press' }
  },
  'leg_curl': {
    it: { name: 'Leg curl' },
    en: { name: 'Leg Curl' },
    es: { name: 'Leg Curl' },
    fr: { name: 'Leg Curl' },
    zh: { name: 'Leg Curl' }
  },
  'leg_extension': {
    it: { name: 'Leg extension' },
    en: { name: 'Leg Extension' },
    es: { name: 'Leg Extension' },
    fr: { name: 'Leg Extension' },
    zh: { name: 'Leg Extension' }
  },
  'alzate_laterali': {
    it: { name: 'Alzate laterali' },
    en: { name: 'Lateral Raises' },
    es: { name: 'Lateral Raises' },
    fr: { name: 'Lateral Raises' },
    zh: { name: 'Lateral Raises' }
  },
  'crunch': {
    it: { name: 'Crunch' },
    en: { name: 'Crunch' },
    es: { name: 'Crunch' },
    fr: { name: 'Crunch' },
    zh: { name: 'Crunch' }
  },
  'plank': {
    it: { name: 'Plank' },
    en: { name: 'Plank' },
    es: { name: 'Plank' },
    fr: { name: 'Plank' },
    zh: { name: 'Plank' }
  },
  'calf_raise': {
    it: { name: 'Calf raise' },
    en: { name: 'Calf Raise' },
    es: { name: 'Calf Raise' },
    fr: { name: 'Calf Raise' },
    zh: { name: 'Calf Raise' }
  },
  'hip_thrust': {
    it: { name: 'Hip thrust' },
    en: { name: 'Hip Thrust' },
    es: { name: 'Hip Thrust' },
    fr: { name: 'Hip Thrust' },
    zh: { name: 'Hip Thrust' }
  },
  'pulley_basso': {
    it: { name: 'Pulley basso' },
    en: { name: 'Seated Cable Row' },
    es: { name: 'Seated Cable Row' },
    fr: { name: 'Seated Cable Row' },
    zh: { name: 'Seated Cable Row' }
  },
  'dip_parallele': {
    it: { name: 'Dip alle parallele' },
    en: { name: 'Parallel Bar Dips' },
    es: { name: 'Parallel Bar Dips' },
    fr: { name: 'Parallel Bar Dips' },
    zh: { name: 'Parallel Bar Dips' }
  },
  'facepull_cavo': {
    it: { name: 'Facepull al cavo' },
    en: { name: 'Cable Face Pull' },
    es: { name: 'Cable Face Pull' },
    fr: { name: 'Cable Face Pull' },
    zh: { name: 'Cable Face Pull' }
  },
  'bulgarian_split_squat': {
    it: { name: 'Bulgarian split squat' },
    en: { name: 'Bulgarian Split Squat' },
    es: { name: 'Bulgarian Split Squat' },
    fr: { name: 'Bulgarian Split Squat' },
    zh: { name: 'Bulgarian Split Squat' }
  },
  'pressa_spalle': {
    it: { name: 'Pressa per spalle' },
    en: { name: 'Shoulder Press Machine' },
    es: { name: 'Shoulder Press Machine' },
    fr: { name: 'Shoulder Press Machine' },
    zh: { name: 'Shoulder Press Machine' }
  },
  'stacco_sumo': {
    it: { name: 'Stacco sumo' },
    en: { name: 'Sumo Deadlift' },
    es: { name: 'Sumo Deadlift' },
    fr: { name: 'Sumo Deadlift' },
    zh: { name: 'Sumo Deadlift' }
  },
  'panca_piana_fermo': {
    it: { name: 'Panca piana con fermo' },
    en: { name: 'Paused Bench Press' },
    es: { name: 'Paused Bench Press' },
    fr: { name: 'Paused Bench Press' },
    zh: { name: 'Paused Bench Press' }
  },
  'squat_low_bar': {
    it: { name: 'Squat low bar' },
    en: { name: 'Low Bar Squat' },
    es: { name: 'Low Bar Squat' },
    fr: { name: 'Low Bar Squat' },
    zh: { name: 'Low Bar Squat' }
  },
  'muscle_up': {
    it: { name: 'Muscle-up' },
    en: { name: 'Muscle-up' },
    es: { name: 'Muscle-up' },
    fr: { name: 'Muscle-up' },
    zh: { name: 'Muscle-up' }
  },
  'front_lever': {
    it: { name: 'Front lever' },
    en: { name: 'Front Lever' },
    es: { name: 'Front Lever' },
    fr: { name: 'Front Lever' },
    zh: { name: 'Front Lever' }
  },
  'back_lever': {
    it: { name: 'Back lever' },
    en: { name: 'Back Lever' },
    es: { name: 'Back Lever' },
    fr: { name: 'Back Lever' },
    zh: { name: 'Back Lever' }
  },
  'hspu': {
    it: { name: 'Handstand push-ups' },
    en: { name: 'Handstand Push-ups' },
    es: { name: 'Handstand Push-ups' },
    fr: { name: 'Handstand Push-ups' },
    zh: { name: 'Handstand Push-ups' }
  },
  'chin_up': {
    it: { name: 'Chin-up' },
    en: { name: 'Chin-up' },
    es: { name: 'Chin-up' },
    fr: { name: 'Chin-up' },
    zh: { name: 'Chin-up' }
  },
  'hammer_curl': {
    it: { name: 'Hammer curl' },
    en: { name: 'Hammer Curl' },
    es: { name: 'Hammer Curl' },
    fr: { name: 'Hammer Curl' },
    zh: { name: 'Hammer Curl' }
  },
  'skull_crusher': {
    it: { name: 'Skull crusher' },
    en: { name: 'Skull Crusher' },
    es: { name: 'Skull Crusher' },
    fr: { name: 'Skull Crusher' },
    zh: { name: 'Skull Crusher' }
  },
  'hack_squat': {
    it: { name: 'Hack squat' },
    en: { name: 'Hack Squat' },
    es: { name: 'Hack Squat' },
    fr: { name: 'Hack Squat' },
    zh: { name: 'Hack Squat' }
  },
  'goblet_squat': {
    it: { name: 'Goblet squat' },
    en: { name: 'Goblet Squat' },
    es: { name: 'Goblet Squat' },
    fr: { name: 'Goblet Squat' },
    zh: { name: 'Goblet Squat' }
  },
  'pec_deck': {
    it: { name: 'Pec deck / Chest fly' },
    en: { name: 'Pec Deck / Chest Fly' },
    es: { name: 'Pec Deck / Chest Fly' },
    fr: { name: 'Pec Deck / Chest Fly' },
    zh: { name: 'Pec Deck / Chest Fly' }
  },
  'reverse_fly': {
    it: { name: 'Reverse fly' },
    en: { name: 'Reverse Fly' },
    es: { name: 'Reverse Fly' },
    fr: { name: 'Reverse Fly' },
    zh: { name: 'Reverse Fly' }
  },
  'rematore_inclinata_manubri': {
    it: { name: 'Rematore su inclinata manubri' },
    en: { name: 'Incline Dumbbell Row' },
    es: { name: 'Incline Dumbbell Row' },
    fr: { name: 'Incline Dumbbell Row' },
    zh: { name: 'Incline Dumbbell Row' }
  },
  'arnold_press': {
    it: { name: 'Arnold press' },
    en: { name: 'Arnold Press' },
    es: { name: 'Arnold Press' },
    fr: { name: 'Arnold Press' },
    zh: { name: 'Arnold Press' }
  },
  'zottman_curl': {
    it: { name: 'Zottman curl' },
    en: { name: 'Zottman Curl' },
    es: { name: 'Zottman Curl' },
    fr: { name: 'Zottman Curl' },
    zh: { name: 'Zottman Curl' }
  },
  'estensioni_triceps_overhead': {
    it: { name: 'Estensioni tricipiti overhead' },
    en: { name: 'Overhead Triceps Extension' },
    es: { name: 'Overhead Triceps Extension' },
    fr: { name: 'Overhead Triceps Extension' },
    zh: { name: 'Overhead Triceps Extension' }
  },
  'leg_curl_sdraiato': {
    it: { name: 'Leg curl sdraiato' },
    en: { name: 'Lying Leg Curl' },
    es: { name: 'Lying Leg Curl' },
    fr: { name: 'Lying Leg Curl' },
    zh: { name: 'Lying Leg Curl' }
  },
  'calf_raise_seduto': {
    it: { name: 'Calf raise seduto' },
    en: { name: 'Seated Calf Raise' },
    es: { name: 'Seated Calf Raise' },
    fr: { name: 'Seated Calf Raise' },
    zh: { name: 'Seated Calf Raise' }
  },
};

// Internal data for base exercise definitions (metadata only)
const baseExerciseData: Omit<Exercise, 'id' | 'name' | 'description' | 'keyPoints' | 'createdAt' | 'updatedAt' | 'variantIds'>[] = [
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest], secondaryMuscles: [Muscle.Triceps, Muscle.Shoulders], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // panca_piana
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest, Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // panca_inclinata
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest], secondaryMuscles: [Muscle.Triceps, Muscle.Shoulders], equipment: [Equipment.Dumbbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // panca_piana_manubri
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps, Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings, Muscle.Abs], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // squat
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps], secondaryMuscles: [Muscle.Glutes, Muscle.Abs], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // squat_frontale
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Hamstrings, Muscle.Glutes, Muscle.LowerBack], secondaryMuscles: [Muscle.UpperBack, Muscle.Forearms], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Hinge, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // stacco_da_terra
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Hamstrings, Muscle.Glutes], secondaryMuscles: [Muscle.LowerBack], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Hinge, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // stacco_rumeno
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Barbell], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // military_press
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // lento_avanti_manubri
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Lats, Muscle.UpperBack], secondaryMuscles: [Muscle.Biceps], equipment: [Equipment.Bodyweight, Equipment.PullUpBar], movementPattern: MovementPattern.VerticalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // trazioni_alla_sbarra
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Lats], secondaryMuscles: [Muscle.Biceps, Muscle.UpperBack], equipment: [Equipment.Cable], movementPattern: MovementPattern.VerticalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // lat_machine
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.UpperBack, Muscle.Lats], secondaryMuscles: [Muscle.Biceps, Muscle.Forearms], equipment: [Equipment.Barbell], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // rematore_bilanciere
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.UpperBack, Muscle.Lats], secondaryMuscles: [Muscle.Biceps], equipment: [Equipment.Dumbbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // rematore_manubrio
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Biceps], secondaryMuscles: [Muscle.Forearms], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // curl_bilanciere
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Biceps], secondaryMuscles: [Muscle.Forearms], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // curl_manubri
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Triceps], secondaryMuscles: [], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // french_press
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Triceps], secondaryMuscles: [], equipment: [Equipment.Cable], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // push_down_cavo
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps, Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings], equipment: [Equipment.Machine], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // leg_press
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Hamstrings], secondaryMuscles: [], equipment: [Equipment.Machine], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // leg_curl
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Quadriceps], secondaryMuscles: [], equipment: [Equipment.Machine], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // leg_extension
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Deltoids], secondaryMuscles: [Muscle.Traps], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // alzate_laterali
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Abs], secondaryMuscles: [], equipment: [Equipment.Bodyweight], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // crunch
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Abs, Muscle.LowerBack], secondaryMuscles: [Muscle.Shoulders], equipment: [Equipment.Bodyweight], movementPattern: MovementPattern.Isometric, counterType: CounterType.Seconds, defaultLoadUnit: 'kg' }, // plank
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Calves], secondaryMuscles: [], equipment: [Equipment.Machine], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // calf_raise
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.Hinge, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // hip_thrust
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.UpperBack, Muscle.Lats], secondaryMuscles: [Muscle.Biceps], equipment: [Equipment.Cable], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // pulley_basso
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest, Muscle.Triceps], secondaryMuscles: [Muscle.Shoulders], equipment: [Equipment.Bodyweight, Equipment.ParallelBars], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // dip_parallele
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Deltoids, Muscle.UpperBack], secondaryMuscles: [Muscle.Traps], equipment: [Equipment.Cable], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // facepull_cavo
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps, Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // bulgarian_split_squat
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Machine], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // pressa_spalle
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Hamstrings, Muscle.Glutes, Muscle.LowerBack], secondaryMuscles: [Muscle.UpperBack, Muscle.Forearms], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Hinge, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // stacco_sumo
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Chest], secondaryMuscles: [Muscle.Triceps, Muscle.Shoulders], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // panca_piana_fermo
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps, Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings, Muscle.Abs], equipment: [Equipment.Barbell], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // squat_low_bar
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Lats, Muscle.UpperBack, Muscle.Chest], secondaryMuscles: [Muscle.Biceps, Muscle.Triceps, Muscle.Shoulders], equipment: [Equipment.Bodyweight, Equipment.PullUpBar], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // muscle_up
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Lats, Muscle.Abs, Muscle.UpperBack], secondaryMuscles: [Muscle.Shoulders, Muscle.Forearms], equipment: [Equipment.Bodyweight, Equipment.PullUpBar], movementPattern: MovementPattern.Isometric, counterType: CounterType.Seconds, defaultLoadUnit: 'kg' }, // front_lever
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.LowerBack, Muscle.Abs, Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps, Muscle.Forearms], equipment: [Equipment.Bodyweight, Equipment.PullUpBar], movementPattern: MovementPattern.Isometric, counterType: CounterType.Seconds, defaultLoadUnit: 'kg' }, // back_lever
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Bodyweight], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // hspu
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Lats, Muscle.Biceps], secondaryMuscles: [Muscle.UpperBack, Muscle.Forearms], equipment: [Equipment.Bodyweight, Equipment.PullUpBar], movementPattern: MovementPattern.VerticalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // chin_up
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Biceps, Muscle.Forearms], secondaryMuscles: [], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // hammer_curl
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Triceps], secondaryMuscles: [], equipment: [Equipment.Barbell, Equipment.Bench], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // skull_crusher
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps, Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings], equipment: [Equipment.Machine], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // hack_squat
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Quadriceps, Muscle.Glutes], secondaryMuscles: [Muscle.Hamstrings, Muscle.Abs], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Squat, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // goblet_squat
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Chest], secondaryMuscles: [Muscle.Shoulders], equipment: [Equipment.Machine], movementPattern: MovementPattern.HorizontalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // pec_deck
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Deltoids, Muscle.UpperBack], secondaryMuscles: [Muscle.Traps], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // reverse_fly
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.UpperBack, Muscle.Lats], secondaryMuscles: [Muscle.Biceps], equipment: [Equipment.Dumbbell, Equipment.Bench], movementPattern: MovementPattern.HorizontalPull, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // rematore_inclinata_manubri
  { type: ExerciseType.Compound, primaryMuscles: [Muscle.Shoulders], secondaryMuscles: [Muscle.Triceps], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.VerticalPush, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // arnold_press
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Biceps, Muscle.Forearms], secondaryMuscles: [], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // zottman_curl
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Triceps], secondaryMuscles: [], equipment: [Equipment.Dumbbell], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // estensioni_triceps_overhead
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Hamstrings], secondaryMuscles: [], equipment: [Equipment.Machine], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // leg_curl_sdraiato
  { type: ExerciseType.Isolation, primaryMuscles: [Muscle.Calves], secondaryMuscles: [], equipment: [Equipment.Machine], movementPattern: MovementPattern.Other, counterType: CounterType.Reps, defaultLoadUnit: 'kg' }, // calf_raise_seduto
];

const DICTIONARY_KEYS = Object.keys(EXERCISE_DICTIONARY);

// ===== Case Helpers =====

export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function toSentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatName(name: string, language: 'en' | 'it' | 'es' | 'fr' | 'zh'): string {
  return language === 'en' ? toTitleCase(name) : toSentenceCase(name);
}

// ===== Exported seed functions =====

export async function seedExercises(language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
  const now = dayjs().toDate();
  const exercises: Exercise[] = DICTIONARY_KEYS.map((key, index) => {
    const translation = EXERCISE_DICTIONARY[key][language];
    const base = baseExerciseData[index];
    return {
      ...base,
      id: nanoid(),
      name: formatName(translation.name, language),
      description: translation.description || '',
      keyPoints: translation.keyPoints || '',
      variantIds: [],
      createdAt: now,
      updatedAt: now,
    };
  });
  await db.exercises.bulkAdd(exercises);
}

// Global cache for exercise IDs during seeding
const exerciseIdCache = new Map<string, string>();

// Optimized: find exercise ID by dictionary key
async function findExerciseIdByKey(key: string, language: 'en' | 'it' | 'es' | 'fr' | 'zh'): Promise<string> {
  const cacheKey = `${key}_${language}`;
  if (exerciseIdCache.has(cacheKey)) {
    return exerciseIdCache.get(cacheKey)!;
  }

  const translation = EXERCISE_DICTIONARY[key][language];
  const name = formatName(translation.name, language);

  // Use Repository findByName
  const ex = await ExerciseRepository.findByName(name);
  if (!ex) throw new Error(`Seed exercise not found: ${name} (key: ${key})`);

  exerciseIdCache.set(cacheKey, ex.id);
  return ex.id;
}

// Helper: create a standard group with one exercise and one set block
async function createStandardGroup(
  sessionId: string,
  exerciseKey: string,
  orderIndex: number,
  config: { repsMin: number; repsMax: number; rpeMin: number; rpeMax: number; restMin: number; restMax: number; sets: number },
  language: 'en' | 'it' | 'es' | 'fr' | 'zh'
): Promise<void> {
  const exerciseId = await findExerciseIdByKey(exerciseKey, language);
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

  // Use a more robust way to get exercise name if needed for history logic
  const getExerciseNameById = async (id: string) => {
    const ex = await db.exercises.get(id);
    return ex?.name.toLowerCase() || "";
  };

  const getInitialLoad = (lowerName: string) => {
    if (lowerName.includes('squat')) return 40;
    if (lowerName.includes('stacco') || lowerName.includes('deadlift')) return 60;
    if (lowerName.includes('panca') || lowerName.includes('bench')) return 40;
    if (lowerName.includes('military') || lowerName.includes('spalle') || lowerName.includes('shoulder')) return 20;
    if (lowerName.includes('curl') || lowerName.includes('french')) return 10;
    return 30; // default
  };

  const getIncrement = (lowerName: string) => {
    if (lowerName.includes('squat') || lowerName.includes('stacco') || lowerName.includes('deadlift')) return 2.5;
    if (lowerName.includes('panca') || lowerName.includes('bench')) return 2.0;
    if (lowerName.includes('military') || lowerName.includes('shoulder')) return 1.0;
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
          const name = await getExerciseNameById(item.exerciseId);
          progress.set(item.exerciseId, { baseLoad: getInitialLoad(name), microcycleInc: getIncrement(name) });
        }

        const currentStats = progress.get(item.exerciseId)!;

        // Progression applied per mesocycle
        const mesocyclesCompleted = Math.floor(absoluteSessionCount / 14);
        const accumulatedLoad = currentStats.baseLoad + (mesocyclesCompleted * currentStats.microcycleInc);
        const currentLoadRaw = isDeload ? accumulatedLoad * 0.8 : accumulatedLoad;

        // Snap load to nearest 0.5
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
  options: SeedOptions = {},
  language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'
): Promise<void> {
  const now = dayjs().toDate();
  const workoutId = nanoid();

  const workout: PlannedWorkout = {
    id: workoutId,
    name: language === 'it' ? 'Full body 2x' : 'Full Body 2x',
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
    name: language === 'it' ? 'Giorno A' : 'Day A',
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
    name: language === 'it' ? 'Giorno B' : 'Day B',
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
  const dayAKeys = ['squat', 'panca_piana', 'rematore_bilanciere', 'military_press', 'curl_bilanciere', 'crunch'];
  for (let i = 0; i < dayAKeys.length; i++) {
    await createStandardGroup(dayAId, dayAKeys[i], i, hyp, language);
  }

  // Day B exercises
  const dayBKeys = ['stacco_rumeno', 'panca_inclinata', 'lat_machine', 'alzate_laterali', 'french_press', 'leg_curl'];
  for (let i = 0; i < dayBKeys.length; i++) {
    await createStandardGroup(dayBId, dayBKeys[i], i, hyp, language);
  }

  if (options.withHistory) {
    await seedHistory(workoutId, 2);
  }
}

// ===== Push-Pull-Legs 3x =====

export async function seedPPL3x(
  status: PlannedWorkoutStatus = PlannedWorkoutStatus.Active,
  language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'
): Promise<void> {
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
    { name: language === 'it' ? 'Push (Spinta)' : 'Push', dayNumber: 1, focus: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Arms], exercises: ['panca_piana', 'military_press', 'panca_piana_manubri', 'alzate_laterali', 'french_press'] },
    { name: language === 'it' ? 'Pull (Tirata)' : 'Pull', dayNumber: 2, focus: [MuscleGroup.Back, MuscleGroup.Arms, MuscleGroup.Shoulders], exercises: ['trazioni_alla_sbarra', 'rematore_bilanciere', 'lat_machine', 'curl_bilanciere', 'facepull_cavo'] },
    { name: language === 'it' ? 'Legs (Gambe)' : 'Legs', dayNumber: 3, focus: [MuscleGroup.Legs], exercises: ['squat', 'stacco_rumeno', 'leg_press', 'leg_curl', 'calf_raise'] },
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
      await createStandardGroup(sessionId, sessions[s].exercises[i], i, hyp, language);
    }
  }
}

// ===== Upper-Lower 4x =====

export async function seedUpperLower4x(
  status: PlannedWorkoutStatus = PlannedWorkoutStatus.Active,
  language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'
): Promise<void> {
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
    { name: language === 'it' ? 'Upper forza' : 'Upper Strength', dayNumber: 1, focus: [MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Shoulders, MuscleGroup.Arms], exercises: ['panca_piana', 'rematore_bilanciere', 'military_press', 'trazioni_alla_sbarra', 'curl_bilanciere'], config: strength },
    { name: language === 'it' ? 'Lower forza' : 'Lower Strength', dayNumber: 2, focus: [MuscleGroup.Legs], exercises: ['squat', 'stacco_da_terra', 'leg_press', 'leg_curl', 'calf_raise'], config: strength },
    { name: language === 'it' ? 'Upper ipertrofia' : 'Upper Hypertrophy', dayNumber: 3, focus: [MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Shoulders, MuscleGroup.Arms], exercises: ['panca_piana_manubri', 'lat_machine', 'alzate_laterali', 'french_press', 'curl_manubri'], config: hypertrophy },
    { name: language === 'it' ? 'Lower ipertrofia' : 'Lower Hypertrophy', dayNumber: 4, focus: [MuscleGroup.Legs], exercises: ['squat_frontale', 'stacco_rumeno', 'leg_extension', 'leg_curl', 'hip_thrust'], config: hypertrophy },
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
      await createStandardGroup(sessionId, sessions[s].exercises[i], i, sessions[s].config, language);
    }
  }
}

// ===== Powerlifting 3x =====

export async function seedPowerlifting(
  status: PlannedWorkoutStatus = PlannedWorkoutStatus.Active,
  language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'
): Promise<void> {
  const now = dayjs().toDate();
  const workoutId = nanoid();

  await db.plannedWorkouts.add({
    id: workoutId,
    name: 'Powerlifting SBD',
    objectiveType: ObjectiveType.MaxStrength,
    workType: WorkType.Intensification,
    status,
    createdAt: now,
    updatedAt: now,
  });

  const strength = { repsMin: 3, repsMax: 5, rpeMin: 8, rpeMax: 9, restMin: 180, restMax: 300, sets: 3 };
  const hypertrophy = { repsMin: 8, repsMax: 12, rpeMin: 7, rpeMax: 8.5, restMin: 90, restMax: 150, sets: 3 };

  const sessions = [
    {
      name: language === 'it' ? 'Squat Focus' : 'Squat Focus',
      dayNumber: 1,
      focus: [MuscleGroup.Legs, MuscleGroup.Chest],
      exercises: [
        { key: 'squat_low_bar', config: strength },
        { key: 'panca_piana_fermo', config: hypertrophy },
        { key: 'bulgarian_split_squat', config: hypertrophy },
        { key: 'plank', config: hypertrophy },
      ]
    },
    {
      name: language === 'it' ? 'Bench Focus' : 'Bench Focus',
      dayNumber: 2,
      focus: [MuscleGroup.Chest, MuscleGroup.Back],
      exercises: [
        { key: 'panca_piana_fermo', config: strength },
        { key: 'rematore_bilanciere', config: hypertrophy },
        { key: 'military_press', config: hypertrophy },
        { key: 'facepull_cavo', config: hypertrophy },
      ]
    },
    {
      name: language === 'it' ? 'Deadlift Focus' : 'Deadlift Focus',
      dayNumber: 3,
      focus: [MuscleGroup.Legs, MuscleGroup.Back],
      exercises: [
        { key: 'stacco_sumo', config: strength },
        { key: 'panca_piana', config: hypertrophy },
        { key: 'leg_press', config: hypertrophy },
        { key: 'lat_machine', config: hypertrophy },
      ]
    },
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
      const ex = sessions[s].exercises[i];
      await createStandardGroup(sessionId, ex.key, i, ex.config, language);
    }
  }
}

// ===== Calisthenics 3x =====

export async function seedCalisthenics(
  status: PlannedWorkoutStatus = PlannedWorkoutStatus.Active,
  language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'
): Promise<void> {
  const now = dayjs().toDate();
  const workoutId = nanoid();

  await db.plannedWorkouts.add({
    id: workoutId,
    name: 'Calisthenics Foundation',
    objectiveType: ObjectiveType.WorkCapacity,
    workType: WorkType.Accumulation,
    status,
    createdAt: now,
    updatedAt: now,
  });

  const skill = { repsMin: 1, repsMax: 5, rpeMin: 7, rpeMax: 9, restMin: 120, restMax: 180, sets: 4 };
  const strength = { repsMin: 5, repsMax: 10, rpeMin: 8, rpeMax: 9, restMin: 90, restMax: 150, sets: 3 };
  const isometric = { repsMin: 15, repsMax: 30, rpeMin: 7, rpeMax: 9, restMin: 60, restMax: 90, sets: 3 }; // Using reps field for seconds in createStandardGroup (simplified)

  const sessions = [
    {
      name: language === 'it' ? 'Pull Day' : 'Pull Day',
      dayNumber: 1,
      focus: [MuscleGroup.Back, MuscleGroup.Arms],
      exercises: [
        { key: 'muscle_up', config: skill },
        { key: 'trazioni_alla_sbarra', config: strength },
        { key: 'chin_up', config: strength },
        { key: 'front_lever', config: isometric },
      ]
    },
    {
      name: language === 'it' ? 'Push Day' : 'Push Day',
      dayNumber: 2,
      focus: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Arms],
      exercises: [
        { key: 'dip_parallele', config: strength },
        { key: 'hspu', config: skill },
        { key: 'panca_piana', config: strength }, // Mixed for variety
        { key: 'back_lever', config: isometric },
      ]
    },
    {
      name: language === 'it' ? 'Statics & Core' : 'Statics & Core',
      dayNumber: 3,
      focus: [MuscleGroup.Core, MuscleGroup.Back, MuscleGroup.Legs],
      exercises: [
        { key: 'front_lever', config: isometric },
        { key: 'back_lever', config: isometric },
        { key: 'plank', config: isometric },
        { key: 'squat', config: strength },
      ]
    },
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
      const ex = sessions[s].exercises[i];
      await createStandardGroup(sessionId, ex.key, i, ex.config, language);
    }
  }
}
