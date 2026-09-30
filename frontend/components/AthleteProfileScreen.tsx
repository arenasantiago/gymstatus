/**
 * Dashboard del atleta: estado actual, cambio desde la evaluación anterior,
 * gráfico de evolución, historial y exportación de la ficha.
 */
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  ChipGroup,
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  Notice,
  Screen,
  SectionTitle,
  Small,
} from './ui';
import { Avatar, DeltaText, MetricGrid, MetricTile } from './metrics';
import { LineChart } from './LineChart';
import { deleteAthlete, getAthleteDetail, getBrand } from '../services/performance';
import { confirmAction, notify } from '../services/dialogs';
import { errorMessage } from '../services/apiClient';
import { useFocusLoader } from '../hooks/useFocusLoader';
import { brandIsEmpty, useReportExport } from '../hooks/useReportExport';
import {
  activityLabel,
  athleteAge,
  athleteSummary,
  dashboardFor,
  goalLabel,
  missingText,
  result,
  resultValue,
  seriesFor,
  trendFor,
} from '../domain/view';
import { formatDisplayDate, formatLongDate, formatShortDate } from '../../shared/dates';
import { formatNumber, formatSigned } from '../../shared/format';
import { METRICS, type MetricKey } from '../../shared/config';
import { MINOR_WARNING, SPECIAL_CONDITIONS_WARNING } from '../../shared/content';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import type { ScreenProps } from '../Navigation/types';

const DASHBOARD_CHART_METRICS: { value: MetricKey; label: string }[] = [
  { value: 'weightKg', label: 'Peso' },
  { value: 'waistCm', label: 'Cintura' },
  { value: 'bodyFatPct', label: '% grasa' },
];

