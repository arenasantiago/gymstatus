const express = require('express');
const {
    registerUser,
    loginUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
} = require('../controllers/userController');

const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Autenticación (públicas)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Cuenta propia (requieren sesión; cada usuario solo se ve y gestiona a sí mismo)
router.get('/users', authMiddleware, getUsers);
router.get('/users/:id', authMiddleware, getUserById);
router.put('/users/:id', authMiddleware, updateUser);
router.delete('/users/:id', authMiddleware, deleteUser);

module.exports = router;
