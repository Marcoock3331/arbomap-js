const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;

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

// Candado de seguridad por roles
exports.isAdmin = (req, res, next) => {
    // Como este middleware se ejecuta DESPUÉS de verifyToken, req.user ya existe
    if (req.user.rol !== 1) {
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso denegado. Esta acción requiere privilegios de Administrador.' 
        });
    }
    next(); // Si es rol 1, lo dejamos pasar
};

exports.SECRET_KEY = SECRET_KEY;

