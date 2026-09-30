/**
 * Tabla de comparación con la evaluación anterior: anterior, actual, cambio
 * absoluto y, cuando tiene sentido, cambio porcentual.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MetricComparison } from '../../shared/progress';
import { formatNumber, formatSigned } from '../../shared/format';
import { changeColor, colors, fonts, fontSize, spacing } from '../theme';

function ChangeCell({ row }: { row: MetricComparison }) {
  if (row.delta === null) {
    return <Text style={styles.muted}>—</Text>;
  }
  const color = changeColor(row.tone);
  const icon = row.direction === 'up' ? 'arrow-up' : row.direction === 'down' ? 'arrow-down' : 'remove';
  return (
    <View style={styles.changeCell}>
      <View style={styles.changeLine}>
        <Ionicons name={icon} size={12} color={color} />
        <Text style={[styles.change, { color }]}>
          {formatSigned(row.delta, row.decimals)}
          {row.changeMode === 'points' ? ' pts' : ''}
        </Text>
      </View>
      {row.deltaPct !== null ? <Text style={styles.pct}>{formatSigned(row.deltaPct, 1)} %</Text> : null}
    </View>
  );
}

export function ComparisonTable({ rows }: { rows: MetricComparison[] }) {
  return (
    <View accessibilityLabel="Comparación con la evaluación anterior">
      <View style={[styles.row, styles.head]}>
        <Text style={[styles.metric, styles.headText]}>Métrica</Text>
        <Text style={[styles.cell, styles.headText]}>Anterior</Text>
        <Text style={[styles.cell, styles.headText]}>Actual</Text>
        <Text style={[styles.cell, styles.headText]}>Cambio</Text>
      </View>
      {rows.map((row) => (
        <View key={row.metric} style={styles.row}>
          <Text style={styles.metric} numberOfLines={2}>
            {row.label}
            {row.unit ? <Text style={styles.unit}> ({row.unit})</Text> : null}
          </Text>
          <Text style={[styles.cell, styles.previous]}>{formatNumber(row.previous, row.decimals)}</Text>
          <Text style={[styles.cell, styles.current]}>{formatNumber(row.current, row.decimals)}</Text>
          <View style={styles.cellView}>
            <ChangeCell row={row} />
          </View>
        </View>
      ))}
      <Text style={styles.legend}>
        Verde: cambio en la dirección del objetivo · Ámbar: en contra · Gris: sin preferencia. «pts»: puntos
        porcentuales.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  head: { paddingTop: 0 },
  headText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: fontSize.xs },
  metric: { flex: 1.5, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: fontSize.sm },
  unit: { color: colors.textMuted, fontSize: fontSize.xs },
  cell: { flex: 1, textAlign: 'right', fontSize: fontSize.sm },
  cellView: { flex: 1, alignItems: 'flex-end' },
  previous: { color: colors.textSecondary, fontFamily: fonts.regular },
  current: { color: colors.textPrimary, fontFamily: fonts.semibold },
  changeCell: { alignItems: 'flex-end' },
  changeLine: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  change: { fontFamily: fonts.semibold, fontSize: fontSize.sm },
  pct: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11 },
  muted: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.sm },
  legend: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, marginTop: spacing.sm, lineHeight: 15 },
});
