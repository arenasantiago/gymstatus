import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../components/LoginScreen';
import CalculationScreen from '../components/CalculationScreen';
import LogsScreen from '../components/LogsScreen';
import ResultsScreen from '../components/ResultsScreen';
import EditLogScreen from "../components/EditLogScreen";

const Stack = createStackNavigator();

const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="CalculationScreen"
                    component={CalculationScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Logs"
                    component={LogsScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Results"
                    component={ResultsScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="EditLog"
                    component={EditLogScreen}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;