const db = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        const [user] = await db.query('SELECT id_usuario, nombre_completo, matricula, id_rol, foto_perfil FROM usuario WHERE id_usuario = ?', [req.params.id]);
        if (user.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        
        // OPTIMIZACIÓN: Extracción de estado y foto sin subconsultas correlacionadas
        const [arboles] = await db.query(`
            SELECT a.id_arbol, a.codigo_etiqueta, e.nombre_comun, e.nombre_cientifico, s.nombre_zona, ac.fecha_asignacion,
                   seg.estado_salud as estado_actual, seg.foto_url as foto
            FROM arbol_cuidador ac
            JOIN arbol a ON ac.id_arbol = a.id_arbol
            JOIN especie e ON a.id_especie = e.id_especie
            LEFT JOIN sitio s ON a.id_sitio = s.id_sitio
            LEFT JOIN (
                SELECT id_arbol, estado_salud, foto_url,
                       ROW_NUMBER() OVER(PARTITION BY id_arbol ORDER BY fecha_revision DESC) as rn
                FROM seguimiento
            ) seg ON a.id_arbol = seg.id_arbol AND seg.rn = 1
            WHERE ac.id_usuario = ?
        `, [req.params.id]);

        user[0].rol = user[0].id_rol === 1 ? 'Administrador' : 'Voluntario';
        res.json({ usuario: user[0], arboles });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// NUEVO: Función para subir/actualizar la foto de perfil
exports.uploadProfilePhoto = async (req, res) => {
    try {
        const id_usuario = req.params.id;

        // Verificamos que el usuario que intenta subir la foto sea el dueño de la cuenta
        if (req.user.id_usuario != id_usuario) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para modificar este perfil.' });
        }

        // Verificamos si multer logró capturar un archivo
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se detectó ninguna imagen.' });
        }

        const foto_nombre = req.file.filename;

        // Actualizamos la base de datos con el nuevo nombre de la foto
        await db.query('UPDATE usuario SET foto_perfil = ? WHERE id_usuario = ?', [foto_nombre, id_usuario]);

        res.json({ 
            success: true, 
            message: 'Foto de perfil actualizada correctamente.',
            foto_url: foto_nombre
        });

    } catch (e) {
        console.error("Error al subir foto de perfil:", e);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};