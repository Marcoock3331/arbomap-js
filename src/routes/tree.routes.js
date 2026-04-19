const express = require('express');
const router = express.Router();
const treeController = require('../controllers/tree.controller');
const upload = require('../middleware/upload');

router.get('/stats', treeController.getStats);
router.post('/', upload.single('foto'), treeController.createTree);
router.get('/:id', treeController.getTreeById);
router.put('/:id', treeController.updateTree);
router.delete('/:id', treeController.deleteTree);
router.get('/tag/:codigo', treeController.getTreeByTag);
router.post('/:id/adopt', treeController.adoptTree);

module.exports = router;