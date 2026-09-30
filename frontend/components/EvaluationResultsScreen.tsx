/**
 * Resultados de una evaluación: composición corporal (protagonista), energía
 * y requerimientos estimados, comparación con la evaluación anterior y
 * exportación de la ficha en PDF.
 */
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Bullet,
  Button,
  Card,
  Collapsible,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Loading,
  Notice,
  Screen,
  SectionTitle,
  Small,
} from './ui';
import { MacroBreakdown } from './metrics';
import { ResultCard } from './results';
import { ComparisonTable } from './ComparisonTable';
import { deleteEvaluation, getAthleteDetail, getBrand, updateEvaluationNotes } from '../services/performance';
import { errorMessage } from '../services/apiClient';
import { confirmAction, notify } from '../services/dialogs';
import { useFocusLoader } from '../hooks/useFocusLoader';
import { brandIsEmpty, useReportExport } from '../hooks/useReportExport';
import { activityLabel, dashboardFor, goalLabel, macroSplitOf, result } from '../domain/view';
import { formatDisplayDate, formatLongDate } from '../../shared/dates';
import { formatNumber } from '../../shared/format';
import {
  BMI_NOTE,
  BODY_FAT_METHOD,
  BMR_METHOD,
  GENERAL_DISCLAIMER,
  MACROS_NOTE,
  MINOR_WARNING,
  PROTEIN_NOTE,
  SPECIAL_CONDITIONS_WARNING,
  WATER_NOTE,
  WHR_NOTE,
  WHTR_NOTE,
} from '../../shared/content';
import { TEXT_LIMITS } from '../../shared/validation';
import { colors, fonts, fontSize, spacing } from '../theme';
import type { ScreenProps } from '../Navigation/types';

