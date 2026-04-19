const db = require('../config/db');

exports.createTracking = async (req, res) => {
    try {
        const { id_arbol, estado_salud, comentarios, id_usuario } = req.body;
        await db.query('INSERT INTO seguimiento (fecha_revision, estado_salud, comentarios, foto_url, id_arbol, id_usuario) VALUES (NOW(), ?, ?, ?, ?, ?)', [estado_salud, comentarios, req.file ? req.file.filename : null, id_arbol, id_usuario || 1]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.updateTracking = async (req, res) => {
    try {
        const { estado_salud, comentarios } = req.body;
        await db.query('UPDATE seguimiento SET estado_salud = ?, comentarios = ? WHERE id_seguimiento = ?', [estado_salud, comentarios, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.deleteTracking = async (req, res) => {
    try {
        await db.query('DELETE FROM seguimiento WHERE id_seguimiento = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};