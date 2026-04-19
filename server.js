const express = require('express');
const path = require('path');
const cors = require('cors');

const apiRoutes = require('./src/routes');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.use(express.static(path.join(__dirname, 'public')));

// Enrutador Principal API (MVC 100% Modularizado)
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`Servidor API RESTful corriendo en http://localhost:${PORT}`);
});