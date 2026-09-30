/**
 * Tipos del dominio en el cliente. Reflejan las respuestas del backend
 * (backend/models/*) y reutilizan los tipos del motor compartido (/shared)
 * para no duplicar definiciones.
 */
import type {
  ActivityKey,
  GoalKey,
  LevelKey,
  MeasurementKey,
  Sex,
  SomatotypeKey,
} from '../../shared/config';
import type { ResultEntry } from '../../shared/evaluation';

export type { ActivityKey, GoalKey, LevelKey, MeasurementKey, Sex, SomatotypeKey, ResultEntry };

export type Measurements = Partial<Record<MeasurementKey, number>>;

export type ResultKey =
  | 'bmi'
  | 'whtr'
  | 'whr'
  | 'bodyFat'
  | 'fatMass'
  | 'leanMass'
  | 'bmr'
  | 'tdee'
  | 'energyTarget'
  | 'protein'
  | 'water'
  | 'macros';

export interface Athlete {
  _id: string;
  coachId: string;
  name: string;
  sex: Sex;
  birthDate: string;
  sport: string;
  level: LevelKey;
  goal: GoalKey;
  activityLevel: ActivityKey;
  somatotype: SomatotypeKey | null;
  specialConditions: boolean;
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AthleteListItem extends Omit<Athlete, 'photo'> {
  hasPhoto: boolean;
  evaluationCount: number;
  lastEvaluation: {
    _id: string;
    date: string;
    weightKg: number | null;
    waistCm: number | null;
    bodyFatPct: number | null;
  } | null;
}

export interface ProfileSnapshot {
  name: string;
  sex: Sex;
  ageYears?: number;
  goal: GoalKey;
  activityLevel: ActivityKey;
  sport?: string;
  level?: LevelKey;
  /** Condición especial declarada al evaluar (ausente en evaluaciones antiguas). */
  specialConditions?: boolean;
}

export interface Evaluation {
  _id: string;
  athleteId: string;
  coachId: string;
  date: string;
  measurements: Measurements;
  inputUnitSystem: 'metric' | 'imperial';
  profileSnapshot: ProfileSnapshot;
  results: Partial<Record<ResultKey, ResultEntry>>;
  parameters: Record<string, unknown>;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AthleteDetail {
  athlete: Athlete;
  evaluations: Evaluation[];
}

export interface Brand {
  businessName: string;
  coachName: string;
  phone: string;
  email: string;
  contactExtra: string;
  primaryColor: string;
  logo: string | null;
}

export interface AthleteInput {
  name: string;
  sex: Sex | '';
  birthDate: string;
  sport: string;
  level: LevelKey;
  goal: GoalKey | '';
  activityLevel: ActivityKey | '';
  somatotype: SomatotypeKey | null;
  specialConditions: boolean;
  photo?: string | null;
}

export interface EvaluationInput {
  date: string;
  goal?: GoalKey;
  activityLevel?: ActivityKey;
  measurements: Partial<Record<MeasurementKey, string>>;
  notes?: string;
}

/** Reparto de macronutrientes guardado en results.macros.inputs.split. */
export interface MacroPart {
  grams: number;
  kcal: number;
  pct: number;
  gPerKg: number;
}

export interface MacroSplit {
  protein: MacroPart;
  fat: MacroPart;
  carbs: MacroPart;
  totalKcal: number;
  viable: boolean;
}
