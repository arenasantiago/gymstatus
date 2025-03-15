import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const EditLogScreen = ({ route, navigation }: { route: any; navigation: any }) => {
    const { log } = route.params;
    const [message, setMessage] = useState(log.message);
    const [date, setDate] = useState(log.date);

    // Función para guardar los cambios
    const saveChanges = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/users/users/${log.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, date }),
            });
            if (response.ok) {
                Alert.alert('Éxito', 'Registro modificado correctamente.');
                navigation.goBack();
            } else {
                Alert.alert('Error', 'No se pudo modificar el registro.');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Modificar Registro</Text>

            <TextInput
                style={styles.input}
                placeholder="Mensaje"
                placeholderTextColor="#A3D2A5"
                value={message}
                onChangeText={setMessage}
            />

            <TextInput
                style={styles.input}
                placeholder="Fecha"
                placeholderTextColor="#A3D2A5"
                value={date}
                onChangeText={setDate}
            />

            <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
                <Text style={styles.buttonText}>Guardar Cambios</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        padding: 20,
    },
    title: {
        fontSize: 40,
        fontFamily: 'RubikVinyl-Regular',
        color: '#32FF09',
        marginBottom: 20,
        textAlign: 'center',
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
    saveButton: {
        backgroundColor: '#32FF09',
        paddingVertical: 15,
        paddingHorizontal: 50,
        borderRadius: 30,
        marginTop: 20,
        alignSelf: 'center',
    },
    buttonText: {
        color: '#000000',
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
    },
});

export default EditLogScreen;