const express = require('express');
const router = express.Router();
const { registerPlayer, loginPlayer, forgotPassword, resetPassword } = require('../controllers/userController');
const {registerPlayerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema} = require('../sharedFunctions/validationSchemas')


router.post('/register', registerPlayerSchema, (req, res) => registerPlayer(req, res));
router.post('/login', loginSchema, (req, res) => loginPlayer(req, res));
router.post('/forgotPassword',forgotPasswordSchema, (req, res) => forgotPassword(req, res));
router.post('/resetPassword', resetPasswordSchema, (req, res) => resetPassword(req, res));


module.exports = router;