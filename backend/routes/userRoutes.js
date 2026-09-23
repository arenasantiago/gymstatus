const express = require('express');
const {
    registerUser,
    loginUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    createRecord,
    getRecords,
    updateRecord,
    deleteRecord,
} = require('../controllers/userController');

const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Rutas públicas
router.post('/register', registerUser);
router.post('/login', loginUser);

// Registros de salud (requieren autenticación)
router.post('/records', authMiddleware, createRecord);
router.get('/records', authMiddleware, getRecords);
router.put('/records/:id', authMiddleware, updateRecord);
router.delete('/records/:id', authMiddleware, deleteRecord);

// Gestión de usuarios (requieren autenticación)
router.get('/users', authMiddleware, getUsers);
router.get('/users/:id', authMiddleware, getUserById);
router.put('/users/:id', authMiddleware, updateUser);
router.delete('/users/:id', authMiddleware, deleteUser);

module.exports = router;
