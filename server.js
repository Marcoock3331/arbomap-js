const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const db = require('./src/config/db'); 
const bcrypt = require('bcryptjs'); 

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuracion de carpetas para fotos
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'evidencia_' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 1. AUTENTICACION Y PERFIL ---
app.post('/api/login', async (req, res) => {
    try {
        const { matricula, password } = req.body;
        const [rows] = await db.query('SELECT * FROM usuario WHERE matricula = ?', [matricula]);
        if (rows.length > 0) {
            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                delete user.password; 
                user.rol_nombre = user.id_rol === 1 ? 'Administrador' : 'Voluntario Activo';
                res.json({ success: true, user });
            } else { res.status(401).json({ success: false, message: "Contrasena incorrecta." }); }
        } else { res.status(401).json({ success: false, message: "Matricula no encontrada." }); }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/registro', async (req, res) => {
    try {
        const { nombre_completo, matricula, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await db.query('INSERT INTO usuario (nombre_completo, matricula, password, id_rol) VALUES (?, ?, ?, 2)', [nombre_completo, matricula, hash]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: "Matricula ya registrada." }); }
});

app.get('/api/perfil/:id', async (req, res) => {
    try {
        const [u] = await db.query('SELECT nombre_completo, matricula, id_rol FROM usuario WHERE id_usuario = ?', [req.params.id]);
        const [arboles] = await db.query(`SELECT a.codigo_etiqueta, e.nombre_comun, e.nombre_cientifico, s.nombre_zona, ac.fecha_asignacion, (SELECT estado_salud FROM seguimiento WHERE id_arbol = a.id_arbol ORDER BY fecha_revision DESC LIMIT 1) as estado_actual, (SELECT foto_url FROM seguimiento WHERE id_arbol = a.id_arbol ORDER BY fecha_revision DESC LIMIT 1) as foto FROM arbol a JOIN especie e ON a.id_especie = e.id_especie JOIN arbol_cuidador ac ON a.id_arbol = ac.id_arbol LEFT JOIN sitio s ON a.id_sitio = s.id_sitio WHERE ac.id_usuario = ?`, [req.params.id]);
        res.json({ usuario: u[0], arboles });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 2. DASHBOARD Y ESTADISTICAS ---
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as t FROM arbol');
        const [esp] = await db.query('SELECT COUNT(*) as t FROM especie');
        const [sanos] = await db.query(`SELECT COUNT(*) as t FROM (SELECT id_arbol, estado_salud FROM seguimiento s1 WHERE fecha_revision = (SELECT MAX(fecha_revision) FROM seguimiento s2 WHERE s2.id_arbol = s1.id_arbol)) as u WHERE estado_salud = 'Bueno'`);
        const [mapa] = await db.query(`SELECT a.*, e.nombre_comun, e.nombre_cientifico, s.nombre_zona, (SELECT estado_salud FROM seguimiento WHERE id_arbol = a.id_arbol ORDER BY fecha_revision DESC LIMIT 1) as estado, (SELECT foto_url FROM seguimiento WHERE id_arbol = a.id_arbol ORDER BY fecha_revision DESC LIMIT 1) as foto_actual FROM arbol a JOIN especie e ON a.id_especie = e.id_especie LEFT JOIN sitio s ON a.id_sitio = s.id_sitio`);
        res.json({ totalArboles: total[0].t, totalEspecies: esp[0].t, totalSanos: sanos[0].t, arboles: mapa });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stats-zonas', async (req, res) => {
    try {
        const [stats] = await db.query(`SELECT s.nombre_zona, COUNT(a.id_arbol) as total, SUM(CASE WHEN (SELECT estado_salud FROM seguimiento WHERE id_arbol = a.id_arbol ORDER BY fecha_revision DESC LIMIT 1) = 'Bueno' THEN 1 ELSE 0 END) as sanos FROM sitio s LEFT JOIN arbol a ON s.id_sitio = a.id_sitio GROUP BY s.id_sitio HAVING total > 0`);
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 3. SITIOS Y RESPONSABLES ---
app.get('/api/sitios', async (req, res) => {
    try {
        const [sitios] = await db.query(`SELECT s.*, u.nombre_completo as encargado, u.matricula as encargado_id FROM sitio s LEFT JOIN responsables_sitio rs ON s.id_sitio = rs.id_sitio LEFT JOIN usuario u ON rs.id_usuario = u.id_usuario`);
        res.json(sitios);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 4. CRUD ARBOLES Y SEGUIMIENTO ---
app.post('/api/arboles', upload.single('foto'), async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { codigo_etiqueta, latitud, longitud, nombre_comun, nombre_cientifico, descripcion, estado_salud, id_sitio, id_reforestacion, id_usuario } = req.body;
        let [esp] = await conn.query('SELECT id_especie FROM especie WHERE nombre_comun = ?', [nombre_comun]);
        let id_esp = esp.length > 0 ? esp[0].id_especie : (await conn.query('INSERT INTO especie (nombre_comun, nombre_cientifico, descripcion) VALUES (?,?,?)', [nombre_comun, nombre_cientifico, descripcion]))[0].insertId;
        const [arb] = await conn.query('INSERT INTO arbol (codigo_etiqueta, latitud, longitud, fecha_plantado, id_especie, id_sitio, id_reforestacion) VALUES (?,?,?,CURDATE(),?,?,?)', [codigo_etiqueta, latitud, longitud, id_esp, id_sitio || null, id_reforestacion || null]);
        await conn.query('INSERT INTO seguimiento (fecha_revision, estado_salud, foto_url, comentarios, id_arbol, id_usuario) VALUES (NOW(),?,?,?,?,?)', [estado_salud || 'Bueno', req.file ? req.file.filename : null, 'Registro inicial.', arb.insertId, id_usuario || 1]);
        await conn.commit(); res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
});

app.get('/api/arbol/expediente/:codigo', async (req, res) => {
    try {
        const [arbol] = await db.query(`SELECT a.*, e.nombre_comun, e.nombre_cientifico, e.descripcion, s.nombre_zona, u.nombre_completo AS cuidador, ac.fecha_asignacion FROM arbol a JOIN especie e ON a.id_especie = e.id_especie LEFT JOIN sitio s ON a.id_sitio = s.id_sitio LEFT JOIN arbol_cuidador ac ON a.id_arbol = ac.id_arbol LEFT JOIN usuario u ON ac.id_usuario = u.id_usuario WHERE a.codigo_etiqueta = ?`, [req.params.codigo]);
        const [reportes] = await db.query(`SELECT s.*, u.nombre_completo AS usuario_nombre FROM seguimiento s LEFT JOIN usuario u ON s.id_usuario = u.id_usuario WHERE s.id_arbol = ? ORDER BY s.fecha_revision DESC`, [arbol[0].id_arbol]);
        res.json({ arbol: arbol[0], reportes });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/arbol/adoptar', async (req, res) => {
    try { await db.query('INSERT INTO arbol_cuidador (id_arbol, id_usuario, fecha_asignacion) VALUES ((SELECT id_arbol FROM arbol WHERE codigo_etiqueta=?), ?, CURDATE())', [req.body.codigo_etiqueta, req.body.id_usuario]); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/seguimiento', upload.single('foto'), async (req, res) => {
    try {
        const [arb] = await db.query('SELECT id_arbol FROM arbol WHERE codigo_etiqueta = ?', [req.body.id_arbol]);
        await db.query('INSERT INTO seguimiento (fecha_revision, estado_salud, foto_url, comentarios, id_arbol, id_usuario) VALUES (NOW(), ?, ?, ?, ?, ?)', [req.body.estado_salud, req.file ? req.file.filename : null, req.body.comentarios, arb[0].id_arbol, req.body.id_usuario]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/seguimiento/:id', async (req, res) => {
    try { await db.query('UPDATE seguimiento SET estado_salud = ?, comentarios = ? WHERE id_seguimiento = ?', [req.body.estado_salud, req.body.comentarios, req.params.id]); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/seguimiento/:id', async (req, res) => {
    try { await db.query('DELETE FROM seguimiento WHERE id_seguimiento = ?', [req.params.id]); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/arboles/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM seguimiento WHERE id_arbol = ?', [req.params.id]);
        await db.query('DELETE FROM arbol_cuidador WHERE id_arbol = ?', [req.params.id]);
        await db.query('DELETE FROM arbol WHERE id_arbol = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reforestacion/detalles/:id', async (req, res) => {
    try {
        // Obtenemos la campaña (usando tus nombres de columna: estatus, estado)
        const [campana] = await db.query(`
            SELECT r.*, p.nombre_propuesta, p.cantidad_meta, s.nombre_zona,
            (SELECT COUNT(*) FROM arbol WHERE id_reforestacion = r.id_reforestacion) as cantidad_plantada
            FROM reforestacion r
            JOIN propuesta_reforestacion p ON r.id_propuesta = p.id_propuesta
            LEFT JOIN sitio s ON r.id_sitio = s.id_sitio
            WHERE r.id_reforestacion = ?`, [req.params.id]);

        // Obtenemos los árboles con los nombres exactos que pide tu logic.js
        const [arboles] = await db.query(`
            SELECT a.id_arbol, a.codigo_etiqueta, a.fecha_plantado, e.nombre_comun, e.nombre_cientifico, 
            (SELECT estado_salud FROM seguimiento WHERE id_arbol = a.id_arbol ORDER BY fecha_revision DESC LIMIT 1) as estado_actual
            FROM arbol a
            JOIN especie e ON a.id_especie = e.id_especie
            WHERE a.id_reforestacion = ?`, [req.params.id]);

        res.json({ campana: campana[0], arboles });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});
app.post('/api/reforestacion', async (req, res) => {
    try {
        const { nombre_propuesta, cantidad_meta } = req.body;
        await db.query(
            'INSERT INTO propuesta_reforestacion (nombre_propuesta, cantidad_meta, estatus) VALUES (?, ?, "Pendiente")',
            [nombre_propuesta, cantidad_meta]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reforestacion/aprobar', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id_propuesta, id_sitio, fecha_evento, cantidad_esperada } = req.body;
        await conn.query('UPDATE propuesta_reforestacion SET estatus = "Aprobada" WHERE id_propuesta = ?', [id_propuesta]);
        await conn.query(
            'INSERT INTO reforestacion (fecha_evento, cantidad_esperada, estado, id_sitio, id_propuesta) VALUES (?, ?, "Activa", ?, ?)',
            [fecha_evento, cantidad_esperada, id_sitio, id_propuesta]
        );
        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        conn.release();
    }
});

// ← ESTA RUTA FALTABA
app.get('/api/reforestacion', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                p.id_propuesta,
                p.nombre_propuesta,
                p.cantidad_meta,
                p.estatus,
                r.id_reforestacion,
                r.fecha_evento,
                r.cantidad_plantada,
                r.estado,
                s.nombre_zona
            FROM propuesta_reforestacion p
            LEFT JOIN reforestacion r ON r.id_propuesta = p.id_propuesta
            LEFT JOIN sitio s         ON s.id_sitio = r.id_sitio
            ORDER BY p.id_propuesta DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
    console.log("---------------------------------------");
    console.log("Servidor ArboMap ejecutandose correctamente");
    console.log("Accede aqui: http://localhost:3000");
    console.log("---------------------------------------");
});