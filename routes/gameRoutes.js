const express = require('express');
const router = express.Router();
const { getSaves, setSavesOrUpdate, deleteSave, getHardwareElements } = require('../controllers/gameController');
const { getSavesSchema, setSavesOrUpdateSchema, deleteSaveSchema } = require('../sharedFunctions/validationSchemas')

router.post('/getPlayerSaves', getSavesSchema, (req, res) => getSaves(req, res));
router.post('/savePlayerData', setSavesOrUpdateSchema, (req, res) => setSavesOrUpdate(req, res));
router.post('/deleteSave', deleteSaveSchema, (req, res) => deleteSave(req, res));
router.get('/getHardwareElements', (req, res) => getHardwareElements(req, res));

module.exports = router;