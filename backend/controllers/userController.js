const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Athlete = require('../models/Athlete');
const Evaluation = require('../models/Evaluation');
const BrandSettings = require('../models/BrandSettings');

const saltRounds = 10;

const claveSecreta = process.env.JWT_SECRET;
// Una sesión de evaluaciones puede durar varias horas; configurable en .env.
const tokenTtl = process.env.JWT_EXPIRES_IN || '12h';

/** Datos públicos del usuario (nunca el hash de la contraseña). */
const publicUser = (user) => ({ _id: user._id, username: user.username, email: user.email });

/** Solo el propio usuario puede ver, editar o eliminar su cuenta. */
const isSelf = (req) => String(req.user.userId) === String(req.params.id);

// Registro de usuarios
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !username || !email || !password) {
            return res.status(400).json({ message: 'Completa usuario, correo y contraseña.' });
        }
        // Validar si ya existe el usuario (usuario y correo son únicos)
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Crear el usuario (el hash se hace automáticamente en el modelo)
        const user = new User({ username, email, password });
        await user.save();

        res.status(201).json({ message: 'Usuario registrado', user: publicUser(user) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Ingresa usuario y contraseña.' });
    }

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
            { expiresIn: tokenTtl }
        );

        // Responde con el token y un mensaje
        res.status(200).json({ message: 'Login exitoso', token, user: publicUser(user) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Solo la propia cuenta (nunca la lista de todos los usuarios): cada
// entrenador únicamente puede verse a sí mismo.
const getUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: req.user.userId }, { password: 0 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
};

// Mostrar un usuario por ID (solo el propio)
const getUserById = async (req, res) => {
    if (!isSelf(req)) {
        return res.status(403).json({ message: 'No tienes permiso para ver este usuario' });
    }
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

// Modificar un usuario (solo el propio)
const updateUser = async (req, res) => {
    if (!isSelf(req)) {
        return res.status(403).json({ message: 'No tienes permiso para modificar este usuario' });
    }
    try {
        const { username, email, password } = req.body;

        // Hashea la nueva contraseña si se proporciona
        const updates = {};
        if (typeof username === 'string' && username) updates.username = username;
        if (typeof email === 'string' && email) updates.email = email;
        if (typeof password === 'string' && password) {
            updates.password = await bcrypt.hash(password, saltRounds);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json({ message: 'Usuario actualizado', user: publicUser(user) });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    }
};

// Eliminar un usuario (solo el propio) junto con todos sus datos.
const deleteUser = async (req, res) => {
    if (!isSelf(req)) {
        return res.status(403).json({ message: 'No tienes permiso para eliminar este usuario' });
    }
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        await Promise.all([
            Athlete.deleteMany({ coachId: user._id }),
            Evaluation.deleteMany({ coachId: user._id }),
            BrandSettings.deleteMany({ coachId: user._id }),
        ]);
        res.status(200).json({ message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el usuario' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
};

