const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign.controller');
const { verifyToken } = require('../middleware/auth'); // Ojo: Asegúrate de importar tu middleware de JWT

// Aseguramos que todas las rutas requieran sesión
router.use(verifyToken);

// --- TUS RUTAS ORIGINALES ---
router.get('/', campaignController.getAllCampaigns);
router.post('/', campaignController.createProposal);
router.get('/active', campaignController.getActiveCampaigns);
router.delete('/proposal/:id', campaignController.deleteProposal);

router.get('/:id', campaignController.getCampaignById);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);
router.post('/:id/approve', campaignController.approveCampaign);

// --- NUEVAS RUTAS DE LOGÍSTICA DE VOLUNTARIOS ---
router.post('/:id/unirse', campaignController.joinCampaign); // Voluntario
router.get('/:id/voluntarios', campaignController.getVolunteers); // Admin
router.put('/asistencia/:idRegistro', campaignController.checkInVolunteer); // Admin

module.exports = router;