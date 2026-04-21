const db = require('../config/db');

exports.getAllCampaigns = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.id_propuesta, p.nombre_propuesta, p.cantidad_meta,
            r.id_reforestacion, r.estado, r.cantidad_plantada, s.nombre_zona,
            r.fecha_evento, r.punto_reunion, r.cupo_maximo,
            (SELECT COUNT(*) FROM reforestacion_voluntarios rv WHERE rv.id_reforestacion = r.id_reforestacion) as inscritos
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

// MODIFICADO: Ahora el admin puede definir punto de reunión y cupo al aprobar
exports.approveCampaign = async (req, res) => {
    try {
        const { id_sitio, fecha_evento, cantidad_esperada, punto_reunion, cupo_maximo } = req.body;
        await db.query('UPDATE propuesta_reforestacion SET estatus = "Aprobada" WHERE id_propuesta = ?', [req.params.id]);
        await db.query(
            'INSERT INTO reforestacion (id_propuesta, id_sitio, fecha_evento, cantidad_esperada, punto_reunion, cupo_maximo, estado) VALUES (?, ?, ?, ?, ?, ?, "En curso")', 
            [req.params.id, id_sitio, fecha_evento, cantidad_esperada, punto_reunion || 'Por definir', cupo_maximo || 20]
        );
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

exports.deleteProposal = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM propuesta_reforestacion WHERE id_propuesta = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Propuesta no encontrada.' });
        res.json({ success: true, message: 'Propuesta eliminada.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno al eliminar.' });
    }
};


// Voluntario se une a la campaña
exports.joinCampaign = async (req, res) => {
    try {
        const id_reforestacion = req.params.id;
        const id_usuario = req.user.id_usuario;

        const [[campana]] = await db.query('SELECT cupo_maximo FROM reforestacion WHERE id_reforestacion = ?', [id_reforestacion]);
        if (!campana) return res.status(404).json({ message: 'Campaña activa no encontrada.' });

        const [[inscritos]] = await db.query('SELECT COUNT(*) as total FROM reforestacion_voluntarios WHERE id_reforestacion = ?', [id_reforestacion]);

        if (inscritos.total >= campana.cupo_maximo) {
            return res.status(400).json({ message: 'Lo sentimos, el cupo para este evento ya está lleno.' });
        }

        await db.query('INSERT INTO reforestacion_voluntarios (id_reforestacion, id_usuario) VALUES (?, ?)', [id_reforestacion, id_usuario]);
        res.json({ success: true, message: '¡Te has unido exitosamente!' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ya estás inscrito en este evento.' });
        res.status(500).json({ error: 'Error al procesar la inscripción.' });
    }
};

// Admin ve quién se inscribi
exports.getVolunteers = async (req, res) => {
    try {
        const [voluntarios] = await db.query(`
            SELECT 
                rv.id_registro, 
                rv.asistio, 
                u.nombre_completo, 
                u.matricula
            FROM reforestacion_voluntarios rv
            JOIN usuario u ON rv.id_usuario = u.id_usuario
            WHERE rv.id_reforestacion = ?
        `, [req.params.id]);

        res.json(voluntarios);

    } catch (e) {
        console.error("Error SQL en getVolunteers:", e); 
        res.status(500).json({ error: 'Error al obtener voluntarios' });
    }
};

// Admin marca asistencia
exports.checkInVolunteer = async (req, res) => {
    try {
        if (req.user.rol !== 1) return res.status(403).json({ message: 'Solo admin puede pasar lista.' });
        
        const { asistio } = req.body;
        await db.query('UPDATE reforestacion_voluntarios SET asistio = ? WHERE id_registro = ?', [asistio, req.params.idRegistro]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar asistencia.' });
    }
};