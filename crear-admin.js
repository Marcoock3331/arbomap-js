const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function crearAdmin() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root', // Tu usuario de BD
        password: '', // Tu contraseña de BD
        database: 'arbomap_db' // Tu base de datos
    });

    const nombre = "Administrador";
    const correo = "admin@utm.com"; // Tu correo de login
    const passwordPlana = "123456"; // Tu contraseña de login
    const id_rol = 1; // Rol de Admin

    // ENCRIPTACIÓN: Aquí sucede la magia
    const saltRounds = 10;
    const contrasenaHash = await bcrypt.hash(passwordPlana, saltRounds);

    try {
        await db.query(
            'INSERT INTO usuario (nombre, correo, contrasena, id_rol) VALUES (?, ?, ?, ?)',
            [nombre, correo, contrasenaHash, id_rol]
        );
        console.log('¡Usuario administrador creado con éxito!');
        console.log('Correo:', correo);
        console.log('Clave:', passwordPlana);
    } catch (error) {
        console.error('Error al crear usuario:', error.message);
    } finally {
        await db.end();
    }
}

crearAdmin();