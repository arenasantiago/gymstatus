import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Screen, Title, Subtitle, Card, Field, Button } from './ui';
import { apiRequest } from '../services/apiClient';
import { saveToken } from '../services/auth';

const RegisterScreen = ({ navigation }: { navigation: any }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Completa usuario, correo y contraseña.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      // Crear la cuenta.
      await apiRequest('/users/register', {
        method: 'POST',
        body: { username, email, password },
      });
      // Iniciar sesión automáticamente tras el registro.
      const data = await apiRequest<{ token: string }>('/users/login', {
        method: 'POST',
        body: { username, password },
      });
      await saveToken(data.token);
      navigation.replace('CalculationScreen');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen center>
      <Title>Crear cuenta</Title>
      <Subtitle>Regístrate para empezar</Subtitle>

      <Card>
        <Field
          label="Usuario"
          placeholder="Elige un usuario"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <Field
          label="Correo"
          placeholder="tu@correo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Contraseña"
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Field
          label="Confirmar contraseña"
          placeholder="Repite la contraseña"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
      </Card>

      <Button title="Crear cuenta" onPress={handleRegister} loading={loading} />
      <Button
        title="Ya tengo cuenta"
        variant="secondary"
        onPress={() => navigation.goBack()}
      />
    </Screen>
  );
};

export default RegisterScreen;
