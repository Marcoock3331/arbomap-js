const db = require('../config/db');

// Obtener la lista de alumnos y contar cuántos árboles tienen a cargo
exports.getDirectorioPadrinos = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT u.id_usuario, u.matricula, u.nombre_completo, u.carrera, u.cuatrimestre,
                   COUNT(ac.id_arbol) AS arboles_a_cargo
            FROM usuario u
            LEFT JOIN arbol_cuidador ac ON u.id_usuario = ac.id_usuario
            WHERE u.id_rol = 2 
            GROUP BY u.id_usuario
            HAVING arboles_a_cargo > 0
            ORDER BY u.nombre_completo ASC
        `);
        res.json(rows);
    } catch (e) {
        console.error("Error al cargar directorio de padrinos:", e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Acción: Egresar y Liberar (Borrar de arbol_cuidador y eliminar usuario definitivamente)
exports.egresarPadrino = async (req, res) => {
    try {
        const id_usuario = req.params.id;
        // 1. Liberar todos los árboles que tenía a cargo el alumno
        await db.query('DELETE FROM arbol_cuidador WHERE id_usuario = ?', [id_usuario]);
        // 2. Eliminar el registro del estudiante de la plataforma por graduación
        await db.query('DELETE FROM usuario WHERE id_usuario = ?', [id_usuario]);
        
        res.json({ success: true, message: 'Alumno egresado y árboles liberados exitosamente.' });
    } catch (e) {
        console.error("Error al egresar padrino:", e);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

//Obtener los árboles específicos de un padrino
exports.getArbolesPorPadrino = async (req, res) => {
    try {
        const id_usuario = req.params.id;
        const [rows] = await db.query(`
            SELECT a.id_arbol, a.codigo_etiqueta, e.nombre_comun, s.nombre_zona
            FROM arbol_cuidador ac
            JOIN arbol a ON ac.id_arbol = a.id_arbol
            LEFT JOIN especie e ON a.id_especie = e.id_especie
            LEFT JOIN sitio s ON a.id_sitio = s.id_sitio
            WHERE ac.id_usuario = ?
        `, [id_usuario]);
        
        res.json(rows);
    } catch (e) {
        console.error("Error al obtener árboles del padrino:", e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};