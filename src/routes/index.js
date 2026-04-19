const express = require('express');
const router = express.Router();

// 1. Importamos a nuestro "cadenero" (Middleware de Seguridad)
const { verifyToken } = require('../middleware/auth');

const authRoutes = require('./auth.routes');
const treeRoutes = require('./tree.routes');
const trackingRoutes = require('./tracking.routes');
const userRoutes = require('./user.routes');
const campaignRoutes = require('./campaign.routes');
const siteRoutes = require('./site.routes');

// ==========================================
// RUTAS PÚBLICAS (No requieren Gafete)
// ==========================================
// El login y registro deben estar abiertos para que la gente pueda entrar
router.use('/auth', authRoutes);

// ==========================================
// RUTAS PRIVADAS (Protegidas por verifyToken)
// ==========================================
// Si la petición no trae un JWT válido, verifyToken la rebota con un error 401/403
// y nunca llega a ejecutar los controladores.
router.use('/trees', verifyToken, treeRoutes);
router.use('/tracking', verifyToken, trackingRoutes);
router.use('/users', verifyToken, userRoutes);
router.use('/campaigns', verifyToken, campaignRoutes);
router.use('/sites', verifyToken, siteRoutes);

module.exports = router;