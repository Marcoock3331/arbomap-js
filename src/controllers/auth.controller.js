const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { SECRET_KEY } = require('../middleware/auth');

exports.login = async (req, res) => {
    try {
        let { matricula, password } = req.body;
        matricula = matricula.toUpperCase().trim(); 

        const [rows] = await db.query('SELECT * FROM usuario WHERE matricula = ?', [matricula]);
        if (rows.length === 0) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

        delete user.password;
        user.rol_nombre = user.id_rol === 1 ? 'Administrador' : 'Voluntario Activo';

        // GENERAR EL TOKEN JWT (Válido por 8 horas)
        const token = jwt.sign(
            { id_usuario: user.id_usuario, rol: user.id_rol, matricula: user.matricula }, 
            SECRET_KEY, 
            { expiresIn: '8h' }
        );

        // Devolvemos el usuario y el token al frontend
        res.json({ success: true, user, token });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.register = async (req, res) => {
    try {
        let { nombre_completo, matricula, password } = req.body;
        matricula = matricula.toUpperCase().trim(); 

        const [existing] = await db.query('SELECT id_usuario FROM usuario WHERE matricula = ?', [matricula]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Esta matrícula ya está registrada' });

        const hash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO usuario (nombre_completo, matricula, password, id_rol) VALUES (?, ?, ?, 2)', [nombre_completo, matricula, hash]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Error al registrar usuario' });
    }
};