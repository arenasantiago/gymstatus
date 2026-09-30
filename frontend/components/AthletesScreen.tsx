/**
 * Atletas: punto de partida del entrenador. Lista con el resumen de la
 * última evaluación de cada atleta y acceso directo a crear uno nuevo.
 */
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Loading,
  Screen,
  Small,
} from './ui';
import { Avatar } from './metrics';
import { listAthletes } from '../services/performance';
import { clearToken } from '../services/auth';
import { confirmAction } from '../services/dialogs';
import { useFocusLoader } from '../hooks/useFocusLoader';
import { goalShort, levelLabel } from '../domain/view';
import { formatShortDate } from '../../shared/dates';
import { formatNumber } from '../../shared/format';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import type { AthleteListItem } from '../domain/types';
import type { ScreenProps } from '../Navigation/types';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u')
    .replace(/ñ/g, 'n');
}

function lastSummary(item: AthleteListItem): string {
  const last = item.lastEvaluation;
  if (!last) return 'Sin evaluaciones';
  const parts = [
    last.weightKg !== null ? `${formatNumber(last.weightKg, 1)} kg` : '',
    last.waistCm !== null ? `cintura ${formatNumber(last.waistCm, 1)} cm` : '',
    last.bodyFatPct !== null ? `${formatNumber(last.bodyFatPct, 1)} % grasa` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'Última evaluación sin mediciones de seguimiento';
}

const AthletesScreen = ({ navigation }: ScreenProps<'Athletes'>) => {
  const loader = useCallback(() => listAthletes(), []);
  const { data, error, loading, refreshing, reload } = useFocusLoader(loader);
  const [query, setQuery] = useState('');

  const logout = useCallback(async () => {
    const ok = await confirmAction('Cerrar sesión', '¿Quieres cerrar la sesión en este dispositivo?', 'Cerrar sesión');
    if (!ok) return;
    await clearToken();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <IconButton icon="color-palette-outline" label="Marca y ficha PDF" onPress={() => navigation.navigate('BrandSettings')} />
          <IconButton icon="log-out-outline" label="Cerrar sesión" onPress={logout} />
        </View>
      ),
    });
  }, [navigation, logout]);

  const athletes = useMemo(() => {
    const list = data || [];
    const q = normalize(query.trim());
    if (!q) return list;
    return list.filter((a) => normalize(`${a.name} ${a.sport}`).includes(q));
  }, [data, query]);

  if (loading && !data) return <Loading message="Cargando atletas…" />;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={reload}
      footer={
        <Button title="Nuevo atleta" icon="person-add-outline" onPress={() => navigation.navigate('AthleteForm')} />
      }
    >
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}

      {data && data.length > 0 ? (
        <>
          {data.length > 5 ? (
            <Field
              placeholder="Buscar por nombre o deporte"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          ) : null}
          <Small style={styles.count}>
            {data.length === 1 ? '1 atleta' : `${data.length} atletas`}
          </Small>
          {athletes.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => navigation.navigate('AthleteProfile', { athleteId: item._id })}
              style={({ pressed }) => [pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Abrir perfil de ${item.name}`}
            >
              <Card style={styles.card}>
                <Avatar name={item.name} size={48} />
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[item.sport, levelLabel(item.level), goalShort(item.goal)].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={styles.last} numberOfLines={1}>
                    {lastSummary(item)}
                  </Text>
                </View>
                <View style={styles.side}>
                  {item.lastEvaluation ? (
                    <Text style={styles.date}>{formatShortDate(item.lastEvaluation.date)}</Text>
                  ) : null}
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>{item.evaluationCount}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Card>
            </Pressable>
          ))}
          {athletes.length === 0 ? <EmptyState icon="search" message="Ningún atleta coincide con la búsqueda." /> : null}
        </>
      ) : null}

      {data && data.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Aún no tienes atletas"
          message="Crea el perfil de tu primer atleta para registrar su evaluación, ver su evolución y generar su ficha en PDF."
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.xs },
  count: { marginBottom: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  body: { flex: 1, minWidth: 0 },
  name: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: fontSize.md },
  meta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: fontSize.xs, marginTop: 2 },
  last: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.xs, marginTop: 2 },
  side: { alignItems: 'flex-end', gap: 4 },
  date: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: fontSize.xs },
  countPill: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11 },
  pressed: { opacity: 0.8 },
});

export default AthletesScreen;
