const db = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as t FROM arbol');
        const [esp] = await db.query('SELECT COUNT(*) as t FROM especie');
        
        // OPTIMIZACIÓN: Window Function para evitar N+1 queries
        const [mapa] = await db.query(`
            SELECT a.*, e.nombre_comun, e.nombre_cientifico, s.nombre_zona, 
                   seg.estado_salud as estado, seg.foto_url as foto_actual
            FROM arbol a
            JOIN especie e ON a.id_especie = e.id_especie
            LEFT JOIN sitio s ON a.id_sitio = s.id_sitio
            LEFT JOIN (
                SELECT id_arbol, estado_salud, foto_url,
                       ROW_NUMBER() OVER(PARTITION BY id_arbol ORDER BY fecha_revision DESC) as rn
                FROM seguimiento
            ) seg ON a.id_arbol = seg.id_arbol AND seg.rn = 1
        `);
        
        const totalSanos = mapa.filter(a => a.estado === 'Bueno').length;
        res.json({ totalArboles: total[0].t, totalEspecies: esp[0].t, totalSanos, arboles: mapa });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.createTree = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { codigo_etiqueta, latitud, longitud, nombre_comun, nombre_cientifico, descripcion, estado_salud, id_reforestacion, id_usuario } = req.body;

        const [esp] = await conn.query('SELECT id_especie FROM especie WHERE nombre_comun = ?', [nombre_comun]);
        const id_esp = esp.length > 0 ? esp[0].id_especie : (await conn.query('INSERT INTO especie (nombre_comun, nombre_cientifico, descripcion) VALUES (?,?,?)', [nombre_comun, nombre_cientifico, descripcion]))[0].insertId;

        const ref_id = id_reforestacion ? id_reforestacion : null;

        const [result] = await conn.query('INSERT INTO arbol (codigo_etiqueta, latitud, longitud, fecha_plantado, id_especie, id_reforestacion) VALUES (?,?,?,CURDATE(),?,?)', [codigo_etiqueta, latitud, longitud, id_esp, ref_id]);
        
        await conn.query('INSERT INTO seguimiento (estado_salud, comentarios, foto_url, id_arbol, id_usuario) VALUES (?, ?, ?, ?, ?)', [estado_salud, 'Registro inicial', req.file ? req.file.filename : null, result.insertId, id_usuario || 1]);

        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        console.error(e);
        res.status(500).json({ success: false, message: 'Error al registrar árbol' });
    } finally {
        conn.release();
    }
};

exports.getTreeById = async (req, res) => {
    try {
        const [arbol] = await db.query('SELECT a.*, e.nombre_comun, e.nombre_cientifico, e.descripcion FROM arbol a JOIN especie e ON a.id_especie = e.id_especie WHERE a.id_arbol = ?', [req.params.id]);
        res.json(arbol[0] || {});
    } catch (e) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.updateTree = async (req, res) => {
    try {
        const { codigo_etiqueta, latitud, longitud, nombre_comun, nombre_cientifico, descripcion, estado_salud, id_sitio } = req.body;
        
        const [esp] = await db.query('SELECT id_especie FROM especie WHERE nombre_comun = ?', [nombre_comun]);
        let id_esp;
        
        if (esp.length > 0) {
            id_esp = esp[0].id_especie;
            await db.query('UPDATE especie SET nombre_comun = ?, nombre_cientifico = ?, descripcion = ? WHERE id_especie = ?', [nombre_comun, nombre_cientifico, descripcion, id_esp]);
        } else {
            id_esp = (await db.query('INSERT INTO especie (nombre_comun, nombre_cientifico, descripcion) VALUES (?,?,?)', [nombre_comun, nombre_cientifico, descripcion]))[0].insertId;
        }

        const sitioVal = (id_sitio && id_sitio.toString().trim() !== '') ? parseInt(id_sitio) : null;

        await db.query('UPDATE arbol SET codigo_etiqueta = ?, latitud = ?, longitud = ?, id_especie = ?, id_sitio = ? WHERE id_arbol = ?', [codigo_etiqueta, latitud, longitud, id_esp, sitioVal, req.params.id]);
        
        if(estado_salud) {
            await db.query('INSERT INTO seguimiento (estado_salud, comentarios, id_arbol) VALUES (?, ?, ?)', [estado_salud, 'Actualización general de inventario', req.params.id]);
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
};

exports.deleteTree = async (req, res) => {
    try {
        await db.query('DELETE FROM seguimiento WHERE id_arbol = ?', [req.params.id]);
        await db.query('DELETE FROM arbol_cuidador WHERE id_arbol = ?', [req.params.id]);
        await db.query('DELETE FROM arbol WHERE id_arbol = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
};

exports.getTreeByTag = async (req, res) => {
    try {
        const [arbol] = await db.query(`
            SELECT a.*, e.nombre_comun, e.nombre_cientifico, e.descripcion, s.nombre_zona
            FROM arbol a
            JOIN especie e ON a.id_especie = e.id_especie
            LEFT JOIN sitio s ON a.id_sitio = s.id_sitio
            WHERE a.codigo_etiqueta = ?
        `, [req.params.codigo]);

        if (arbol.length === 0) return res.status(404).json({ error: 'No encontrado' });

        const [historial] = await db.query('SELECT s.*, u.nombre_completo as usuario_nombre FROM seguimiento s LEFT JOIN usuario u ON s.id_usuario = u.id_usuario WHERE s.id_arbol = ? ORDER BY fecha_revision DESC', [arbol[0].id_arbol]);
        res.json({ arbol: arbol[0], historial });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.adoptTree = async (req, res) => {
    try {
        const { id_usuario } = req.body;
        await db.query('INSERT INTO arbol_cuidador (id_arbol, id_usuario, fecha_asignacion) VALUES (?, ?, CURDATE())', [req.params.id, id_usuario]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
};