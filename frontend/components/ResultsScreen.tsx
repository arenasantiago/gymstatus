import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Screen, Title, Card, Button } from './ui';
import { colors, spacing, fonts, fontSize } from '../theme';
import { bmiColor, riskColor } from '../theme';
import { bmiCategory, iccRisk } from '../services/health';
import { apiRequest } from '../services/apiClient';

const ResultsScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { bmi, icc, gender, age, name, idNumber } = route.params;
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const bmiNum = parseFloat(bmi);
  const iccNum = parseFloat(icc);
  const category = bmiCategory(bmiNum);
  const risk = iccRisk(iccNum, gender, age);

  const saveRecord = async () => {
    setSaving(true);
    try {
      await apiRequest('/records', {
        method: 'POST',
        auth: true,
        body: { name, idNumber, bmi: bmiNum, icc: iccNum, gender, age },
      });
      Alert.alert('Éxito', 'Registro guardado correctamente.');
      setIsSaved(true);
    } catch (error: any) {
      const msg = error.message || 'No se pudo guardar el registro.';
      Alert.alert('Error', msg);
      if (msg.includes('sesión')) navigation.navigate('Login');
    } finally {
      setSaving(false);
    }
  };

  const downloadCsv = async () => {
    try {
      const data = `Nombre,Cédula,IMC,Categoría,ICC,Riesgo\n${name},${idNumber},${bmi},${category},${icc},${risk}`;
      const fileUri = FileSystem.documentDirectory + 'resultado-gymstatus.csv';
      await FileSystem.writeAsStringAsync(fileUri, data, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Guardado', `Archivo generado en: ${fileUri}`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar el archivo.');
    }
  };

  return (
    <Screen center>
      <Title>Resultados</Title>

      <Card>
        <Row label="Nombre" value={name} />
        <Row label="Cédula" value={idNumber} />
        <View style={styles.divider} />

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>IMC</Text>
          <Text style={styles.metricValue}>{bmi}</Text>
          <Text style={[styles.badge, { color: bmiColor(category) }]}>{category}</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>ICC</Text>
          <Text style={styles.metricValue}>{icc}</Text>
          <Text style={[styles.badge, { color: riskColor(risk) }]}>Riesgo {risk}</Text>
        </View>
      </Card>

      {!isSaved && (
        <Button title="Guardar registro" onPress={saveRecord} loading={saving} />
      )}
      <Button title="Descargar CSV" variant="secondary" onPress={downloadCsv} />
    </Screen>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  rowLabel: { color: colors.textSecondary, fontSize: fontSize.md, fontFamily: fonts.regular },
  rowValue: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fonts.medium },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  metric: { alignItems: 'center', marginBottom: spacing.lg },
  metricLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontFamily: fonts.medium },
  metricValue: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontFamily: fonts.bold,
  },
  badge: { fontSize: fontSize.md, fontFamily: fonts.bold, marginTop: spacing.xs },
});

export default ResultsScreen;
