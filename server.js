require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const apiRoutes = require('./src/routes');
// Importamos tu controlador de árboles para usarlo directamente
const treeController = require('./src/controllers/tree.controller');
// Importamos la BD para el buzón
const db = require('./src/config/db'); 

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.redirect('/inicio.html');
});

app.use(express.static(path.join(__dirname, 'public')));


// RUTAS PÚBLICAS 
// 1. Estadísticas para la Landing Page
app.get('/api/public/stats', treeController.getStats);

// 2. Guardar mensajes del Buzón de Sugerencias
app.post('/api/public/buzon', async (req, res) => {
    try {
        const { nombre, email, mensaje } = req.body;
        // Asumo que tu tabla 'buzon' tiene estas columnas. Si se llaman diferente, avísame.
        await db.query('INSERT INTO buzon (nombre, email, mensaje) VALUES (?, ?, ?)', [nombre, email, mensaje]);
        res.json({ success: true });
    } catch (e) {
        console.error("Error en buzón:", e);
        res.status(500).json({ success: false, message: 'Error al guardar el mensaje' });
    }
});

// Enrutador Principal API (MVC 100% Modularizado - Protegido)
app.use('/api', apiRoutes);
app.use('/api/padrinos', require('./src/routes/padrinos.routes'));

app.listen(PORT, () => {
    console.log(`Servidor API RESTful corriendo en http://localhost:${PORT}`);
});