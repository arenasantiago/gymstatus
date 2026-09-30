/**
 * Metodología: fórmulas, factores en uso, fuentes y limitaciones.
 *
 * La pantalla solo presenta: el contenido lo construye el motor compartido
 * (shared/methodology.js) a partir de la misma configuración que calcula los
 * resultados, así que lo explicado coincide siempre con lo calculado.
 */
import React, { useLayoutEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bullet, Card, Collapsible, Notice, Screen, SectionTitle, Small } from './ui';
import { methodology, type MethodItem } from '../domain/view';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import type { ScreenProps } from '../Navigation/types';

function MethodBlock({ item }: { item: MethodItem }) {
  return (
    <View style={styles.block}>
      {item.formulas && item.formulas.length > 0 ? (
        <View style={styles.formulaBox}>
          {item.formulas.map((formula) => (
            <Text key={formula} style={styles.formula} selectable>
              {formula}
            </Text>
          ))}
        </View>
      ) : null}

      {item.text ? <Text style={styles.text}>{item.text}</Text> : null}

      {item.values && item.values.length > 0 ? (
        <View style={styles.values}>
          {item.values.map((row) => (
            <View key={`${row.label}-${row.value}`} style={styles.valueRow}>
              <View style={styles.valueHead}>
                <Text style={styles.valueLabel}>{row.label}</Text>
                <Text style={styles.valueText}>{row.value}</Text>
              </View>
              {row.note ? <Text style={styles.valueNote}>{row.note}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {item.bullets && item.bullets.length > 0 ? (
        <View style={styles.bullets}>
          {item.bullets.map((bullet) => (
            <Bullet key={bullet}>{bullet}</Bullet>
          ))}
        </View>
      ) : null}

      {item.source ? <Text style={styles.source}>Fuente: {item.source}</Text> : null}
    </View>
  );
}

const MethodologyScreen = ({ navigation }: ScreenProps<'Methodology'>) => {
  const data = useMemo(() => methodology(), []);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Metodología y fuentes' });
  }, [navigation]);

  return (
    <Screen>
      <Notice tone="info" title="Cómo leer los resultados">
        Todos los valores son estimaciones a partir de mediciones antropométricas. Cada fórmula muestra su fuente y cada
        evaluación guarda los factores con que se calculó (motor de cálculo {data.calcVersion}).
      </Notice>

      {data.sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <SectionTitle>{section.title}</SectionTitle>
          {section.intro ? <Small style={styles.intro}>{section.intro}</Small> : null}
          {section.items.map((item, index) => (
            <Collapsible
              key={item.title}
              title={item.title}
              icon={section.key === 'scope' ? 'shield-checkmark-outline' : 'calculator-outline'}
              initiallyOpen={section.key === 'energy' && index === 2}
            >
              <MethodBlock item={item} />
            </Collapsible>
          ))}
        </View>
      ))}

      <SectionTitle>Referencias</SectionTitle>
      <Card>
        {data.references.map((reference) => (
          <Text key={reference} style={styles.reference} selectable>
            {reference}
          </Text>
        ))}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: spacing.md },
  intro: { marginBottom: spacing.sm },
  block: { gap: spacing.sm },
  formulaBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  formula: { color: colors.primary, fontFamily: fonts.medium, fontSize: fontSize.xs, lineHeight: 18 },
  text: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 20 },
  values: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  valueRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 2,
  },
  valueHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  valueLabel: { flex: 1, color: colors.textPrimary, fontFamily: fonts.medium, fontSize: fontSize.sm },
  valueText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: fontSize.sm, textAlign: 'right', flexShrink: 1 },
  valueNote: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.xs, lineHeight: 17 },
  bullets: { gap: spacing.xs },
  source: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.xs, lineHeight: 16 },
  reference: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
});

export default MethodologyScreen;
