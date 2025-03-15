import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';

const LogsScreen = ({ navigation }: { navigation: any }) => {
    const [logs, setLogs] = useState([]);

    // Función para obtener los registros desde la base de datos
    const fetchLogs = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/users/users');
            const data = await response.json();
            if (response.ok) {
                setLogs(data);
            } else {
                Alert.alert('Error', 'No se pudieron cargar los registros.');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        }
    };

    // Función para eliminar un registro
    const deleteLog = async (id: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/users/users/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                Alert.alert('Éxito', 'Registro eliminado correctamente.');
                fetchLogs(); // Recargar la lista de registros
            } else {
                Alert.alert('Error', 'No se pudo eliminar el registro.');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        }
    };

    // Función para navegar a la pantalla de modificación
    const navigateToEditLog = (log: any) => {
        navigation.navigate('EditLog', { log });
    };

    // Cargar los registros al montar el componente
    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Registros</Text>

            <FlatList
                data={logs}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.logItem}>
                        <Text style={styles.logMessage}>{item.username}</Text>
                        <Text style={styles.logDate}>{item.email}</Text>
                        <View style={styles.buttonsContainer}>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => navigateToEditLog(item)}
                            >
                                <Text style={styles.buttonText}>Modificar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => deleteLog(item.id)}
                            >
                                <Text style={styles.buttonText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.buttonText}>Volver</Text>
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
    logItem: {
        backgroundColor: '#2E6626',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    logMessage: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-Regular',
    },
    logDate: {
        color: '#A3D2A5',
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        marginTop: 5,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    editButton: {
        backgroundColor: '#32FF09',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    deleteButton: {
        backgroundColor: '#FF0000',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    backButton: {
        backgroundColor: '#32FF09',
        paddingVertical: 15,
        paddingHorizontal: 50,
        borderRadius: 30,
        marginTop: 20,
        alignSelf: 'center',
    },
    buttonText: {
        color: '#000000',
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
    },
});

export default LogsScreen;