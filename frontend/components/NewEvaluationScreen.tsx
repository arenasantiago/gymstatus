/**
 * Nueva evaluación: el paso más frecuente del entrenador, pensado para
 * hacerse en pocos minutos junto al atleta.
 *
 *  - Fecha de hoy, objetivo y actividad precargados del perfil.
 *  - Altura copiada de la evaluación anterior (se puede corregir).
 *  - Valor anterior visible bajo cada campo como referencia.
 *  - Vista previa en vivo: qué se calculará y qué medición falta para cada
 *    indicador, antes de guardar.
 *
 * Guardar crea SIEMPRE una evaluación nueva; nunca sobrescribe las anteriores.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  Card,
  ChipGroup,
  Collapsible,
  ErrorState,
  Field,
  Loading,
  Notice,
  Screen,
  SectionTitle,
  Small,
} from './ui';
import { Avatar } from './metrics';
import { createEvaluation, getAthleteDetail } from '../services/performance';
import { ApiError, errorMessage } from '../services/apiClient';
import { notify } from '../services/dialogs';
import {
  activityOptions,
  athleteAge,
  dashboardFor,
  displayMeasurement,
  fieldHint,
  fieldLabel,
  fieldsOfGroup,
  fieldUnit,
  goalOptions,
  initialMeasurementForm,
  measurementGroups,
  missingText,
  previewResults,
  RESULT_DISPLAY,
  type MeasurementForm,
} from '../domain/view';
import { validateEvaluation, hasErrors, TEXT_LIMITS } from '../../shared/validation';
import { formatDisplayDate, maskDateInput, parseDisplayDate, todayIsoLocal, toIsoDate } from '../../shared/dates';
import { formatNumber } from '../../shared/format';
import { MINOR_WARNING, SPECIAL_CONDITIONS_WARNING } from '../../shared/content';
import { UNIT_SYSTEM } from '../config/app';
import { colors, fonts, fontSize, spacing, toneColor } from '../theme';
import type {
  ActivityKey,
  Athlete,
  Evaluation,
  GoalKey,
  MeasurementKey,
  ResultKey,
} from '../domain/types';
import type { ScreenProps } from '../Navigation/types';

const PREVIEW_KEYS: ResultKey[] = ['bmi', 'whtr', 'whr', 'bodyFat', 'bmr', 'protein', 'water'];

const NewEvaluationScreen = ({ navigation, route }: ScreenProps<'NewEvaluation'>) => {
  const { athleteId } = route.params;

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [previous, setPrevious] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [date, setDate] = useState(formatDisplayDate(todayIsoLocal()));
  const [goal, setGoal] = useState<GoalKey>('maintenance');
  const [activity, setActivity] = useState<ActivityKey>('moderate');
  const [form, setForm] = useState<MeasurementForm>(initialMeasurementForm(null));
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Nueva evaluación' });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await getAthleteDetail(athleteId);
      const last = dashboardFor(detail.evaluations).current;
      setAthlete(detail.athlete);
      setPrevious(last);
      setGoal(detail.athlete.goal);
      setActivity(detail.athlete.activityLevel);
      setForm(initialMeasurementForm(last));
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load]);

  const dateIso = parseDisplayDate(date);

  const preview = useMemo(
    () => (athlete ? previewResults(athlete, dateIso, goal, activity, form) : null),
    [athlete, dateIso, goal, activity, form],
  );

  const setField = (key: MeasurementKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value.replace(/[^0-9.,]/g, '') }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const save = async () => {
    if (!athlete) return;
    const payload = {
      date: dateIso || date,
      goal,
      activityLevel: activity,
      measurements: form,
      notes,
      unitSystem: UNIT_SYSTEM,
    };
    const check = validateEvaluation(payload, {
      birthDate: toIsoDate(athlete.birthDate) || undefined,
      unitSystem: UNIT_SYSTEM,
    });
    if (hasErrors(check.errors)) {
      setErrors(check.errors);
      notify('Revisa las mediciones', Object.values(check.errors).filter(Boolean).join('\n'));
      return;
    }
    setSaving(true);
    try {
      const created = await createEvaluation(athlete._id, payload);
      navigation.replace('EvaluationResults', {
        athleteId: athlete._id,
        evaluationId: created._id,
        justCreated: true,
      });
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      notify('No se pudo guardar la evaluación', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Preparando evaluación…" />;
  if (loadError || !athlete) return <ErrorState message={loadError || 'Atleta no encontrado.'} onRetry={load} />;

  const age = athleteAge(athlete, dateIso || todayIsoLocal());
  const trackingHasPrevious =
    !!previous && fieldsOfGroup('tracking').some((key) => typeof previous.measurements[key] === 'number');

  const renderField = (key: MeasurementKey, required: boolean) => {
    const prev = previous ? displayMeasurement(key, previous.measurements[key]) : '';
    return (
      <Field
        key={key}
        label={fieldLabel(key)}
        required={required}
        unit={fieldUnit(key)}
        placeholder={prev ? `Anterior: ${prev}` : '0.0'}
        keyboardType="decimal-pad"
        value={form[key]}
        onChangeText={(v) => setField(key, v)}
        error={errors[key]}
        hint={prev ? `Anterior (${formatDisplayDate(previous!.date)}): ${prev} ${fieldUnit(key)}. ${fieldHint(key)}` : fieldHint(key)}
        maxLength={6}
        style={styles.measureField}
      />
    );
  };

  return (
    <Screen
      footer={<Button title="Calcular y guardar" icon="checkmark-circle-outline" onPress={save} loading={saving} />}
    >
      <Card style={styles.athleteRow}>
        <Avatar name={athlete.name} photo={athlete.photo} size={44} />
        <View style={styles.flex1}>
          <Text style={styles.athleteName}>{athlete.name}</Text>
          <Text style={styles.athleteMeta}>
            {previous ? `Evaluación anterior: ${formatDisplayDate(previous.date)}` : 'Primera evaluación'}
            {age !== null ? ` · ${age} años` : ''}
          </Text>
        </View>
      </Card>

      {athlete.specialConditions ? <Notice tone="warning">{SPECIAL_CONDITIONS_WARNING}</Notice> : null}
      {age !== null && age < 18 ? <Notice tone="warning">{MINOR_WARNING}</Notice> : null}

      <Card>
        <Field
          label="Fecha de evaluación"
          required
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          value={date}
          onChangeText={(v) => {
            setDate(maskDateInput(v));
            if (errors.date) setErrors((e) => ({ ...e, date: '' }));
          }}
          error={errors.date}
          maxLength={10}
        />
        <ChipGroup
          label="Objetivo actual"
          options={goalOptions}
          value={goal}
          onChange={(v) => v && setGoal(v)}
          error={errors.goal}
        />
        <ChipGroup
          label="Nivel de actividad"
          options={activityOptions}
          value={activity}
          onChange={(v) => v && setActivity(v)}
          error={errors.activityLevel}
        />
      </Card>

      {measurementGroups.map((group) => {
        const keys = fieldsOfGroup(group.key);
        const fields = (
          <View style={styles.measureGrid}>{keys.map((key) => renderField(key, group.key === 'required'))}</View>
        );
        if (group.key === 'tracking') {
          return (
            <View key={group.key} style={styles.group}>
              <Collapsible title={group.title} icon="add-circle-outline" initiallyOpen={trackingHasPrevious}>
                <Small style={styles.groupDescription}>{group.description}</Small>
                {fields}
              </Collapsible>
            </View>
          );
        }
        return (
          <View key={group.key} style={styles.group}>
            <SectionTitle>{group.title}</SectionTitle>
            <Card>
              <Small style={styles.groupDescription}>{group.description}</Small>
              {fields}
            </Card>
          </View>
        );
      })}

      {preview ? (
        <>
          <SectionTitle>Vista previa</SectionTitle>
          <Card>
            {PREVIEW_KEYS.map((key) => {
              const entry = preview[key];
              const display = RESULT_DISPLAY[key];
              const ok = entry && entry.status === 'ok' && typeof entry.value === 'number';
              const value =
                key === 'water' && ok
                  ? `${formatNumber((entry.value as number) / 1000, 2)} L/día`
                  : ok
                    ? `${formatNumber(entry.value as number, display.decimals)}${display.unit ? ` ${display.unit}` : ''}`
                    : null;
              return (
                <View key={key} style={styles.previewRow}>
                  <Ionicons
                    name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={ok ? colors.success : colors.textMuted}
                  />
                  <Text style={styles.previewLabel}>{display.label}</Text>
                  {ok ? (
                    <Text
                      style={[
                        styles.previewValue,
                        entry.interpretation ? { color: toneColor(entry.interpretation.tone) } : null,
                      ]}
                    >
                      {value}
                    </Text>
                  ) : (
                    <Text style={styles.previewMissing} numberOfLines={2}>
                      {missingText(entry)}
                    </Text>
                  )}
                </View>
              );
            })}
            <Small style={styles.previewNote}>Los resultados definitivos se calculan y guardan al pulsar «Calcular y guardar».</Small>
          </Card>
        </>
      ) : null}

      <SectionTitle>Observaciones del entrenador</SectionTitle>
      <Card>
        <Field
          placeholder="Contexto de la medición, sensaciones, indicaciones para el atleta…"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={TEXT_LIMITS.notes}
          style={styles.notes}
          hint="Aparecen en la ficha PDF. Se pueden editar después."
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  athleteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  athleteName: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: fontSize.md },
  athleteMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.xs, marginTop: 2 },
  group: { marginBottom: spacing.xs },
  groupDescription: { marginBottom: spacing.md },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  measureField: { width: '48%' },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewLabel: { flex: 1, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: fontSize.sm },
  previewValue: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: fontSize.sm },
  previewMissing: { maxWidth: '50%', color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.xs, textAlign: 'right' },
  previewNote: { marginTop: spacing.md, color: colors.textMuted, fontSize: fontSize.xs },
  notes: { marginBottom: 0 },
});

export default NewEvaluationScreen;
