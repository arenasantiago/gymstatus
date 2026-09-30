import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import AppNavigator from './Navigation/AppNavigator';
import { getToken, isTokenFresh } from './services/auth';
import { warmUpApi } from './services/apiClient';
import { colors } from './theme';

const App = () => {
  // Nombres usados por el sistema de diseño (theme/index.ts → fonts).
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    // Despierta el backend en paralelo con la carga de fuentes y de la sesión.
    warmUpApi();
    let active = true;
    getToken()
      .then((token) => (isTokenFresh(token) ? 'Athletes' : 'Login'))
      .catch(() => 'Login')
      .then((route) => {
        if (active) setInitialRoute(route);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Si una fuente falla se usa la del sistema: la app sigue siendo usable.
    if (fontError) console.warn('No se pudieron cargar las fuentes:', fontError.message);
  }, [fontError]);

  const ready = (fontsLoaded || fontError) && initialRoute;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ready ? (
        <AppNavigator initialRouteName={initialRoute} />
      ) : (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
