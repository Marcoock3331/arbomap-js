const db = require('../config/db');

exports.getAllCampaigns = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.id_propuesta, p.nombre_propuesta, p.cantidad_meta,
            r.id_reforestacion, r.estado, r.cantidad_plantada, s.nombre_zona
            FROM propuesta_reforestacion p
            LEFT JOIN reforestacion r ON p.id_propuesta = r.id_propuesta
            LEFT JOIN sitio s ON r.id_sitio = s.id_sitio
        `);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.getActiveCampaigns = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT p.nombre_propuesta, r.id_reforestacion FROM reforestacion r JOIN propuesta_reforestacion p ON r.id_propuesta = p.id_propuesta WHERE r.estado IN ("En curso", "Completada")');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.getCampaignById = async (req, res) => {
    try {
        const [camp] = await db.query('SELECT p.nombre_propuesta, p.cantidad_meta, r.*, s.nombre_zona FROM reforestacion r JOIN propuesta_reforestacion p ON r.id_propuesta = p.id_propuesta LEFT JOIN sitio s ON r.id_sitio = s.id_sitio WHERE r.id_reforestacion = ?', [req.params.id]);
        if(camp.length === 0) return res.status(404).json({ error: 'Campaña no encontrada' });

        // OPTIMIZACIÓN SQL: Window function en lugar de LIMIT 1 en SELECT
        const [arboles] = await db.query(`
            SELECT a.*, e.nombre_comun, e.nombre_cientifico, seg.estado_salud as estado_actual 
            FROM arbol a 
            JOIN especie e ON a.id_especie = e.id_especie 
            LEFT JOIN (
                SELECT id_arbol, estado_salud,
                       ROW_NUMBER() OVER(PARTITION BY id_arbol ORDER BY fecha_revision DESC) as rn
                FROM seguimiento
            ) seg ON a.id_arbol = seg.id_arbol AND seg.rn = 1
            WHERE a.id_reforestacion = ?
        `, [req.params.id]);
        
        res.json({ campana: camp[0], arboles });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.createProposal = async (req, res) => {
    try {
        const { nombre_propuesta, cantidad_meta } = req.body;
        await db.query('INSERT INTO propuesta_reforestacion (nombre_propuesta, cantidad_meta, fecha_solicitud) VALUES (?, ?, CURDATE())', [nombre_propuesta, cantidad_meta]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
};

exports.approveCampaign = async (req, res) => {
    try {
        const { id_sitio, fecha_evento, cantidad_esperada } = req.body;
        await db.query('UPDATE propuesta_reforestacion SET estatus = "Aprobada" WHERE id_propuesta = ?', [req.params.id]);
        await db.query('INSERT INTO reforestacion (id_propuesta, id_sitio, fecha_evento, cantidad_esperada, estado) VALUES (?, ?, ?, ?, "En curso")', [req.params.id, id_sitio, fecha_evento, cantidad_esperada]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const { nombre_propuesta, cantidad_meta, id_sitio, fecha_evento } = req.body;
        const [camp] = await db.query('SELECT id_propuesta FROM reforestacion WHERE id_reforestacion = ?', [req.params.id]);
        if(camp.length > 0) {
            await db.query('UPDATE propuesta_reforestacion SET nombre_propuesta = ?, cantidad_meta = ? WHERE id_propuesta = ?', [nombre_propuesta, cantidad_meta, camp[0].id_propuesta]);
            await db.query('UPDATE reforestacion SET id_sitio = ?, fecha_evento = ? WHERE id_reforestacion = ?', [id_sitio, fecha_evento || null, req.params.id]);
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        await db.query('UPDATE arbol SET id_reforestacion = NULL WHERE id_reforestacion = ?', [req.params.id]);
        await db.query('DELETE FROM reforestacion WHERE id_reforestacion = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
};