// UBICACIÓN: ARBOMAPjs/server.js 
const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const db = require('./src/config/db'); // Importamos la conexión a MySQL

const app = express();
const PORT = 3000;

// Configuración básica
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Servir HTML/CSS/JS

// CONFIGURACIÓN DE MULTER PARA SUBIR FOTOS 
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + Math.round(Math.random() * 1E9);
        cb(null, 'arbol_' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// ==========================================
// RUTAS API - INVENTARIO Y MAPA
// ==========================================

// RUTA 1: DATOS DEL DASHBOARD Y TABLA
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [arbolesResult] = await db.query('SELECT COUNT(*) as total FROM arbol');
        const [especiesResult] = await db.query('SELECT COUNT(*) as total FROM especie');
        const [sanosResult] = await db.query(`
            SELECT COUNT(*) as total FROM (
                SELECT estado_salud FROM seguimiento s1
                WHERE fecha_revision = (
                    SELECT MAX(fecha_revision) FROM seguimiento s2 WHERE s2.id_arbol = s1.id_arbol
                )
            ) as ultimos_reportes WHERE estado_salud = 'Bueno'
        `);
        const [mapaResult] = await db.query(`
            SELECT 
                a.codigo_etiqueta, 
                a.latitud, 
                a.longitud, 
                e.nombre_comun,
                (SELECT estado_salud FROM seguimiento WHERE id_arbol = a.id_arbol ORDER BY fecha_revision DESC LIMIT 1) as estado,
                (SELECT foto_url FROM seguimiento WHERE id_arbol = a.id_arbol ORDER BY fecha_revision DESC LIMIT 1) as foto_actual,
                (SELECT nombre_zona FROM sitio WHERE id_sitio = a.id_sitio) as nombre_zona,
                e.nombre_cientifico
            FROM arbol a
            JOIN especie e ON a.id_especie = e.id_especie
        `);

        res.json({
            totalArboles: arbolesResult[0].total,
            totalEspecies: especiesResult[0].total,
            totalSanos: sanosResult[0].total,
            arboles: mapaResult
        });

    } catch (error) {
        console.error("Error en la API:", error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

// RUTA 2: OBTENER ZONAS (SITIOS) 
app.get('/api/sitios', async (req, res) => {
    try {
        const [sitios] = await db.query('SELECT * FROM sitio');
        res.json(sitios);
    } catch (error) {
        console.error("Error obteniendo sitios:", error);
        res.status(500).json({ error: 'Error al obtener las zonas' });
    }
});

// RUTA 3: GUARDAR NUEVO ÁRBOL (POST) 
app.post('/api/arboles', upload.single('foto'), async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        let { codigo, latitud, longitud, id_sitio, estado, nombre_comun, nombre_cientifico } = req.body;
        let fotoUrl = req.file ? req.file.filename : null;
        let fecha = new Date().toISOString().slice(0, 10); 

        nombre_cientifico = nombre_cientifico || "No registrado";

        let id_especie;
        const [especieExistente] = await connection.query('SELECT id_especie FROM especie WHERE nombre_comun = ? LIMIT 1', [nombre_comun]);
        
        if (especieExistente.length > 0) {
            id_especie = especieExistente[0].id_especie;
        } else {
            const [nuevaEspecie] = await connection.query('INSERT INTO especie (nombre_comun, nombre_cientifico) VALUES (?, ?)', [nombre_comun, nombre_cientifico]);
            id_especie = nuevaEspecie.insertId;
        }

        const [arbolExistente] = await connection.query('SELECT id_arbol FROM arbol WHERE codigo_etiqueta = ?', [codigo]);
        if (arbolExistente.length > 0) {
            throw new Error(`La etiqueta '${codigo}' ya existe. Usa una diferente.`);
        }

        const [nuevoArbol] = await connection.query(
            'INSERT INTO arbol (codigo_etiqueta, latitud, longitud, fecha_plantado, id_especie, id_sitio) VALUES (?, ?, ?, ?, ?, ?)',
            [codigo, latitud, longitud, fecha, id_especie, id_sitio]
        );
        let id_arbol_nuevo = nuevoArbol.insertId;

        await connection.query(
            'INSERT INTO seguimiento (fecha_revision, estado_salud, foto_url, comentarios, id_arbol, id_usuario) VALUES (NOW(), ?, ?, ?, ?, ?)',
            [estado, fotoUrl, 'Registro inicial', id_arbol_nuevo, 1] 
        );

        await connection.commit();
        res.json({ success: true, message: '¡Árbol registrado con éxito!' });

    } catch (error) {
        await connection.rollback();
        console.error("Error al guardar:", error);
        if (req.file) { fs.unlinkSync(req.file.path); }
        res.status(400).json({ success: false, message: error.message });
    } finally {
        connection.release(); 
    }
});

// RUTA 4: GUARDAR NUEVO REPORTE / SEGUIMIENTO (POST) 
app.post('/api/seguimiento', upload.single('foto'), async (req, res) => {
    try {
        const { id_arbol, estado, comentarios } = req.body; 
        const fotoUrl = req.file ? req.file.filename : null;

        if (!fotoUrl) {
            return res.status(400).json({ success: false, message: 'La foto de evidencia es obligatoria.' });
        }

        const [arbol] = await db.query('SELECT id_arbol FROM arbol WHERE codigo_etiqueta = ?', [id_arbol]);
        if (arbol.length === 0) {
            throw new Error('No se encontró el árbol en la base de datos.');
        }
        const trueIdArbol = arbol[0].id_arbol;

        await db.query(
            'INSERT INTO seguimiento (fecha_revision, estado_salud, foto_url, comentarios, id_arbol, id_usuario) VALUES (NOW(), ?, ?, ?, ?, ?)',
            [estado, fotoUrl, comentarios || '', trueIdArbol, 1]
        );

        res.json({ success: true, message: '¡Reporte actualizado con éxito!' });

    } catch (error) {
        console.error("Error al guardar reporte:", error);
        if (req.file) { fs.unlinkSync(req.file.path); }
        res.status(500).json({ success: false, message: error.message });
    }
});


