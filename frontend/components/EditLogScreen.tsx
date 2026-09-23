import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Screen, Title, Card, Field, Button } from './ui';
import { apiRequest } from '../services/apiClient';

const EditLogScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { record } = route.params;
  const [name, setName] = useState(record.name);
  const [idNumber, setIdNumber] = useState(record.idNumber);
  const [saving, setSaving] = useState(false);

  const saveChanges = async () => {
    if (!name || !idNumber) {
      Alert.alert('Error', 'El nombre y la cédula no pueden estar vacíos.');
      return;
    }
    setSaving(true);
    try {
      await apiRequest(`/records/${record._id}`, {
        method: 'PUT',
        auth: true,
        body: { name, idNumber },
      });
      Alert.alert('Éxito', 'Registro modificado correctamente.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo modificar el registro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen center>
      <Title>Modificar Registro</Title>

      <Card>
        <Field label="Nombre" placeholder="Nombre" value={name} onChangeText={setName} />
        <Field
          label="Cédula"
          placeholder="Cédula"
          keyboardType="numeric"
          value={idNumber}
          onChangeText={setIdNumber}
        />
      </Card>

      <Button title="Guardar cambios" onPress={saveChanges} loading={saving} />
      <Button title="Cancelar" variant="secondary" onPress={() => navigation.goBack()} />
    </Screen>
  );
};

export default EditLogScreen;
