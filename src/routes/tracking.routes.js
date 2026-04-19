const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');
const upload = require('../middleware/upload');

router.post('/', upload.single('foto'), trackingController.createTracking);
router.put('/:id', trackingController.updateTracking);
router.delete('/:id', trackingController.deleteTracking);

module.exports = router;