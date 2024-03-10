const express = require('express');
const router = express.Router();
const { getHardwareElements, getSaves, setSavesOrUpdate, deleteSave } = require('../controllers/gameController');
const { getSavesSchema, setSavesOrUpdateSchema, deleteSaveSchema } = require('../sharedFunctions/validationSchemas')

router.get('/getHardwareElements', (req, res) => getHardwareElements(req, res));
router.post('/getPlayerSaves', getSavesSchema, (req, res) => getSaves(req, res));
router.post('/savePlayerData', setSavesOrUpdateSchema, (req, res) => setSavesOrUpdate(req, res));
router.post('/deleteSave', deleteSaveSchema, (req, res) => deleteSave(req, res));

module.exports = router;