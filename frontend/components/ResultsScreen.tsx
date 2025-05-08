import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://172.17.0.127:5000/api'; // IP de tu computadora

const ResultsScreen = ({ route, navigation }: { route: any; navigation: any }) => {
    const { bmi, icc, gender, age, name, idNumber } = route.params;
    const [isSaved, setIsSaved] = useState(false);

    const getBMICategory = (bmi: number) => {
        if (bmi < 18.5) return 'Bajo';
        if (bmi >= 18.5 && bmi <= 24.9) return 'Normal';
        if (bmi >= 25.0 && bmi <= 29.9) return 'Sobrepeso';
        if (bmi >= 30.0 && bmi <= 34.9) return 'Obesidad I';
        if (bmi >= 35.0 && bmi <= 39.9) return 'Obesidad II';
        return 'Obesidad III';
    };

    const getICCRisk = (icc: number, gender: string, age: number) => {
        const ranges = gender === 'male' ? maleRanges : femaleRanges;
        const ageGroup = Object.keys(ranges).find((key) => {
            const [min, max] = key.split('-').map(Number);
            return age >= min && age <= max;
        });

        if (!ageGroup) return 'Desconocido';

        const [low, moderate, high, veryHigh] = ranges[ageGroup];
        if (icc < low) return 'Bajo';
        if (icc >= low && icc < moderate) return 'Moderado';
        if (icc >= moderate && icc < high) return 'Alto';
        return 'Muy Alto';
    };

    const maleRanges = {
        '18-29': [0.83, 0.88, 0.94],
        '30-39': [0.84, 0.91, 0.96],
        '40-49': [0.88, 0.95, 1.0],
        '50-59': [0.9, 0.96, 1.02],
        '60-70': [0.91, 0.98, 1.03],
        '70+': [0.92, 0.99, 1.04],
    };

    const femaleRanges = {
        '18-29': [0.71, 0.77, 0.82],
        '30-39': [0.72, 0.78, 0.84],
        '40-49': [0.73, 0.79, 0.87],
        '50-59': [0.74, 0.81, 0.88],
        '60-70': [0.76, 0.83, 0.9],
        '70+': [0.77, 0.84, 0.92],
    };

    const saveRecord = async () => {
        try {
            // Obtener el token del almacenamiento local
            const token = await AsyncStorage.getItem('userToken');
            
            if (!token) {
                Alert.alert('Error', 'Debes iniciar sesión para guardar registros');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`${API_URL}/users/records`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    idNumber,
                    bmi,
                    icc,
                    gender,
                    age,
                }),
            });

            if (response.ok) {
                Alert.alert('Éxito', 'Registro guardado correctamente.');
                setIsSaved(true);
            } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.message || 'No se pudo guardar el registro.');
            }
        } catch (error) {
            console.error('Error al guardar:', error);
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        }
    };

    const downloadExcel = async () => {
        const data = `Nombre,Cédula,BMI,ICC\n${name},${idNumber},${bmi},${icc}`;
        const fileUri = FileSystem.documentDirectory + 'results.csv';
        await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Resultados</Text>

            <View style={styles.resultContainer}>
                <Text style={styles.resultText}>Nombre: {name}</Text>
                <Text style={styles.resultText}>Cédula: {idNumber}</Text>
                <Text style={styles.resultText}>IMC: {bmi} ({getBMICategory(bmi)})</Text>
                <Text style={styles.resultText}>ICC: {icc} ({getICCRisk(icc, gender, age)})</Text>
            </View>

            {!isSaved && (
                <TouchableOpacity style={styles.button} onPress={saveRecord}>
                    <Text style={styles.buttonText}>Guardar Registro</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.button} onPress={downloadExcel}>
                <Text style={styles.buttonText}>Descargar en Excel</Text>
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
        fontSize: 40,
        fontFamily: 'RubikVinyl-Regular',
        color: '#32FF09',
        marginBottom: 20,
    },
    resultContainer: {
        backgroundColor: '#468A34',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
    },
    resultText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Inter-Regular',
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#32FF09',
        paddingVertical: 15,
        paddingHorizontal: 50,
        borderRadius: 30,
        marginBottom: 15,
    },
    buttonText: {
        color: '#000000',
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
    },
});

export default ResultsScreen;