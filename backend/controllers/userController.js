const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Record = require('../models/Record');

const saltRounds = 10;

const claveSecreta = process.env.JWT_SECRET;

// Registro de usuarios
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Validar si ya existe el usuario
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Crear el usuario (el hash se hace automáticamente en el modelo)
        const user = new User({ username, email, password });
        await user.save();

        res.status(201).json({ message: 'Usuario registrado', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    // Verifica si el usuario existe
    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        // Compara la contraseña con la almacenada en la base de datos
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        // Crea un token JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            claveSecreta, // Asegúrate de tener una clave secreta en tus variables de entorno
            { expiresIn: '1h' } // El token expirará en 1 hora
        );

        // Responde con el token y un mensaje
        res.status(200).json({ message: 'Login exitoso', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Mostrar todos los usuarios
const getUsers = async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // Excluye las contraseñas
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
};

// Mostrar un usuario por ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id, { password: 0 }); // Excluye la contraseña
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el usuario' });
    }
};

// Modificar un usuario
const updateUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Hashea la nueva contraseña si se proporciona
        const updates = { username, email };
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Usuario actualizado', user });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    }
};

// Eliminar un usuario
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json({ message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el usuario' });
    }
};

// Guardar un registro asociado al usuario logueado
const createRecord = async (req, res) => {
    try {
        const { name, idNumber, bmi, icc, gender, age } = req.body;

        // Obtener el ID del usuario del token (middleware ya lo inyectó)
        const userId = req.user.userId;

        // Crear el registro
        const record = await Record.create({
            name,
            idNumber,
            bmi,
            icc,
            gender,
            age,
            userId // Asociar al usuario
        });

        res.status(201).json({ message: "Registro guardado", record });

    } catch (error) {
        res.status(500).json({ message: "Error al guardar el registro", error: error.message });
    }
};



module.exports = {
    registerUser,
    loginUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    createRecord,
};
