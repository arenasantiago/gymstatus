/**
 * Navegación de la app.
 *
 * Flujo principal: Atletas → Perfil del atleta → Nueva evaluación →
 * Resultados → Evolución → Exportar PDF. La ruta inicial depende de si hay una
 * sesión guardada y vigente; un 401 del backend devuelve al inicio de sesión.
 */
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, NavigationContainer, createNavigationContainerRef, type Theme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../components/LoginScreen';
import RegisterScreen from '../components/RegisterScreen';
import AthletesScreen from '../components/AthletesScreen';
import AthleteFormScreen from '../components/AthleteFormScreen';
import AthleteProfileScreen from '../components/AthleteProfileScreen';
import NewEvaluationScreen from '../components/NewEvaluationScreen';
import EvaluationResultsScreen from '../components/EvaluationResultsScreen';
import ProgressScreen from '../components/ProgressScreen';
import BrandSettingsScreen from '../components/BrandSettingsScreen';
import MethodologyScreen from '../components/MethodologyScreen';
import { onSessionExpired } from '../services/session';
import { APP_NAME } from '../config/app';
import { colors, fonts, fontSize } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: fonts.regular, fontWeight: '400' },
    medium: { fontFamily: fonts.medium, fontWeight: '500' },
    bold: { fontFamily: fonts.bold, fontWeight: '700' },
    heavy: { fontFamily: fonts.bold, fontWeight: '700' },
  },
};

type Props = {
  /** 'Athletes' si hay una sesión guardada y vigente; si no, 'Login'. */
  initialRouteName: 'Login' | 'Athletes';
};

const AppNavigator = ({ initialRouteName }: Props) => {
  // Sesión expirada o token rechazado (401): volver al inicio de sesión.
  useEffect(
    () =>
      onSessionExpired(() => {
        if (!navigationRef.isReady()) return;
        const current = navigationRef.getCurrentRoute()?.name;
        if (current === 'Login' || current === 'Register') return;
        navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }),
    [],
  );

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      documentTitle={{
        formatter: (options, route) => {
          const title = typeof options?.title === 'string' ? options.title : route?.name;
          return title ? `${title} · ${APP_NAME}` : APP_NAME;
        },
      }}
    >
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.semibold, fontSize: fontSize.md },
          headerBackButtonDisplayMode: 'minimal',
          headerBackAccessibilityLabel: 'Volver',
          cardStyle: { backgroundColor: colors.background, ...(Platform.OS === 'web' ? { flex: 1 } : null) },
        }}
      >
        <Stack.Group screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar sesión' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Crear cuenta' }} />
        </Stack.Group>
        <Stack.Screen name="Athletes" component={AthletesScreen} options={{ title: 'Atletas' }} />
        <Stack.Screen name="AthleteForm" component={AthleteFormScreen} options={{ title: 'Atleta' }} />
        <Stack.Screen name="AthleteProfile" component={AthleteProfileScreen} options={{ title: 'Atleta' }} />
        <Stack.Screen name="NewEvaluation" component={NewEvaluationScreen} options={{ title: 'Nueva evaluación' }} />
        <Stack.Screen name="EvaluationResults" component={EvaluationResultsScreen} options={{ title: 'Resultados' }} />
        <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: 'Evolución' }} />
        <Stack.Screen name="BrandSettings" component={BrandSettingsScreen} options={{ title: 'Marca y ficha PDF' }} />
        <Stack.Screen name="Methodology" component={MethodologyScreen} options={{ title: 'Metodología y fuentes' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
