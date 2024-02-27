const { body } = require('express-validator');

const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_.-]{4,24}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%?&^])[A-Za-z\d@.#$!%?&]{7,23}$/;

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

const resetPasswordSchema = [
  body('password').matches(passwordRegex).withMessage('Invalid new password'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password and Confirm Password do not match');
    }
    return true;
  })
];

module.exports = {
    registerPlayerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema
}