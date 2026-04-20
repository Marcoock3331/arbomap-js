const express = require('express');
const router = express.Router();
const treeController = require('../controllers/tree.controller');
const upload = require('../middleware/upload');

// Importamos el nuevo candado de Administrador
const { isAdmin } = require('../middleware/auth');

// Rutas de lectura y acciones permitidas para todos los usuarios logueados
router.get('/stats', treeController.getStats);
router.get('/:id', treeController.getTreeById);
router.get('/tag/:codigo', treeController.getTreeByTag);

// Rutas de Padrinos
router.post('/:id/adopt', treeController.adoptTree);
router.post('/:id/release', treeController.releaseTree);

// Rutas CRÍTICAS: Solo el Administrador puede ejecutarlas
router.post('/', isAdmin, upload.single('foto'), treeController.createTree);
router.put('/:id', isAdmin, treeController.updateTree);
router.delete('/:id', isAdmin, treeController.deleteTree);

module.exports = router;