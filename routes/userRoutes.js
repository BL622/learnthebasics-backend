const express = require('express');
const router = express.Router();
const { playerController } = require('../controllers/userController');


router.post('/register', playerController.registerPlayer);
router.post('/login', playerController.loginUser);
router.post('/forgotPassword', playerController.forgotPassword);
router.post('/reset-password', playerController.resetPassword);
router.post('/validateToken', playerController.validateToken);
router.post('/decrypt', playerController.decytionOfToken);


module.exports = router;