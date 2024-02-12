const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers/adminController');

router.get('/getTableNames', adminController.getTableNames);


module.exports = router;