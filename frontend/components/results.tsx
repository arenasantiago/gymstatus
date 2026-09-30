/**
 * Presentación de un resultado calculado. Mantiene visualmente separados:
 *   - el VALOR calculado (con su unidad),
 *   - la INTERPRETACIÓN descriptiva (etiqueta y detalle con su referencia),
 *   - la FÓRMULA usada (general y con los valores de esta evaluación),
 *   - y, si no se pudo calcular, qué medición falta exactamente.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, IconName } from './ui';
import { formatNumber } from '../../shared/format';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import { missingText, RESULT_DISPLAY } from '../domain/view';
import type { ResultEntry, ResultKey } from '../domain/types';

export function ResultCard({
  resultKey,
  entry,
  icon,
  highlight = false,
  note,
  valueOverride,
  extra,
}: {
  resultKey: ResultKey;
  entry: ResultEntry | null | undefined;
  icon?: IconName;
  highlight?: boolean;
  /** Nota fija bajo el resultado (p. ej. la advertencia del IMC en atletas). */
  note?: string;
  /** Texto del valor cuando requiere un formato especial (p. ej. litros). */
  valueOverride?: string;
  extra?: React.ReactNode;
}) {
  const [showFormula, setShowFormula] = useState(false);
  const display = RESULT_DISPLAY[resultKey];
  const ok = !!entry && entry.status === 'ok' && typeof entry.value === 'number';
  const interpretation = entry ? entry.interpretation : null;

  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <View style={styles.header}>
        {icon ? <Ionicons name={icon} size={18} color={highlight ? colors.primary : colors.textSecondary} /> : null}
        <Text style={[styles.title, highlight && styles.titleHighlight]}>{display.label}</Text>
      </View>

      {ok ? (
        <Text style={[styles.value, highlight && styles.valueHighlight]}>
          {valueOverride ?? formatNumber(entry!.value as number, display.decimals)}
          {!valueOverride && display.unit ? <Text style={styles.unit}> {display.unit}</Text> : null}
        </Text>
      ) : (
        <View style={styles.missingBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
          <Text style={styles.missing}>{missingText(entry)}</Text>
        </View>
      )}

      {ok && interpretation ? (
        <View style={styles.interpretation}>
          <Badge label={interpretation.label} tone={interpretation.tone} />
          <Text style={styles.detail}>{interpretation.detail}</Text>
          <Text style={styles.reference}>Referencia: {interpretation.reference}</Text>
        </View>
      ) : null}

      {note ? <Text style={styles.note}>{note}</Text> : null}
      {ok && extra ? <View style={styles.extra}>{extra}</View> : null}

      {entry && entry.formula ? (
        <View>
          <Pressable
            onPress={() => setShowFormula((v) => !v)}
            style={styles.formulaToggle}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ expanded: showFormula }}
          >
            <Ionicons name="calculator-outline" size={14} color={colors.primary} />
            <Text style={styles.formulaToggleText}>{showFormula ? 'Ocultar fórmula' : 'Ver fórmula'}</Text>
          </Pressable>
          {showFormula ? (
            <View style={styles.formula}>
              <Text style={styles.formulaName}>{entry.formula.name}</Text>
              <Text style={styles.formulaExpr}>{entry.formula.expression}</Text>
              {ok && entry.formula.substituted ? (
                <Text style={styles.formulaSub}>{entry.formula.substituted}</Text>
              ) : null}
              {entry.formula.source ? <Text style={styles.reference}>Fuente: {entry.formula.source}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHighlight: { borderColor: colors.primary, backgroundColor: '#0E1B2B' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  title: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: fontSize.sm, flex: 1 },
  titleHighlight: { color: colors.primary },
  value: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: fontSize.xxl, letterSpacing: -0.3 },
  valueHighlight: { fontSize: fontSize.display },
  unit: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: fontSize.md },
  missingBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.xs },
  missing: { flex: 1, color: colors.warning, fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 20 },
  interpretation: { marginTop: spacing.sm, gap: spacing.xs },
  detail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 20 },
  reference: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.xs, lineHeight: 16 },
  note: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    lineHeight: 17,
    marginTop: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderStrong,
  },
  extra: { marginTop: spacing.md },
  formulaToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md, alignSelf: 'flex-start', minHeight: 28 },
  formulaToggleText: { color: colors.primary, fontFamily: fonts.medium, fontSize: fontSize.xs },
  formula: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    gap: 4,
  },
  formulaName: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: fontSize.xs },
  formulaExpr: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.xs, lineHeight: 17 },
  formulaSub: { color: colors.primary, fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 20 },
});
