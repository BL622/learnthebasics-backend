const express = require('express');
const router = express.Router();
const { registerPlayer, loginPlayer, forgotPassword, validateResetToken, resetPassword, getStatistics } = require('../controllers/userController');
const {registerPlayerSchema, loginSchema, forgotPasswordSchema, validateResetTokenSchema, resetPasswordSchema} = require('../sharedFunctions/validationSchemas');


router.post('/register', registerPlayerSchema, (req, res) => registerPlayer(req, res));
router.post('/login', loginSchema, (req, res) => loginPlayer(req, res));
router.post('/forgotPassword',forgotPasswordSchema, (req, res) => forgotPassword(req, res));
router.post('/validateResetToken', validateResetTokenSchema, (req, res) => validateResetToken(req, res));
router.post('/resetPassword', resetPasswordSchema, (req, res) => resetPassword(req, res));
router.post('/getStatistics', (req, res) => getStatistics(req, res));


module.exports = router;