const AthleteProfileScreen = ({ navigation, route }: ScreenProps<'AthleteProfile'>) => {
  const { athleteId } = route.params;
  const loader = useCallback(
    () => Promise.all([getAthleteDetail(athleteId), getBrand().catch(() => null)]),
    [athleteId],
  );
  const { data, error, loading, refreshing, reload } = useFocusLoader(loader);
  const [chartMetric, setChartMetric] = useState<MetricKey>('waistCm');
  const { exporting, exportReport } = useReportExport();

  const detail = data ? data[0] : null;
  const brand = data ? data[1] : null;
  const athlete = detail ? detail.athlete : null;
  const evaluations = detail ? detail.evaluations : [];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: athlete ? athlete.name : 'Atleta',
      headerRight: () =>
        athlete ? (
          <IconButton
            icon="create-outline"
            label="Editar perfil"
            onPress={() => navigation.navigate('AthleteForm', { athleteId })}
          />
        ) : null,
    });
  }, [navigation, athlete, athleteId]);

  const dash = useMemo(() => dashboardFor(evaluations), [evaluations]);
  const series = useMemo(() => seriesFor(evaluations, chartMetric), [evaluations, chartMetric]);
  const trend = useMemo(
    () => trendFor(evaluations, chartMetric, athlete ? athlete.goal : undefined),
    [evaluations, chartMetric, athlete],
  );

  const remove = async () => {
    if (!athlete) return;
    const ok = await confirmAction(
      'Eliminar atleta',
      `Se eliminará el perfil de ${athlete.name} y sus ${evaluations.length} evaluaciones. Esta acción no se puede deshacer.`,
      'Eliminar',
      true,
    );
    if (!ok) return;
    try {
      await deleteAthlete(athlete._id);
      navigation.goBack();
    } catch (e) {
      notify('No se pudo eliminar', errorMessage(e));
    }
  };

  if (loading && !data) return <Loading message="Cargando atleta…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!athlete) return null;

  const { current, previous, byMetric } = dash;
  const hasPrevious = !!previous;
  const age = athleteAge(athlete);
  const protein = result(current, 'protein');
  const water = result(current, 'water');
  const whtr = result(current, 'whtr');
  const bmi = result(current, 'bmi');
  const bodyFat = result(current, 'bodyFat');
  const metricCfg = METRICS[chartMetric];

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={reload}
      footer={
        <Button
          title={current ? 'Nueva evaluación' : 'Registrar primera evaluación'}
          icon="add"
          onPress={() => navigation.navigate('NewEvaluation', { athleteId })}
        />
      }
    >
      <Card style={styles.header}>
        <Avatar name={athlete.name} photo={athlete.photo} size={64} />
        <View style={styles.headerBody}>
          <Text style={styles.name}>{athlete.name}</Text>
          <Text style={styles.summary}>{athleteSummary(athlete)}</Text>
          <View style={styles.headerTags}>
            <Badge label={goalLabel(athlete.goal)} tone="neutral" />
            <Badge label={`Actividad ${activityLabel(athlete.activityLevel).toLowerCase()}`} tone="neutral" />
          </View>
        </View>
      </Card>

      {athlete.specialConditions ? <Notice tone="warning">{SPECIAL_CONDITIONS_WARNING}</Notice> : null}
      {age !== null && age < 18 ? <Notice tone="warning">{MINOR_WARNING}</Notice> : null}

      {!current ? (
        <EmptyState
          icon="clipboard-outline"
          title="Sin evaluaciones todavía"
          message="Registra la primera evaluación para calcular sus indicadores. Cada evaluación queda guardada para comparar su evolución."
        />
      ) : (
        <>
          <SectionTitle>
            {`Evaluación del ${formatLongDate(current.date)}`}
          </SectionTitle>
          <Small style={styles.vs}>
            {previous
              ? `Cambios respecto al ${formatDisplayDate(previous.date)} · ${evaluations.length} evaluaciones`
              : 'Primera evaluación registrada'}
          </Small>

          <MetricGrid>
            <MetricTile
              label="Índice cintura/altura"
              icon="resize-outline"
              value={resultValue(current, 'whtr')}
              decimals={2}
              highlight
              wide
              badge={whtr && whtr.interpretation ? { label: whtr.interpretation.label, tone: whtr.interpretation.tone } : null}
              delta={byMetric.whtr ?? null}
              hasPrevious={hasPrevious}
              missing={missingText(whtr)}
              caption="Complementa al IMC en atletas musculosos: refleja la grasa abdominal. Referencia general: cintura menor que la mitad de la altura."
            />
            <MetricTile
              label="Peso"
              icon="scale-outline"
              value={current.measurements.weightKg}
              unit="kg"
              delta={byMetric.weightKg ?? null}
              hasPrevious={hasPrevious}
            />
            <MetricTile
              label="% grasa estimado"
              icon="body-outline"
              value={resultValue(current, 'bodyFat')}
              unit="%"
              delta={byMetric.bodyFatPct ?? null}
              hasPrevious={hasPrevious}
              missing={missingText(bodyFat)}
            />
            <MetricTile
              label="Cintura"
              icon="ellipse-outline"
              value={current.measurements.waistCm}
              unit="cm"
              delta={byMetric.waistCm ?? null}
              hasPrevious={hasPrevious}
              missing="No medida"
            />
            <MetricTile
              label="IMC"
              icon="analytics-outline"
              value={resultValue(current, 'bmi')}
              unit="kg/m²"
              delta={byMetric.bmi ?? null}
              hasPrevious={hasPrevious}
              caption={bmi && bmi.interpretation ? `${bmi.interpretation.label}. Dato complementario.` : 'Dato complementario.'}
            />
            <MetricTile
              label="Proteína diaria"
              icon="nutrition-outline"
              value={resultValue(current, 'protein')}
              unit="g/día"
              decimals={0}
              missing={missingText(protein)}
              caption={protein && protein.formula ? protein.formula.substituted : undefined}
            />
            <MetricTile
              label="Agua diaria (base)"
              icon="water-outline"
              value={water && water.status === 'ok' && water.value !== null ? water.value / 1000 : null}
              unit="L/día"
              decimals={2}
              missing={missingText(water)}
              caption={
                water && water.status === 'ok' && water.value !== null
                  ? `${formatNumber(water.value, 0)} ml/día · sin ajuste por entrenamiento`
                  : undefined
              }
            />
          </MetricGrid>

          <SectionTitle
            action={
              <Pressable onPress={() => navigation.navigate('Progress', { athleteId })} hitSlop={6}>
                <Text style={styles.link}>Ver evolución</Text>
              </Pressable>
            }
          >
            Evolución
          </SectionTitle>
          <Card>
            <ChipGroup
              options={DASHBOARD_CHART_METRICS}
              value={chartMetric}
              onChange={(v) => v && setChartMetric(v)}
            />
            <LineChart
              series={series}
              height={190}
              emptyMessage={`Aún no hay registros de ${metricCfg.label.toLowerCase()}.`}
            />
            {trend ? (
              <View style={styles.trend}>
                <Text style={styles.trendLabel}>
                  {`${metricCfg.shortLabel} desde el ${formatShortDate(trend.fromDate)}`}
                  {trend.weeks >= 1 ? ` (${formatNumber(trend.weeks, trend.weeks < 10 ? 1 : 0)} semanas)` : ''}
                </Text>
                <DeltaText row={trend} hasPrevious />
              </View>
            ) : (
              <Small style={styles.trendHint}>Con dos o más evaluaciones verás aquí la tendencia.</Small>
            )}
          </Card>

          <Button
            title="Ver resultados completos"
            variant="secondary"
            icon="document-text-outline"
            onPress={() =>
              navigation.navigate('EvaluationResults', { athleteId, evaluationId: current._id })
            }
          />
          <Button
            title="Exportar ficha PDF"
            variant="secondary"
            icon="share-outline"
            loading={exporting}
            onPress={() => exportReport({ brand, athlete, evaluation: current, evaluations })}
          />
          {brandIsEmpty(brand) ? (
            <Pressable onPress={() => navigation.navigate('BrandSettings')}>
              <Small style={styles.brandHint}>
                Tu ficha saldrá sin logo ni nombre comercial. Toca aquí para configurar tu marca.
              </Small>
            </Pressable>
          ) : null}

          <SectionTitle>{`Historial (${evaluations.length})`}</SectionTitle>
          {[...dash.sorted].reverse().map((ev, i, list) => {
            const prev = list[i + 1];
            const waistDelta =
              prev && typeof ev.measurements.waistCm === 'number' && typeof prev.measurements.waistCm === 'number'
                ? ev.measurements.waistCm - prev.measurements.waistCm
                : null;
            const bf = resultValue(ev, 'bodyFat');
            return (
              <Pressable
                key={ev._id}
                onPress={() => navigation.navigate('EvaluationResults', { athleteId, evaluationId: ev._id })}
                style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Evaluación del ${formatDisplayDate(ev.date)}`}
              >
                <View style={styles.historyDate}>
                  <Text style={styles.historyDateText}>{formatDisplayDate(ev.date)}</Text>
                  {i === 0 ? <Text style={styles.latest}>Última</Text> : null}
                </View>
                <View style={styles.historyValues}>
                  <Text style={styles.historyValue}>
                    {formatNumber(ev.measurements.weightKg ?? null, 1)} kg
                  </Text>
                  <Text style={styles.historyMeta}>
                    {typeof ev.measurements.waistCm === 'number'
                      ? `Cintura ${formatNumber(ev.measurements.waistCm, 1)} cm${
                          waistDelta !== null ? ` (${formatSigned(waistDelta, 1)})` : ''
                        }`
                      : 'Sin cintura'}
                    {bf !== null ? ` · ${formatNumber(bf, 1)} % grasa` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </>
      )}

      <Button title="Eliminar atleta" variant="ghost" icon="trash-outline" onPress={remove} style={styles.delete} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headerBody: { flex: 1, minWidth: 0, gap: 4 },
  name: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: fontSize.xl },
  summary: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.sm },
  headerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  vs: { marginTop: -spacing.xs, marginBottom: spacing.md },
  link: { color: colors.primary, fontFamily: fonts.semibold, fontSize: fontSize.sm },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trendLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.sm, flexShrink: 1 },
  trendHint: { marginTop: spacing.sm, color: colors.textMuted },
  brandHint: { textAlign: 'center', color: colors.textMuted, marginBottom: spacing.md, textDecorationLine: 'underline' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  historyDate: { width: 92 },
  historyDateText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: fontSize.sm },
  latest: { color: colors.primary, fontFamily: fonts.medium, fontSize: fontSize.xs, marginTop: 2 },
  historyValues: { flex: 1, minWidth: 0 },
  historyValue: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: fontSize.sm },
  historyMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.xs, marginTop: 2 },
  pressed: { opacity: 0.8 },
  delete: { marginTop: spacing.xl },
});

export default AthleteProfileScreen;
