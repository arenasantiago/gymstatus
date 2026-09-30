import React, { useState } from 'react';
import { Screen, Title, Subtitle, Card, Field, Button } from './ui';
import { apiRequest, errorMessage } from '../services/apiClient';
import { saveToken } from '../services/auth';
import { notify } from '../services/dialogs';
import type { ScreenProps } from '../Navigation/types';

const RegisterScreen = ({ navigation }: ScreenProps<'Register'>) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      notify('Faltan datos', 'Completa usuario, correo y contraseña.');
      return;
    }
    if (password.length < 6) {
      notify('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      notify('Revisa la contraseña', 'Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      // Crear la cuenta.
      await apiRequest('/users/register', {
        method: 'POST',
        body: { username: username.trim(), email: email.trim(), password },
      });
      // Iniciar sesión automáticamente tras el registro.
      const data = await apiRequest<{ token: string }>('/users/login', {
        method: 'POST',
        body: { username: username.trim(), password },
      });
      await saveToken(data.token);
      navigation.reset({ index: 0, routes: [{ name: 'Athletes' }] });
    } catch (error) {
      notify('No se pudo crear la cuenta', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen center>
      <Title>Crear cuenta</Title>
      <Subtitle>Para entrenadores, preparadores físicos, clubes y centros de rendimiento</Subtitle>

      <Card>
        <Field
          label="Usuario"
          placeholder="Elige un usuario"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <Field
          label="Correo"
          placeholder="tu@correo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Contraseña"
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
        />
        <Field
          label="Confirmar contraseña"
          placeholder="Repite la contraseña"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          onSubmitEditing={handleRegister}
        />
        <Button title="Crear cuenta" onPress={handleRegister} loading={loading} />
      </Card>

      <Button title="Ya tengo cuenta" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
};

export default RegisterScreen;
