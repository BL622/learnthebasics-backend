const express = require('express');
const router = express.Router();
const { registerPlayer, loginPlayer } = require('../controllers/userController');
const {registerPlayerSchema, loginSchema} = require('../sharedFunctions/validationSchemas')


router.post('/register', registerPlayerSchema, (req, res) => registerPlayer(req, res));
router.post('/login', loginSchema, (req, res) => loginPlayer(req, res));
// router.post('/forgotPassword', playerController.forgotPassword);
// router.post('/resetPassword', playerController.resetPassword);


module.exports = router;