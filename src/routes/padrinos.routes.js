const express = require('express');
const router = express.Router();
const padrinosController = require('../controllers/padrinos.controller');
const { verifyToken } = require('../middleware/auth'); 
const db = require('../config/db');

//TODAS las rutas de este archivo requieren iniciar sesión 
router.use(verifyToken);

// Rutas de gestión de alumnos (Solo Admin)
router.get('/directorio', padrinosController.getDirectorioPadrinos);
router.delete('/egresar/:id', padrinosController.egresarPadrino);
router.get('/:id/arboles', padrinosController.getArbolesPorPadrino);

// EL CANDADO DEL BUZÓN
router.get('/buzon', async (req, res) => {
    try {
        //¿Es realmente el Admin (Rol 1)?
        if (req.user.rol !== 1) {
            return res.status(403).json({ 
                success: false, 
                message: 'Acceso denegado. Solo el administrador principal puede leer el buzón.' 
            });
        }

        const [rows] = await db.query('SELECT * FROM buzon ORDER BY id_buzon DESC');
        res.json(rows);
    } catch (e) {
        console.error("Error de seguridad en buzón:", e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ELIMINAR MENSAJE DEL BUZÓN
router.delete('/buzon/:id', async (req, res) => {
    try {
        // Doble validación de seguridad
        if (req.user.rol !== 1) {
            return res.status(403).json({ success: false, message: 'Acceso denegado.' });
        }
        
        const db = require('../config/db');
        await db.query('DELETE FROM buzon WHERE id_buzon = ?', [req.params.id]);
        res.json({ success: true, message: 'Mensaje eliminado' });
    } catch (e) {
        console.error("Error al eliminar mensaje:", e);
        res.status(500).json({ error: 'Error al eliminar el mensaje' });
    }
});

module.exports = router;