const bcrypt = require("bcrypt");

const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_.-]{4,24}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%?&^])[A-Za-z\d@.#$!%?&]{7,23}$/;

const emailController = require("./emailController");
const { createToken, decryptToken } = require("./tokenGeneration");
const {
  executeQuery,
  tryCatch,
  log,
  validateInputs,
  checkExistingUser,
  getUserByField,
  handleApplicationLogin,
  handleWebsiteLogin,
  updateUserField,
} = require('../sharedFunctions/functions')

const playerController = {
  registerPlayer: async function (req, res) {
    const { email, username, password } = req.body;
    log("Registering player:");

    const validations = [
      { field: 'email', regex: emailRegex, errorMessage: 'Invalid email address', required: true },
      { field: 'username', regex: usernameRegex, errorMessage: 'Invalid username', required: true },
      { field: 'password', regex: passwordRegex, errorMessage: 'Invalid password', required: true },
      { field: 'confirmPassword', errorMessage: 'Invalid confirm password', required: true },
    ];

    await tryCatch(
      async () => {
        const validationError = validateInputs(req.body, validations);
        if (validationError) {
          return [400, { error: validationError }];
        }

        const emailError = await checkExistingUser('email', email, 'Email already in use!', res);
        if (emailError) {
          return emailError;
        }

        const usernameError = await checkExistingUser('username', username, 'Username already exists!', res);
        if (usernameError) {
          return usernameError;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await executeQuery("INSERT INTO userTbl (email, username, password) VALUES (?,?,?)", [email, username, hashedPassword], "Query to register user", res, "User registered successfully");
        return result;
      },
      "Error during player registration",
      res
    );
  },

  loginUser: async function (req, res) {
    const { username, password } = req.body;
    log("Logging in user:");

    const validations = [
      { field: 'username', regex: usernameRegex, errorMessage: 'Invalid username', required: true },
      { field: 'password', regex: passwordRegex, errorMessage: 'Invalid password', required: true },
    ];

    await tryCatch(
      async () => {

        const validationError = validateInputs(req.body, validations);
        if (validationError) {
          return [400, { error: validationError }];
        }


        const appType = req.headers['x-app-type'];

        if (!appType) {

          const noHeaderResp = await handleApplicationLogin(username, password, res);
          return noHeaderResp;
        } else {
          const response = await handleWebsiteLogin(username, password, res);
          return response;
        }
      },
      "Error during user login",
      res
    );
  },

  forgotPassword: async function (req, res) {
    const { email } = req.body;
    log("Initiating password reset:");

    const validations = [
      { field: 'email', regex: emailRegex, errorMessage: 'Invalid email address', required: true },
    ];

    await tryCatch(
      async () => {
        const validationError = validateInputs(req.body, validations);
        if (validationError) {
          return [400, { error: validationError }];
        }

        const user = await getUserByField('email', email, 'User not found', res);
        if (user[0] == 404) {
          return user;
        }

        const userToken = user.passwordResetToken;

        if (userToken) {
          try {
            const decoded = decryptToken(userToken);

            if (decoded.expires_at > Math.floor(Date.now() / 1000)) {
              return [400, { message: 'Password reset email has already been sent' }];
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

      },
      "Error during password reset token generation",
      res
    );
  },

  resetPassword: async function (req, res) {
    const { resetToken, password } = req.body;
    log("Resetting password:");

    const validations = [
      { field: 'password', regex: passwordRegex, errorMessage: 'Invalid new password', required: true },
      { field: 'confirmPassword', errorMessage: 'Invalid confirm password', required: true },
    ];

    await tryCatch(
      async () => {
        const validationError = validateInputs(req.body, validations);
        if (validationError) {
          return [400, { error: validationError }];
        }

        const user = await getUserByField("passwordResetToken", resetToken, "Invalid reset token", res);
        if (user[0] == 404) {
          return user;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await updateUserField("password", hashedPassword, "uid", decryptToken(resetToken).uid, "Password reset successful", res);
        await updateUserField("passwordResetToken", null, "uid", decryptToken(resetToken).uid, "Reset token set to null", res);

        const emailResult = await emailController.passwordResetSuccessful(decryptToken(resetToken).email, decryptToken(resetToken).username);

        if (emailResult.success) {
          log("Password reset was successful and password changed email sent successfully", 'success');
          return [200, { message: "Password reset was successful and password changed email sent successfully" }];
        } else {
          log("Error sending the password changed email", 'error');
          return [500, { error: "Error sending the password changed email" }];
        }
      },
      "Error during password reset",
      res
    );
  },
};

module.exports = {
  playerController,
};