const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers/adminController');

router.post('/isAdmin', adminController.isAdmin);
router.get('/getTableNames', adminController.getTableNames);
router.post('/getTableRows', adminController.getRowsByTableName);


module.exports = router;