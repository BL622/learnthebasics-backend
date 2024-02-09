const express = require('express');
const router = express.Router();
const { gameController } = require('../controllers/gameController');

router.post('/getPlayerSaves', gameController.getSaves);
router.post('/savePlayerData', gameController.setSavesOrUpdate);
router.post('/deleteSave', gameController.deleteSave);

module.exports = router;