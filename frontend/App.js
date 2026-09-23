import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import AppNavigator from './Navigation/AppNavigator';

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      // Nombres usados en el sistema de diseño (theme/index.ts).
      'Inter-Regular': Inter_400Regular,
      'Inter-Medium': Inter_500Medium,
      'Inter-Bold': Inter_700Bold,
      'RubikVinyl-Regular': require('../assets/fonts/RubikVinyl-Regular.ttf'),
    })
      .then(() => setFontsLoaded(true))
      .catch((err) => {
        console.error('Error cargando fuentes:', err);
        // Renderizar de todos modos con las fuentes del sistema.
        setFontsLoaded(true);
      });
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#32FF09" />
      </View>
    );
  }

  return <AppNavigator />;
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0B0F0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
