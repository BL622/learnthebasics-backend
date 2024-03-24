const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers/adminController');

router.post('/isAdmin', adminController.isAdmin);
router.get('/getTableNames', adminController.getTableNames);
router.post('/getTableRows', adminController.getRowsByTableName);
router.post('/insertRows', adminController.insertRows);
router.post('/updateRows', adminController.updateRows);
router.post('/deleteRows', adminController.deleteRows);

module.exports = router;