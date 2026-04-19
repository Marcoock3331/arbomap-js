const jwt = require('jsonwebtoken');

// Clave secreta para firmar los tokens (en producción esto debe ir en un archivo .env)
const SECRET_KEY = 'ArboMap_UTM_Secret_Key_2026';

exports.verifyToken = (req, res, next) => {
    // 1. Buscar el token en los encabezados de la petición
    const bearerHeader = req.headers['authorization'];

    if (!bearerHeader) {
        return res.status(403).json({ success: false, message: 'Acceso denegado. No se proporcionó un token de seguridad.' });
    }

    // 2. Extraer el token (Formato: "Bearer <token>")
    const token = bearerHeader.split(' ')[1];

    try {
        // 3. Verificar que el token sea válido y no esté expirado
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Guardamos los datos del usuario en la petición
        next(); // El usuario es válido, lo dejamos pasar a la ruta solicitada
    } catch (err) {
        return res.status(401).json({ success: false, message: 'El token ha expirado o es inválido. Por favor, inicia sesión nuevamente.' });
    }
};

exports.SECRET_KEY = SECRET_KEY;