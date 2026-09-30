/**
 * Piezas visuales de métricas: indicador de cambio, tarjeta de métrica,
 * avatar del atleta y barra de macronutrientes.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MetricComparison } from '../../shared/progress';
import { formatNumber, formatSigned } from '../../shared/format';
import { changeColor, colors, fonts, fontSize, radius, spacing } from '../theme';
import { Badge, IconName } from './ui';
import type { MacroSplit } from '../domain/types';

/* ------------------------------------------------------------------ */
/* Cambio respecto a la evaluación anterior                            */
/* ------------------------------------------------------------------ */

export function DeltaText({
  row,
  hasPrevious,
  showPct = true,
  size = 'sm',
}: {
  row?: MetricComparison | null;
  /** Si existe una evaluación anterior (para distinguir "primera medición"). */
  hasPrevious: boolean;
  showPct?: boolean;
  size?: 'xs' | 'sm';
}) {
  const textSize = size === 'xs' ? fontSize.xs : fontSize.sm;
  if (!row || row.delta === null) {
    const label = !hasPrevious ? 'Primera evaluación' : row && row.current !== null ? 'Sin dato anterior' : '—';
    return <Text style={[styles.deltaMuted, { fontSize: textSize }]}>{label}</Text>;
  }
  const color = changeColor(row.tone);
  const icon: IconName = row.direction === 'up' ? 'arrow-up' : row.direction === 'down' ? 'arrow-down' : 'remove';
  const unit = row.changeMode === 'points' ? ' pts' : row.unit ? ` ${row.unit}` : '';
  const pct = showPct && row.deltaPct !== null ? ` (${formatSigned(row.deltaPct, 1)} %)` : '';
  return (
    <View style={styles.deltaRow} accessibilityLabel={`Cambio ${formatSigned(row.delta, row.decimals)}${unit}`}>
      <Ionicons name={icon} size={textSize} color={color} />
      <Text style={[styles.deltaText, { color, fontSize: textSize }]}>
        {formatSigned(row.delta, row.decimals)}
        {unit}
        {pct}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de métrica del dashboard                                    */
/* ------------------------------------------------------------------ */

export function MetricTile({
  label,
  value,
  unit,
  decimals = 1,
  icon,
  delta,
  hasPrevious = false,
  badge,
  caption,
  missing,
  highlight = false,
  wide = false,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  decimals?: number;
  icon?: IconName;
  delta?: MetricComparison | null;
  hasPrevious?: boolean;
  badge?: { label: string; tone?: string | null } | null;
  caption?: string;
  /** Texto cuando no se pudo calcular (p. ej. "Falta: Cuello"). */
  missing?: string;
  highlight?: boolean;
  wide?: boolean;
}) {
  const hasValue = typeof value === 'number' && Number.isFinite(value);
  return (
    <View style={[styles.tile, wide && styles.tileWide, highlight && styles.tileHighlight]}>
      <View style={styles.tileHeader}>
        {icon ? <Ionicons name={icon} size={16} color={highlight ? colors.primary : colors.textSecondary} /> : null}
        <Text style={[styles.tileLabel, highlight && styles.tileLabelHighlight]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {hasValue ? (
        <Text style={[styles.tileValue, highlight && styles.tileValueHighlight]} numberOfLines={1} adjustsFontSizeToFit>
          {formatNumber(value as number, decimals)}
          {unit ? <Text style={styles.tileUnit}> {unit}</Text> : null}
        </Text>
      ) : (
        <Text style={styles.tileMissing}>{missing || 'Sin dato'}</Text>
      )}
      {badge ? (
        <View style={styles.tileBadge}>
          <Badge label={badge.label} tone={badge.tone} />
        </View>
      ) : null}
      {delta !== undefined && hasValue ? (
        <View style={styles.tileDelta}>
          <DeltaText row={delta} hasPrevious={hasPrevious} showPct={false} size="xs" />
        </View>
      ) : null}
      {caption ? <Text style={styles.tileCaption}>{caption}</Text> : null}
    </View>
  );
}

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

export function initialsOf(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((w) => w.charAt(0).toUpperCase());
  return letters.join('') || '?';
}

export function Avatar({ name, photo, size = 48 }: { name: string; photo?: string | null; size?: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (photo) {
    return <Image source={{ uri: photo }} style={[styles.avatarImage, shape]} accessibilityLabel={`Foto de ${name}`} />;
  }
  return (
    <View style={[styles.avatarInitials, shape]}>
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.38) }]}>{initialsOf(name)}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Macronutrientes                                                     */
/* ------------------------------------------------------------------ */

const MACRO_COLORS = {
  protein: '#38BDF8',
  carbs: '#34D399',
  fat: '#FBBF24',
} as const;

const MACRO_LABELS = {
  protein: 'Proteínas',
  carbs: 'Carbohidratos',
  fat: 'Grasas',
} as const;

export function MacroBreakdown({ split }: { split: MacroSplit }) {
  const order = ['protein', 'carbs', 'fat'] as const;
  return (
    <View>
      <View style={styles.macroBar} accessibilityLabel="Distribución de macronutrientes">
        {order.map((key) =>
          split[key].pct > 0 ? (
            <View key={key} style={{ flex: split[key].pct, backgroundColor: MACRO_COLORS[key] }} />
          ) : null,
        )}
      </View>
      <View style={styles.macroHeader}>
        <Text style={[styles.macroCell, styles.macroName, styles.macroHead]}>Macronutriente</Text>
        <Text style={[styles.macroCell, styles.macroHead]}>g/día</Text>
        <Text style={[styles.macroCell, styles.macroHead]}>kcal</Text>
        <Text style={[styles.macroCell, styles.macroHead]}>%</Text>
      </View>
      {order.map((key) => (
        <View key={key} style={styles.macroRow}>
          <View style={[styles.macroName, styles.macroNameRow]}>
            <View style={[styles.macroDot, { backgroundColor: MACRO_COLORS[key] }]} />
            <Text style={styles.macroLabel}>{MACRO_LABELS[key]}</Text>
          </View>
          <Text style={styles.macroCell}>{formatNumber(split[key].grams, 0)}</Text>
          <Text style={styles.macroCell}>{formatNumber(split[key].kcal, 0)}</Text>
          <Text style={styles.macroCell}>{formatNumber(split[key].pct, 0)}</Text>
        </View>
      ))}
      <View style={[styles.macroRow, styles.macroTotal]}>
        <Text style={[styles.macroName, styles.macroLabel, styles.macroStrong]}>Total</Text>
        <Text style={styles.macroCell} />
        <Text style={[styles.macroCell, styles.macroStrong]}>{formatNumber(split.totalKcal, 0)}</Text>
        <Text style={[styles.macroCell, styles.macroStrong]}>100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  deltaText: { fontFamily: fonts.semibold },
  deltaMuted: { color: colors.textMuted, fontFamily: fonts.regular },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  tile: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 112,
  },
  tileWide: { width: '100%' },
  tileHighlight: { borderColor: colors.primary, backgroundColor: '#0E1B2B' },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  tileLabel: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: fontSize.xs, flexShrink: 1 },
  tileLabelHighlight: { color: colors.primary },
  tileValue: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: fontSize.xl, letterSpacing: -0.3 },
  tileValueHighlight: { fontSize: fontSize.xxl },
  tileUnit: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: fontSize.sm },
  tileMissing: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.sm, marginTop: spacing.xs },
  tileBadge: { marginTop: spacing.xs },
  tileDelta: { marginTop: spacing.xs },
  tileCaption: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.xs, marginTop: spacing.xs, lineHeight: 16 },
  avatarImage: { backgroundColor: colors.surfaceElevated },
  avatarInitials: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontFamily: fonts.bold },
  macroBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.md,
  },
  macroHeader: { flexDirection: 'row', paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  macroHead: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: fontSize.xs },
  macroRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  macroTotal: { borderBottomWidth: 0 },
  macroName: { flex: 2 },
  macroNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: fontSize.sm },
  macroCell: { flex: 1, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: fontSize.sm, textAlign: 'right' },
  macroStrong: { fontFamily: fonts.semibold },
});
