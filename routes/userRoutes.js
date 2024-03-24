const express = require('express');
const router = express.Router();
const { playerController } = require('../controllers/userController');


router.post('/register', playerController.registerPlayer);
router.post('/login', playerController.loginUser);
router.post('/forgotPassword', playerController.forgotPassword);
router.post('/validateResetToken', playerController.validateResetToken);
router.post('/resetPassword', playerController.resetPassword);


module.exports = router;