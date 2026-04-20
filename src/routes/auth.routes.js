const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Middleware interno para revisar si express-validator encontró errores
const validarCampos = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Por favor, completa todos los campos correctamente.', errores: errores.array() });
    }
    next();
};

// Rutas con validaciones estrictas inyectadas
router.post('/login', [
    body('matricula').notEmpty().withMessage('La matrícula es obligatoria').trim(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
    validarCampos
], authController.login);

router.post('/register', [
    body('nombre_completo').notEmpty().withMessage('El nombre es obligatorio').trim(),
    body('matricula').isLength({ min: 5 }).withMessage('La matrícula debe tener al menos 5 caracteres').trim(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    validarCampos
], authController.register);

module.exports = router;