const EvaluationResultsScreen = ({ navigation, route }: ScreenProps<'EvaluationResults'>) => {
  const { athleteId, evaluationId, justCreated } = route.params;
  const loader = useCallback(
    () => Promise.all([getAthleteDetail(athleteId), getBrand().catch(() => null)]),
    [athleteId],
  );
  const { data, error, loading, refreshing, reload } = useFocusLoader(loader);
  const { exporting, exportReport } = useReportExport();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const detail = data ? data[0] : null;
  const brand = data ? data[1] : null;
  const athlete = detail ? detail.athlete : null;
  const evaluations = detail ? detail.evaluations : [];
  const dash = useMemo(() => dashboardFor(evaluations, evaluationId), [evaluations, evaluationId]);
  const evaluation = dash.current && dash.current._id === evaluationId ? dash.current : null;

  const removeEvaluation = useCallback(async () => {
    if (!evaluation) return;
    const ok = await confirmAction(
      'Eliminar evaluación',
      `Se eliminará la evaluación del ${formatDisplayDate(evaluation.date)}. Las demás evaluaciones no se modifican.`,
      'Eliminar',
      true,
    );
    if (!ok) return;
    try {
      await deleteEvaluation(evaluation._id);
      navigation.goBack();
    } catch (e) {
      notify('No se pudo eliminar', errorMessage(e));
    }
  }, [evaluation, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Resultados',
      headerRight: () =>
        evaluation ? (
          <IconButton icon="trash-outline" label="Eliminar evaluación" onPress={removeEvaluation} />
        ) : null,
    });
  }, [navigation, evaluation, removeEvaluation]);

  const saveNotes = async () => {
    if (!evaluation) return;
    setSavingNotes(true);
    try {
      await updateEvaluationNotes(evaluation._id, notesDraft);
      setEditingNotes(false);
      reload();
    } catch (e) {
      notify('No se pudieron guardar las observaciones', errorMessage(e));
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading && !data) return <Loading message="Cargando resultados…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!athlete) return null;
  if (!evaluation) {
    return (
      <Screen>
        <EmptyState icon="document-outline" title="Evaluación no encontrada" message="Puede que se haya eliminado." />
      </Screen>
    );
  }

  const { previous } = dash;
  const water = result(evaluation, 'water');
  const split = macroSplitOf(evaluation);
  const carbReference = (() => {
    const macros = result(evaluation, 'macros');
    const ref = macros && macros.inputs ? (macros.inputs as Record<string, unknown>).carbReference : null;
    return typeof ref === 'string' ? ref : null;
  })();
  const waterOk = !!water && water.status === 'ok' && typeof water.value === 'number';
  const hasSpecialConditions = evaluation.profileSnapshot.specialConditions === true || athlete.specialConditions;
  const ageAtEvaluation = evaluation.profileSnapshot.ageYears;

  const doExport = () => exportReport({ brand, athlete, evaluation, evaluations });

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={reload}
      footer={
        <View style={styles.footerRow}>
          <Button
            title="Evolución"
            variant="secondary"
            icon="trending-down-outline"
            onPress={() => navigation.navigate('Progress', { athleteId })}
            style={styles.footerButton}
          />
          <Button
            title="Exportar PDF"
            icon="share-outline"
            loading={exporting}
            onPress={doExport}
            style={styles.footerButton}
          />
        </View>
      }
    >
      {justCreated ? (
        <Notice tone="success">Evaluación guardada. Las evaluaciones anteriores se conservan sin cambios.</Notice>
      ) : null}

      <Card>
        <Text style={styles.athleteName}>{athlete.name}</Text>
        <Text style={styles.meta}>{`Evaluación del ${formatLongDate(evaluation.date)}`}</Text>
        <Text style={styles.meta}>
          {`Objetivo: ${goalLabel(evaluation.profileSnapshot.goal)} · Actividad ${activityLabel(
            evaluation.profileSnapshot.activityLevel,
          ).toLowerCase()}`}
          {typeof ageAtEvaluation === 'number' ? ` · ${ageAtEvaluation} años` : ''}
        </Text>
      </Card>

      {hasSpecialConditions ? <Notice tone="warning">{SPECIAL_CONDITIONS_WARNING}</Notice> : null}
      {typeof ageAtEvaluation === 'number' && ageAtEvaluation < 18 ? (
        <Notice tone="warning">{MINOR_WARNING}</Notice>
      ) : null}

      <SectionTitle>Composición corporal</SectionTitle>
      <ResultCard resultKey="whtr" entry={result(evaluation, 'whtr')} icon="resize-outline" highlight note={WHTR_NOTE} />
      <ResultCard resultKey="bodyFat" entry={result(evaluation, 'bodyFat')} icon="body-outline" />
      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <ResultCard resultKey="fatMass" entry={result(evaluation, 'fatMass')} />
        </View>
        <View style={styles.pairItem}>
          <ResultCard resultKey="leanMass" entry={result(evaluation, 'leanMass')} />
        </View>
      </View>
      <Collapsible title={BODY_FAT_METHOD.title}>
        <Text style={styles.text}>{BODY_FAT_METHOD.method}</Text>
        <Text style={styles.subhead}>Variables</Text>
        {BODY_FAT_METHOD.variables.map((v) => (
          <Bullet key={v}>{v}</Bullet>
        ))}
        <Text style={styles.subhead}>Limitaciones</Text>
        {BODY_FAT_METHOD.limitations.map((v) => (
          <Bullet key={v}>{v}</Bullet>
        ))}
      </Collapsible>
      <ResultCard resultKey="whr" entry={result(evaluation, 'whr')} icon="swap-horizontal-outline" note={WHR_NOTE} />
      <ResultCard resultKey="bmi" entry={result(evaluation, 'bmi')} icon="analytics-outline" note={BMI_NOTE} />

      <SectionTitle>Energía</SectionTitle>
      <ResultCard resultKey="bmr" entry={result(evaluation, 'bmr')} icon="flame-outline" note={BMR_METHOD.text} />
      <ResultCard resultKey="tdee" entry={result(evaluation, 'tdee')} icon="walk-outline" note={BMR_METHOD.tdee} />
      <ResultCard resultKey="energyTarget" entry={result(evaluation, 'energyTarget')} icon="speedometer-outline" />

      <SectionTitle>Requerimientos diarios estimados</SectionTitle>
      <ResultCard resultKey="protein" entry={result(evaluation, 'protein')} icon="nutrition-outline" note={PROTEIN_NOTE} />
      <ResultCard
        resultKey="water"
        entry={water}
        icon="water-outline"
        valueOverride={waterOk ? `${formatNumber((water!.value as number) / 1000, 2)} L/día` : undefined}
        note={WATER_NOTE.base}
        extra={
          waterOk ? (
            <View>
              <Text style={styles.waterMl}>{`${formatNumber(water!.value as number, 0)} ml/día`}</Text>
              <Text style={styles.subhead}>Ajustes (se suman aparte, no incluidos)</Text>
              {WATER_NOTE.adjustments.map((v) => (
                <Bullet key={v}>{v}</Bullet>
              ))}
            </View>
          ) : null
        }
      />
      <ResultCard
        resultKey="macros"
        entry={result(evaluation, 'macros')}
        icon="pie-chart-outline"
        note={MACROS_NOTE}
        extra={
          split ? (
            <View>
              <MacroBreakdown split={split} />
              {carbReference ? <Small style={styles.carbRef}>{carbReference}</Small> : null}
            </View>
          ) : null
        }
      />

      <SectionTitle>Comparación con la evaluación anterior</SectionTitle>
      <Card>
        {previous ? (
          <>
            <Small style={styles.compareHead}>
              {`${formatDisplayDate(previous.date)} → ${formatDisplayDate(evaluation.date)}`}
            </Small>
            <ComparisonTable rows={dash.comparison} />
          </>
        ) : (
          <Small>Es la primera evaluación: a partir de la siguiente verás aquí los cambios.</Small>
        )}
      </Card>

      <SectionTitle
        action={
          !editingNotes ? (
            <Pressable
              onPress={() => {
                setNotesDraft(evaluation.notes || '');
                setEditingNotes(true);
              }}
              hitSlop={6}
            >
              <Text style={styles.link}>{evaluation.notes ? 'Editar' : 'Añadir'}</Text>
            </Pressable>
          ) : null
        }
      >
        Observaciones del entrenador
      </SectionTitle>
      <Card>
        {editingNotes ? (
          <>
            <Field
              value={notesDraft}
              onChangeText={setNotesDraft}
              multiline
              maxLength={TEXT_LIMITS.notes}
              placeholder="Indicaciones para el atleta…"
              autoFocus
            />
            <View style={styles.footerRow}>
              <Button title="Cancelar" variant="ghost" onPress={() => setEditingNotes(false)} style={styles.footerButton} />
              <Button title="Guardar" onPress={saveNotes} loading={savingNotes} style={styles.footerButton} />
            </View>
          </>
        ) : (
          <Text style={styles.text}>{evaluation.notes || 'Sin observaciones.'}</Text>
        )}
      </Card>

      {brandIsEmpty(brand) ? (
        <Pressable onPress={() => navigation.navigate('BrandSettings')}>
          <Notice tone="info">Configura tu logo y nombre comercial para personalizar la ficha PDF. Toca aquí.</Notice>
        </Pressable>
      ) : null}

      <Small style={styles.disclaimer}>{GENERAL_DISCLAIMER}</Small>
      <Pressable onPress={() => navigation.navigate('Methodology')} hitSlop={6}>
        <Text style={[styles.link, styles.methodLink]}>Ver metodología y fuentes</Text>
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  athleteName: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: fontSize.lg },
  meta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.sm, marginTop: 2 },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1 },
  text: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 20 },
  subhead: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  waterMl: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: fontSize.sm },
  carbRef: { marginTop: spacing.sm },
  compareHead: { marginBottom: spacing.sm },
  link: { color: colors.primary, fontFamily: fonts.semibold, fontSize: fontSize.sm },
  methodLink: { textAlign: 'center', marginBottom: spacing.lg },
  disclaimer: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.md },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  footerButton: { flex: 1 },
});

export default EvaluationResultsScreen;
