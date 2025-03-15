import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Picker } from 'react-native';
import ResultsScreen from '../components/ResultsScreen'; // Componente para mostrar resultados

const CalculationScreen = ({ navigation }: { navigation: any }) => {
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [waist, setWaist] = useState('');
    const [hip, setHip] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('male');
    const [name, setName] = useState('');
    const [idNumber, setIdNumber] = useState('');

    const calculateResults = () => {
        if (!weight || !height || !waist || !hip || !age || !name || !idNumber) {
            Alert.alert('Error', 'Por favor ingresa todos los valores requeridos.');
            return;
        }

        const weightInKg = parseFloat(weight);
        const heightInM = parseFloat(height) / 100;
        const waistInCm = parseFloat(waist);
        const hipInCm = parseFloat(hip);
        const ageInYears = parseInt(age);

        if (isNaN(weightInKg) || isNaN(heightInM) || isNaN(waistInCm) || isNaN(hipInCm) || isNaN(ageInYears)) {
            Alert.alert('Error', 'Por favor ingresa valores válidos.');
            return;
        }

        // Calcular IMC
        const bmi = (weightInKg / (heightInM * heightInM)).toFixed(2);

        // Calcular ICC
        const icc = (waistInCm / hipInCm).toFixed(2);

        // Navegar a la pantalla de resultados con todos los datos
        navigation.navigate('Results', {
            bmi,
            icc,
            gender,
            age: ageInYears,
            name,
            idNumber,
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Calculadora de Salud</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: Juan Pérez"
                    placeholderTextColor="#A3D2A5"
                    value={name}
                    onChangeText={setName}
                />

                <Text style={styles.label}>Cédula</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: 123456789"
                    placeholderTextColor="#A3D2A5"
                    keyboardType="numeric"
                    value={idNumber}
                    onChangeText={setIdNumber}
                />

                <Text style={styles.label}>Peso (kg)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: 70"
                    placeholderTextColor="#A3D2A5"
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                />

                <Text style={styles.label}>Altura (cm)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: 175"
                    placeholderTextColor="#A3D2A5"
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                />

                <Text style={styles.label}>Cintura (cm)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: 80"
                    placeholderTextColor="#A3D2A5"
                    keyboardType="numeric"
                    value={waist}
                    onChangeText={setWaist}
                />

                <Text style={styles.label}>Cadera (cm)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: 95"
                    placeholderTextColor="#A3D2A5"
                    keyboardType="numeric"
                    value={hip}
                    onChangeText={setHip}
                />

                <Text style={styles.label}>Edad</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: 30"
                    placeholderTextColor="#A3D2A5"
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                />

                <Text style={styles.label}>Género</Text>
                <Picker
                    selectedValue={gender}
                    style={styles.picker}
                    onValueChange={(itemValue) => setGender(itemValue)}
                >
                    <Picker.Item label="Hombre" value="male" />
                    <Picker.Item label="Mujer" value="female" />
                </Picker>
            </View>

            <TouchableOpacity style={styles.button} onPress={calculateResults}>
                <Text style={styles.buttonText}>Calcular</Text>
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
    inputContainer: {
        width: '100%',
        backgroundColor: '#468A34',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
    },
    label: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        marginBottom: 5,
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
    picker: {
        backgroundColor: '#2E6626',
        borderRadius: 5,
        color: '#FFFFFF',
        marginBottom: 15,
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

export default CalculationScreen;