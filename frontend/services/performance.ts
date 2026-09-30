/**
 * Acceso a la API de Athlete Performance. Las pantallas nunca construyen
 * rutas ni peticiones: usan estas funciones.
 */
import { apiRequest } from './apiClient';
import type {
  Athlete,
  AthleteDetail,
  AthleteInput,
  AthleteListItem,
  Brand,
  Evaluation,
  EvaluationInput,
} from '../domain/types';

export const listAthletes = () => apiRequest<AthleteListItem[]>('/athletes', { auth: true });

export const getAthleteDetail = (athleteId: string) =>
  apiRequest<AthleteDetail>(`/athletes/${athleteId}`, { auth: true });

export const createAthlete = (input: AthleteInput) =>
  apiRequest<Athlete>('/athletes', { method: 'POST', body: input, auth: true });

export const updateAthlete = (athleteId: string, input: AthleteInput) =>
  apiRequest<Athlete>(`/athletes/${athleteId}`, { method: 'PUT', body: input, auth: true });

export const deleteAthlete = (athleteId: string) =>
  apiRequest<{ message: string; deletedEvaluations: number }>(`/athletes/${athleteId}`, {
    method: 'DELETE',
    auth: true,
  });

export const createEvaluation = (athleteId: string, input: EvaluationInput) =>
  apiRequest<Evaluation>(`/athletes/${athleteId}/evaluations`, { method: 'POST', body: input, auth: true });

export const updateEvaluationNotes = (evaluationId: string, notes: string) =>
  apiRequest<Evaluation>(`/evaluations/${evaluationId}/notes`, { method: 'PUT', body: { notes }, auth: true });

export const deleteEvaluation = (evaluationId: string) =>
  apiRequest<{ message: string }>(`/evaluations/${evaluationId}`, { method: 'DELETE', auth: true });

export const getBrand = () => apiRequest<Brand>('/brand', { auth: true });

export const saveBrand = (input: Omit<Brand, 'logo'> & { logo: string | null }) =>
  apiRequest<Brand>('/brand', { method: 'PUT', body: input, auth: true });
