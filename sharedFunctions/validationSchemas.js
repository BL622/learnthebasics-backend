const { body, header } = require('express-validator');

const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_.-]{4,24}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%?&^])[A-Za-z\d@.#$!%?&]{7,23}$/;
const tokenRegex = /^[0-9a-f]{24}\.[0-9a-f]+:[0-9a-f]+.[0-9a-f]+$/;
const authCodeRegex = /^(?:[a-zA-Z][a-zA-Z0-9_.-]{4,24})\s(?:[0-9a-f]{24}\.[0-9a-f]+:[0-9a-f]+.[0-9a-f]+)$/;
const saveIdRegex = /^.{1,255}$/;
  

// Define schemas for each request type
const registerPlayerSchema = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('username').matches(usernameRegex).withMessage('Invalid username'),
  body('password').matches(passwordRegex).withMessage('Invalid password'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password and Confirm Password do not match');
    }
    return true;
  })
];

const loginSchema = [
  body('username').matches(usernameRegex).withMessage('Invalid username'),
  body('password').matches(passwordRegex).withMessage('Invalid password')
];

const forgotPasswordSchema = [
  body('email').isEmail().withMessage('Invalid email address')
];

const validateResetTokenSchema = [
  body('token').matches(tokenRegex).withMessage('Invalid token')
];

const resetPasswordSchema = [
  body('password').matches(passwordRegex).withMessage('Invalid new password'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password and Confirm Password do not match');
    }
    return true;
  })
];

const getSavesSchema = [
  body('authCode').matches(authCodeRegex).withMessage('Invalid user token')
];

const setSavesOrUpdateSchema = [
  body('authCode').matches(authCodeRegex).notEmpty().withMessage('Invalid user token'),
  body('data.*.saveId').isString().notEmpty().matches(saveIdRegex).withMessage('Invalid save ID'),
  body('data.*.lvl').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid level'),
  body('data.*.money').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid money'),
  body('data.*.time').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid time'),
  body('data.*.cpuId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid CPU ID'),
  body('data.*.gpuId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid GPU ID'),
  body('data.*.ramId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid RAM ID'),
  body('data.*.stgId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid storage ID'),
  body('data.*.lastBought').optional().isString().notEmpty().withMessage('Invalid last bought')
];

const deleteSaveSchema = [
  body('authCode').matches(authCodeRegex).notEmpty().withMessage('Invalid user token'),
  body('saveId').isString().notEmpty().matches(saveIdRegex).withMessage('Invalid save ID')
]

module.exports = {
  registerPlayerSchema,
  loginSchema,
  forgotPasswordSchema,
  validateResetTokenSchema,
  resetPasswordSchema,
  getSavesSchema,
  setSavesOrUpdateSchema,
  deleteSaveSchema
}