const bcrypt = require("bcrypt");
const { body, validationResult } = require('express-validator');
const {
  executeQuery,
  tryCatch,
  log,
  checkExistingUser,
  getUserByField,
  handleApplicationLogin,
  handleWebsiteLogin,
  updateUserField
} = require('../sharedFunctions/functions');
const emailController = require("./emailController");
const { createToken, decryptToken } = require("./tokenGeneration");

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

const playerController = {
  registerPlayer: [
    registerPlayerSchema,
    async function (req, res) {
      const { email, username, password } = req.body;
      log("Registering player:");




      await tryCatch(
        async () => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            log(`Error during player registration: ${errors.array()[0].msg}`, 'error');
            return [400, { error: errors.array()[0].msg }];
          }

          // Check if email already exists
          const emailError = await checkExistingUser('email', email, 'Email already in use!', res);
          if (emailError) {
            log(`Error during player registration: ${emailError}`, 'error');
            return emailError;
          }

          // Check if username already exists
          const usernameError = await checkExistingUser('username', username, 'Username already exists!', res);
          if (usernameError) {
            log(`Error during player registration: ${usernameError}`, 'error');
            return usernameError;
          }

          // Hash password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Execute query to register user
          const result = await executeQuery("INSERT INTO userTbl (email, username, password) VALUES (?,?,?)", [email, username, hashedPassword], "Query to register user", res, "User registered successfully");

          log("Player registered successfully", 'success');
          return result;
        },
        "Error during player registration",
        res
      );
    }
  ],

  loginUser: [
    loginSchema,
    async function (req, res) {
      const { username, password } = req.body;
      log("Logging in user:");

      await tryCatch(
        async () => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            log(`Error during user login: ${errors.array()[0].msg}`, 'error');
            return [400, { error: errors.array()[0].msg }];
          }
          // Determine application type
          const appType = req.headers['x-app-type'];

          // Perform login based on application type
          if (!appType) {
            // Handle application login
            const noHeaderResp = await handleApplicationLogin(username, password, res);
            return noHeaderResp;
          } else {
            // Handle website login
            const response = await handleWebsiteLogin(username, password, res);
            return response;
          }
        },
        "Error during user login",
        res
      );
    }
  ],

  forgotPassword: [
    forgotPasswordSchema,
    async function (req, res) {
      const { email } = req.body;
      log("Initiating password reset:");



      await tryCatch(
        async () => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            log(`Error initiating password reset: ${errors.array()[0].msg}`, 'error');
            return [400, { error: errors.array()[0].msg }];
          }
          // Check if user exists
          const user = await getUserByField('email', email, 'User not found', res);
          if (user[0] == 404) {
            log("User not found for password reset", 'error');
            return user;
          }

          // Check if password reset token exists and is valid
          const userToken = user.passwordResetToken;
          if (userToken) {
            try {
              const decoded = decryptToken(userToken);

            if (decoded.expires_at > Math.floor(Date.now() / 1000)) {
              return [400, { error: 'Password reset email has already been sent' }];
            }
          } catch (decodeError) {
            log('Existing token verification failed or expired', 'error');
            const resetToken = createToken(user, 60);

              await updateUserField('passwordResetToken', resetToken, 'email', email, '', res);

              const emailResult = await emailController.sendPasswordResetEmail(email, resetToken, user.username);

              if (emailResult.success) {
                log('Password reset email sent successfully', 'success');
                return [200, { message: 'Password reset email sent successfully' }];
              } else {
                log(`Error sending password reset email: ${emailResult.message}`, 'error');
                return [500, { error: 'Error sending password reset email.' }];
              }
            }
          }

          // If no valid token found, generate a new one
          const resetToken = createToken(user, 60);

          // Update user's password reset token
          await updateUserField('passwordResetToken', resetToken, 'email', email, '', res);

          // Send password reset email
          const emailResult = await emailController.sendPasswordResetEmail(email, resetToken, user.username);

          if (emailResult.success) {
            log('Password reset email sent successfully', 'success');
            return [200, { message: 'Password reset email sent successfully' }];
          } else {
            log(`Error sending password reset email: ${emailResult.message}`, 'error');
            return [500, { error: 'Error sending password reset email.' }];
          }
        },
        "Error during password reset token generation",
        res
      );
    }
  ],
  validateResetToken: async function (req, res) {
    await tryCatch(
      async () => {
        const token = decryptToken(req.body.token);
        const resetTokenQuery = `SELECT passwordResetToken FROM userTbl WHERE username = ?`;
        const results = await executeQuery(
          resetTokenQuery,
          [token.username],
          "Checking reset token",
          res,
          "Reset token found"
        );
        if (results[1].data[0].passwordResetToken === null) return [404, { error: "Reset token not found" }];
        if (results[1].data[0].passwordResetToken !== req.body.token) return [400, { error: "Invalid reset token" }];
        if (token.expires_at < Date.now() / 1000) {
          const removeTokenQuery = `UPDATE userTbl SET passwordResetToken = NULL WHERE passwordResetToken = ?`;
          await executeQuery(removeTokenQuery, [req.body.token], "Removing reset token", res, "Reset token removed");
          return [400, { error: "Reset token expired" }];
        }

        return results;
      },
      "Error validating token",
      res
    );
  },
  resetPassword: async function (req, res) {
    const username = decryptToken(req.body.token).username;
    await tryCatch(
      async () => {
        log(decryptToken(req.body.token));
        if (!passwordRegex.test(req.body.password)) return [401, { error: "Password doesn't match requirements" }];
        if (req.body.password !== req.body.confirmPassword) return [401, { error: "Passwords do not match" }];
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const resetPasswordQuery = `UPDATE userTbl SET password = ?, passwordResetToken = NULL WHERE username = ?`;
        await executeQuery(resetPasswordQuery, [hashedPassword, username], "Resetting password", res, "Password reset");
        return [200, { message: "Password reset successful" }];
      },
      "Error resetting password",
      res
    )
  }
};

module.exports = {
  playerController,
};
