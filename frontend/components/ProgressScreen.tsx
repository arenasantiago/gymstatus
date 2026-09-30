/**
 * Evolución: responde "¿cómo ha evolucionado el atleta?" para la métrica
 * elegida (peso, cintura, % de grasa, cintura/altura…), con gráfico por
 * fecha, resumen de la tendencia y cambio respecto a cada medición anterior.
 */
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  ChipGroup,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  SectionTitle,
  Small,
} from './ui';
import { DeltaText } from './metrics';
import { LineChart } from './LineChart';
import { getAthleteDetail, getBrand } from '../services/performance';
import { useFocusLoader } from '../hooks/useFocusLoader';
import { useReportExport } from '../hooks/useReportExport';
import {
  chartMetricOptions,
  dashboardFor,
  goalShort,
  lastWeeks,
  metricConfig,
  seriesFor,
  seriesRows,
  trendSentence,
} from '../domain/view';
import { summarizeTrend } from '../../shared/progress';
import { formatDisplayDate } from '../../shared/dates';
import { formatNumber } from '../../shared/format';
import { changeColor, colors, fonts, fontSize, spacing } from '../theme';
import type { MetricKey } from '../../shared/config';
import type { ScreenProps } from '../Navigation/types';

type Period = '4' | '8' | '12' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '4', label: '4 semanas' },
  { value: '8', label: '8 semanas' },
  { value: '12', label: '12 semanas' },
  { value: 'all', label: 'Todo' },
];

const ProgressScreen = ({ navigation, route }: ScreenProps<'Progress'>) => {
  const { athleteId } = route.params;
  const loader = useCallback(
    () => Promise.all([getAthleteDetail(athleteId), getBrand().catch(() => null)]),
    [athleteId],
  );
  const { data, error, loading, refreshing, reload } = useFocusLoader(loader);
  const { exporting, exportReport } = useReportExport();
  const [metric, setMetric] = useState<MetricKey>('waistCm');
  const [period, setPeriod] = useState<Period>('all');

  const detail = data ? data[0] : null;
  const brand = data ? data[1] : null;
  const athlete = detail ? detail.athlete : null;
  const evaluations = detail ? detail.evaluations : [];
  const goal = athlete ? athlete.goal : undefined;
  const cfg = metricConfig(metric);

  useLayoutEffect(() => {
    navigation.setOptions({ title: athlete ? `Evolución · ${athlete.name}` : 'Evolución' });
  }, [navigation, athlete]);

  const series = useMemo(() => {
    const full = seriesFor(evaluations, metric);
    return period === 'all' ? full : lastWeeks(full, Number(period));
  }, [evaluations, metric, period]);
  const trend = useMemo(() => summarizeTrend(series, metric, goal), [series, metric, goal]);
  const rows = useMemo(() => [...seriesRows(series, metric, goal)].reverse(), [series, metric, goal]);
  const current = useMemo(() => dashboardFor(evaluations).current, [evaluations]);

  if (loading && !data) return <Loading message="Cargando evolución…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!athlete) return null;

  if (evaluations.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="trending-up-outline"
          title="Sin evaluaciones"
          message="Registra evaluaciones periódicas para ver aquí la evolución del atleta."
          action={
            <Button title="Nueva evaluación" icon="add" onPress={() => navigation.navigate('NewEvaluation', { athleteId })} />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={reload}
      footer={
        current ? (
          <Button
            title="Exportar ficha PDF"
            icon="share-outline"
            loading={exporting}
            onPress={() => exportReport({ brand, athlete, evaluation: current, evaluations })}
          />
        ) : undefined
      }
    >
      <Card>
        <ChipGroup label="Métrica" options={chartMetricOptions} value={metric} onChange={(v) => v && setMetric(v)} />
        <ChipGroup label="Periodo" options={PERIOD_OPTIONS} value={period} onChange={(v) => v && setPeriod(v)} />
        <LineChart
          series={series}
          height={220}
          emptyMessage={
            period === 'all'
              ? `Aún no hay registros de ${cfg.label.toLowerCase()}.`
              : `Sin registros de ${cfg.label.toLowerCase()} en las últimas ${period} semanas.`
          }
        />
        {trend ? (
          <View style={styles.trendBox}>
            <Text style={[styles.trendText, { color: changeColor(trend.tone) }]}>{trendSentence(metric, trend)}</Text>
            <Small>{`${formatDisplayDate(trend.fromDate)} → ${formatDisplayDate(trend.toDate)}`}</Small>
          </View>
        ) : series.length === 1 ? (
          <Small style={styles.hint}>Solo hay un registro en este periodo: con dos o más verás la tendencia.</Small>
        ) : null}
      </Card>

      {rows.length > 0 ? (
        <>
          <SectionTitle>{`${cfg.label} por evaluación`}</SectionTitle>
          <Card>
            <View style={[styles.row, styles.head]}>
              <Text style={[styles.date, styles.headText]}>Fecha</Text>
              <Text style={[styles.value, styles.headText]}>{cfg.unit ? `Valor (${cfg.unit})` : 'Valor'}</Text>
              <Text style={[styles.change, styles.headText]}>vs. anterior</Text>
            </View>
            {rows.map((row) => (
              <View key={row.id || row.date} style={styles.row}>
                <Text style={styles.date}>{formatDisplayDate(row.date)}</Text>
                <Text style={styles.value}>{formatNumber(row.value, cfg.decimals)}</Text>
                <View style={styles.changeCell}>
                  {row.change ? (
                    <DeltaText row={row.change} hasPrevious size="xs" />
                  ) : (
                    <Text style={styles.muted}>Inicio</Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Small style={styles.footnote}>
        {`Verde: cambio en la dirección del objetivo actual (${goalShort(goal).toLowerCase()}). Mide siempre en el mismo punto anatómico y a la misma hora para que la comparación sea fiable.`}
      </Small>
    </Screen>
  );
};

const styles = StyleSheet.create({
  trendBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },
  trendText: { fontFamily: fonts.semibold, fontSize: fontSize.md, lineHeight: 22 },
  hint: { marginTop: spacing.sm, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 40,
  },
  head: { paddingTop: 0 },
  headText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: fontSize.xs },
  date: { flex: 1.1, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.sm },
  value: { flex: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: fontSize.sm, textAlign: 'right' },
  change: { flex: 1.3, textAlign: 'right' },
  changeCell: { flex: 1.3, alignItems: 'flex-end' },
  muted: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.xs },
  footnote: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.md },
});

export default ProgressScreen;
