import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../components/LoginScreen';
import CalculationScreen from '../components/CalculationScreen';
import LogsScreen from '../components/LogsScreen';
import ResultsScreen from '../components/ResultsScreen';
import EditLogScreen from '../components/EditLogScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                id={undefined}
                initialRouteName="Login"
                screenOptions={{ headerShown: false }}
            >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="CalculationScreen" component={CalculationScreen} />
                <Stack.Screen name="Logs" component={LogsScreen} />
                <Stack.Screen name="Results" component={ResultsScreen} />
                <Stack.Screen name="EditLog" component={EditLogScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
