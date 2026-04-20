const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload'); 

router.get('/:id/profile', verifyToken, userController.getProfile);

//Subida de foto de perfil
router.post('/:id/photo', verifyToken, upload.single('foto'), userController.uploadProfilePhoto);

module.exports = router;