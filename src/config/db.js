// UBICACIÓN: src/config/db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');

// Cargar variables de entorno (por si usas .env)
dotenv.config();

// Configuración de la conexión
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',           // Usuario por defecto de Laragon
    password: '',           // Contraseña vacía por defecto
    database: 'arbomap_v2', // TU BASE DE DATOS REAL
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Mensaje de confirmación al conectar
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err.code);
        if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('👉 CONSEJO: Verifica que tu base de datos se llame "arbomap_v2" en phpMyAdmin.');
        }
    } else {
        console.log('✅ Conexión exitosa a la Base de Datos: arbomap_v2');
        if (connection) connection.release();
    }
});

// Exportamos la conexión para usarla en el servidor
module.exports = pool.promise();