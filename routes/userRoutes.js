const express = require('express');
const router = express.Router();
const { registerPlayer, loginPlayer, forgotPassword } = require('../controllers/userController');
const {registerPlayerSchema, loginSchema, forgotPasswordSchema} = require('../sharedFunctions/validationSchemas')


router.post('/register', registerPlayerSchema, (req, res) => registerPlayer(req, res));
router.post('/login', loginSchema, (req, res) => loginPlayer(req, res));
router.post('/forgotPassword',forgotPasswordSchema, (req, res) => forgotPassword(req, res));
// router.post('/resetPassword', playerController.resetPassword);


module.exports = router;