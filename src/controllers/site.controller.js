const db = require('../config/db');

exports.getSites = async (req, res) => {
    try {
        const [sitios] = await db.query('SELECT * FROM sitio');
        res.json(sitios);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};