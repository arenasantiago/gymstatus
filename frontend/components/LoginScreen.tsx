import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Title, Subtitle, Card, Field, Button, Small } from './ui';
import { apiRequest, errorMessage } from '../services/apiClient';
import { saveToken } from '../services/auth';
import { notify } from '../services/dialogs';
import { APP_NAME } from '../config/app';
import { colors, spacing } from '../theme';
import type { ScreenProps } from '../Navigation/types';

const LoginScreen = ({ navigation }: ScreenProps<'Login'>) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      notify('Faltan datos', 'Ingresa tu usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest<{ token: string }>('/users/login', {
        method: 'POST',
        body: { username: username.trim(), password },
      });
      // Persistir el token para que las pantallas protegidas puedan usarlo.
      await saveToken(data.token);
      navigation.reset({ index: 0, routes: [{ name: 'Athletes' }] });
    } catch (error) {
      notify('No se pudo iniciar sesión', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen center>
      <View style={styles.logo}>
        <Ionicons name="pulse" size={36} color={colors.primary} />
      </View>
      <Title>{APP_NAME}</Title>
      <Subtitle>Evaluación y seguimiento de composición corporal para entrenadores</Subtitle>

      <Card>
        <Field
          label="Usuario"
          placeholder="Tu usuario"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          value={username}
          onChangeText={setUsername}
          returnKeyType="next"
        />
        <Field
          label="Contraseña"
          placeholder="Tu contraseña"
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
          returnKeyType="go"
        />
        <Button title="Ingresar" onPress={handleLogin} loading={loading} />
      </Card>

      <Button title="Crear cuenta de entrenador" variant="ghost" onPress={() => navigation.navigate('Register')} />
      <Small style={styles.footnote}>
        Estimaciones educativas para el seguimiento deportivo. No sustituyen la valoración médica.
      </Small>
    </Screen>
  );
};

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  footnote: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.sm },
});

export default LoginScreen;
