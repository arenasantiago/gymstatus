import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Screen, Title, Subtitle, Card, Field, Button } from './ui';
import { apiRequest } from '../services/apiClient';
import { saveToken } from '../services/auth';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest<{ token: string }>('/users/login', {
        method: 'POST',
        body: { username, password },
      });
      // Persistir el token para que las pantallas protegidas puedan usarlo.
      await saveToken(data.token);
      navigation.navigate('CalculationScreen');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen center>
      <Title>GymStatus</Title>
      <Subtitle>Inicia sesión para continuar</Subtitle>

      <Card>
        <Field
          label="Usuario"
          placeholder="Tu usuario"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <Field
          label="Contraseña"
          placeholder="Tu contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </Card>

      <Button title="Ingresar" onPress={handleLogin} loading={loading} />
      <Button
        title="Ver registros"
        variant="secondary"
        onPress={() => navigation.navigate('Logs')}
      />
    </Screen>
  );
};

export default LoginScreen;
