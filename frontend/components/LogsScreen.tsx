import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Title, Button, EmptyState } from './ui';
import { colors, spacing, radius, fonts, fontSize } from '../theme';
import { bmiColor, riskColor } from '../theme';
import { bmiCategory, iccRisk } from '../services/health';
import { apiRequest } from '../services/apiClient';

interface Record {
  _id: string;
  name: string;
  idNumber: string;
  bmi: number;
  icc: number;
  gender: string;
  age: number;
  createdAt?: string;
}

const LogsScreen = ({ navigation }: { navigation: any }) => {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Record[]>('/records', { auth: true });
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los registros.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarga cada vez que la pantalla recibe foco.
  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [fetchRecords]),
  );

  const confirmDelete = (id: string) => {
    Alert.alert('Eliminar registro', '¿Seguro que quieres eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRecord(id) },
    ]);
  };

  const deleteRecord = async (id: string) => {
    try {
      await apiRequest(`/records/${id}`, { method: 'DELETE', auth: true });
      setRecords((prev) => prev.filter((r) => r._id !== id));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo eliminar el registro.');
    }
  };

  const renderItem = ({ item }: { item: Record }) => {
    const category = bmiCategory(item.bmi);
    const risk = iccRisk(item.icc, item.gender, item.age);
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>Cédula: {item.idNumber}</Text>
        <View style={styles.metricsRow}>
          <Text style={styles.metric}>
            IMC {item.bmi} <Text style={{ color: bmiColor(category) }}>({category})</Text>
          </Text>
          <Text style={styles.metric}>
            ICC {item.icc} <Text style={{ color: riskColor(risk) }}>({risk})</Text>
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            title="Modificar"
            onPress={() => navigation.navigate('EditLog', { record: item })}
          />
          <View style={styles.actionGap} />
          <Button title="Eliminar" variant="danger" onPress={() => confirmDelete(item._id)} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Title>Registros</Title>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : error ? (
        <View>
          <EmptyState message={error} />
          <Button title="Reintentar" onPress={fetchRecords} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState message="Aún no hay registros guardados." />}
        />
      )}

      <Button title="Volver" variant="secondary" onPress={() => navigation.goBack()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  list: { paddingBottom: spacing.lg },
  card: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  name: { color: colors.textPrimary, fontSize: fontSize.lg, fontFamily: fonts.bold },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
  metricsRow: { marginTop: spacing.sm, marginBottom: spacing.md },
  metric: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
    marginBottom: spacing.xs,
  },
  actions: { flexDirection: 'row' },
  actionGap: { width: spacing.md },
});

export default LogsScreen;
