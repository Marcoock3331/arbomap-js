const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign.controller');

router.get('/', campaignController.getAllCampaigns);
router.post('/', campaignController.createProposal);
router.get('/active', campaignController.getActiveCampaigns);
router.delete('/proposal/:id', campaignController.deleteProposal);

router.get('/:id', campaignController.getCampaignById);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);
router.post('/:id/approve', campaignController.approveCampaign);

module.exports = router;