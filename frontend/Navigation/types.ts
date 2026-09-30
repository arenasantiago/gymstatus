/**
 * Rutas de la app y sus parámetros (navegación tipada).
 *
 * Flujo principal: Atletas → Perfil del atleta → Nueva evaluación →
 * Resultados → Evolución → Exportar PDF.
 */
import type { StackScreenProps } from '@react-navigation/stack';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Athletes: undefined;
  AthleteForm: { athleteId?: string } | undefined;
  AthleteProfile: { athleteId: string };
  NewEvaluation: { athleteId: string };
  EvaluationResults: { athleteId: string; evaluationId: string; justCreated?: boolean };
  Progress: { athleteId: string };
  BrandSettings: undefined;
  Methodology: undefined;
};

export type ScreenProps<Name extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, Name>;
