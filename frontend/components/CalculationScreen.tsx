import React, { useState } from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Screen, Title, Card, Field, Button } from './ui';
import { colors, spacing, radius, fonts, fontSize } from '../theme';

const CalculationScreen = ({ navigation }: { navigation: any }) => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');

  const calculateResults = () => {
    if (!weight || !height || !waist || !hip || !age || !name || !idNumber) {
      Alert.alert('Error', 'Por favor ingresa todos los valores requeridos.');
      return;
    }

    const weightInKg = parseFloat(weight);
    const heightInM = parseFloat(height) / 100;
    const waistInCm = parseFloat(waist);
    const hipInCm = parseFloat(hip);
    const ageInYears = parseInt(age, 10);

    if (
      isNaN(weightInKg) ||
      isNaN(heightInM) ||
      isNaN(waistInCm) ||
      isNaN(hipInCm) ||
      isNaN(ageInYears)
    ) {
      Alert.alert('Error', 'Por favor ingresa valores válidos.');
      return;
    }

    if (heightInM <= 0 || hipInCm <= 0) {
      Alert.alert('Error', 'La altura y la cadera deben ser mayores que cero.');
      return;
    }

    const bmi = (weightInKg / (heightInM * heightInM)).toFixed(2);
    const icc = (waistInCm / hipInCm).toFixed(2);

    navigation.navigate('Results', {
      bmi,
      icc,
      gender,
      age: ageInYears,
      name,
      idNumber,
    });
  };

  return (
    <Screen>
      <Title>Calculadora de Salud</Title>

      <Card>
        <Field label="Nombre" placeholder="Ej: Juan Pérez" value={name} onChangeText={setName} />
        <Field
          label="Cédula"
          placeholder="Ej: 123456789"
          keyboardType="numeric"
          value={idNumber}
          onChangeText={setIdNumber}
        />
        <Field
          label="Peso (kg)"
          placeholder="Ej: 70"
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
        />
        <Field
          label="Altura (cm)"
          placeholder="Ej: 175"
          keyboardType="numeric"
          value={height}
          onChangeText={setHeight}
        />
        <Field
          label="Cintura (cm)"
          placeholder="Ej: 80"
          keyboardType="numeric"
          value={waist}
          onChangeText={setWaist}
        />
        <Field
          label="Cadera (cm)"
          placeholder="Ej: 95"
          keyboardType="numeric"
          value={hip}
          onChangeText={setHip}
        />
        <Field
          label="Edad"
          placeholder="Ej: 30"
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
        />

        <Text style={styles.label}>Género</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={gender}
            style={styles.picker}
            dropdownIconColor={colors.textPrimary}
            onValueChange={(itemValue) => setGender(String(itemValue))}
          >
            <Picker.Item label="Hombre" value="male" color={colors.onPrimary} />
            <Picker.Item label="Mujer" value="female" color={colors.onPrimary} />
          </Picker>
        </View>
      </Card>

      <Button title="Calcular" onPress={calculateResults} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    marginBottom: spacing.xs,
  },
  pickerWrap: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    color: colors.textPrimary,
  },
});

export default CalculationScreen;
