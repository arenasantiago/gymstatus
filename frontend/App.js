import React, { useState, useEffect } from 'react';
import * as Font from 'expo-font';
import LoginScreen from './components/LoginScreen';
import AppNavigator from './Navigation/AppNavigator'

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const loadFonts = async () => {
    await Font.loadAsync({
      'RubikVinyl-Regular': require('../assets/fonts/RubikVinyl-Regular.ttf')
    });
  };

  useEffect(() => {
    loadFonts()
        .then(() => setFontsLoaded(true))
        .catch((err) => console.error('Error cargando fuentes:', err));
  }, []);

  return <AppNavigator />;
};

export default App;
