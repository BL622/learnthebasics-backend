const express = require('express');
const router = express.Router();
const { registerPlayer } = require('../controllers/userController');
const {registerPlayerSchema} = require('../sharedFunctions/validationSchemas')


router.post('/register', registerPlayerSchema, (req, res) => registerPlayer(req, res));
// router.post('/login', playerController.loginUser);
// router.post('/forgotPassword', playerController.forgotPassword);
// router.post('/resetPassword', playerController.resetPassword);


module.exports = router;