// ==========================================
// RUTAS API - MÓDULO DE REFORESTACIÓN
// ==========================================

// RUTA 5: OBTENER CAMPAÑAS DE REFORESTACIÓN (GET)
app.get('/api/reforestacion', async (req, res) => {
    try {
        const [campanas] = await db.query(`
            SELECT 
                pr.id_propuesta, pr.nombre_propuesta, pr.fecha_solicitud, pr.cantidad_meta, pr.estatus as estatus_propuesta,
                s.nombre_zona,
                r.id_reforestacion, r.cantidad_plantada, r.estado as estado_campana
            FROM propuesta_reforestacion pr
            LEFT JOIN reforestacion r ON pr.id_propuesta = r.id_propuesta
            LEFT JOIN sitio s ON r.id_sitio = s.id_sitio
            ORDER BY pr.id_propuesta DESC
        `);
        res.json(campanas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener campañas' });
    }
});

// RUTA 6: GUARDAR NUEVA PROPUESTA (POST)
app.post('/api/reforestacion', async (req, res) => {
    try {
        const { nombre_propuesta, cantidad_meta, fecha_solicitud } = req.body;
        await db.query(
            'INSERT INTO propuesta_reforestacion (nombre_propuesta, cantidad_meta, fecha_solicitud, estatus) VALUES (?, ?, ?, "Pendiente")',
            [nombre_propuesta, cantidad_meta, fecha_solicitud]
        );
        res.json({ success: true, message: '¡Propuesta registrada con éxito!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al guardar la propuesta' });
    }
});

// RUTA 7: VER DETALLES DE UNA CAMPAÑA Y SUS ÁRBOLES (GET)
app.get('/api/reforestacion/detalles/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        const [campanas] = await db.query(`
            SELECT r.id_reforestacion, r.fecha_evento, r.cantidad_esperada, r.cantidad_plantada, r.estado,
                   p.nombre_propuesta, s.nombre_zona
            FROM reforestacion r
            JOIN propuesta_reforestacion p ON r.id_propuesta = p.id_propuesta
            LEFT JOIN sitio s ON r.id_sitio = s.id_sitio
            WHERE r.id_reforestacion = ?
        `, [id]);

        if (campanas.length === 0) return res.status(404).json({ error: 'Campaña no encontrada' });

        const [arboles] = await db.query(`
            SELECT a.id_arbol, a.codigo_etiqueta, a.fecha_plantado, e.nombre_comun, e.nombre_cientifico,
            (SELECT estado_salud FROM seguimiento WHERE id_arbol = a.id_arbol ORDER BY fecha_revision DESC LIMIT 1) as estado_actual
            FROM arbol a
            INNER JOIN especie e ON a.id_especie = e.id_especie
            WHERE a.id_reforestacion = ?
            ORDER BY a.fecha_plantado DESC
        `, [id]);

        res.json({ campana: campanas[0], arboles });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener detalles' });
    }
});

// RUTA 8: APROBAR PROPUESTA (POST)
app.post('/api/reforestacion/aprobar', async (req, res) => {
    const { id_propuesta, id_sitio, fecha_evento, cantidad_esperada } = req.body;
    const connection = await db.getConnection(); 
    try {
        await connection.beginTransaction();

        await connection.query(
            `INSERT INTO reforestacion (fecha_evento, id_sitio, id_propuesta, cantidad_esperada, estado) 
             VALUES (?, ?, ?, ?, 'Pendiente')`,
            [fecha_evento, id_sitio, id_propuesta, cantidad_esperada]
        );

        await connection.query(
            `UPDATE propuesta_reforestacion SET estatus = 'Aprobada' WHERE id_propuesta = ?`,
            [id_propuesta]
        );

        await connection.commit();
        res.json({ success: true, message: '¡Campaña aprobada y programada con éxito!' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al aprobar: ' + error.message });
    } finally {
        connection.release();
    }
});

// RUTA 9: RECHAZAR PROPUESTA (POST)
app.post('/api/reforestacion/rechazar', async (req, res) => {
    try {
        await db.query(`UPDATE propuesta_reforestacion SET estatus = 'Rechazada' WHERE id_propuesta = ?`, [req.body.id_propuesta]);
        res.json({ success: true, message: 'Propuesta rechazada.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al rechazar' });
    }
});

// RUTA 10: CAMBIAR ESTADO DE CAMPAÑA (POST)
app.post('/api/reforestacion/cambiar-estado', async (req, res) => {
    try {
        const { id_reforestacion, estado } = req.body;
        await db.query(`UPDATE reforestacion SET estado = ? WHERE id_reforestacion = ?`, [estado, id_reforestacion]);
        res.json({ success: true, message: 'Estado actualizado a: ' + estado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al cambiar estado' });
    }
});

// ==========================================
// ARRANCAR EL SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor ArboMap corriendo en: http://localhost:${PORT}`);
});