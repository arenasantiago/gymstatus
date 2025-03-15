import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const LoginScreen = ({ navigation }: { navigation: any }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Por favor ingresa tu usuario y contraseña.');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                navigation.navigate('CalculationScreen');
            } else {
                Alert.alert('Error', data.message);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo conectar con el servidor');
        }
    };

    const handleViewLogs = () => {
        navigation.navigate('Logs');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>GymStatus</Text>
            <Text style={styles.subtitle}>Login</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Usuario"
                    placeholderTextColor="#A3D2A5"
                    value={username}
                    onChangeText={setUsername}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#A3D2A5"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Ingresar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logsButton} onPress={handleViewLogs}>
                <Text style={styles.logsButtonText}>Ver registro</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 50,
        fontFamily: 'RubikVinyl-Regular',
        color: '#32FF09',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 24,
        fontFamily: 'Inter-Regular',
        color: '#FFFFFF',
        marginBottom: 30,
    },
    inputContainer: {
        width: '100%',
        backgroundColor: '#468A34',
        borderRadius: 10,
        padding: 20,
        marginBottom: 30,
    },
    input: {
        backgroundColor: '#2E6626',
        borderRadius: 5,
        color: '#FFFFFF',
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
    },
    loginButton: {
        backgroundColor: '#32FF09',
        paddingVertical: 15,
        paddingHorizontal: 50,
        borderRadius: 30,
        marginBottom: 15,
    },
    loginButtonText: {
        color: '#000000',
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
    },
    logsButton: {
        backgroundColor: '#468A34',
        paddingVertical: 10,
        paddingHorizontal: 40,
        borderRadius: 30,
    },
    logsButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        textAlign: 'center',
    },
});

export default LoginScreen;