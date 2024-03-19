const { validationResult } = require("express-validator");

const { log } = require('../sharedFunctions/logFunction')
const Apiresponse = require("../sharedFunctions/response");
const { executeQuery, generateHash, compareHash } = require("../sharedFunctions/functions");
const { createToken, decryptToken } = require('./tokenGeneration');
const {createStatistics} = require('../sharedFunctions/generateStatistics');
const emailController = require("./emailController");

const queries = require('../JSON documents/queries.json');

async function checkUserExists(username, email) {
  let query = queries.selectUserByUsername;
  const usernameRes = await executeQuery(query, username);
  log(usernameRes, 'success');

  query = queries.selectUserByEmail;
  const emailRes = await executeQuery(query, email);
  log(emailRes, 'success');

  return usernameRes.length !== 0 || emailRes.length !== 0;
}

async function handleLoginType(username, password, appType = "") {

  const user = await checkUserExists(username, "")

  if (!user) return 404
  log("Handle login by appType:")

  let response;
  let query = queries.selectUserByUsername;
  let selectRes = await executeQuery(query, username);
  const matchPassword = await compareHash(password, selectRes[0].password);
  if (!matchPassword) return false;
  
  log(appType, 'info')
  switch (appType) {

    case "web":
      const statsInfo = await createStatistics(username);

      userInfo = { 
        data: [username, createToken(selectRes[0])]
      }

      response = {...userInfo, ...{stats: statsInfo}};

      break;
    default:
      response = { 
        data: [username, createToken(selectRes[0])] 
      }
      break;
  }

  return response;
}

async function checkAndUpdateResetToken(user, email) {
  const userToken = user.passwordResetToken;

  if (userToken) {
    try {
      log("Check if token is expired", 'info')
      const decoded = decryptToken(userToken);
      if (decoded.expires_at > Math.floor(Date.now() / 1000)) return 400;

    } catch (decodeError) {
      log("Existing token verification failed or expired", "error");
    }
  }

  const resetToken = createToken(user, 60);
  log("Generating new token: " + resetToken, 'info');
  const query = "UPDATE userTbl SET passwordResetToken = ? WHERE email = ?";
  await executeQuery(query, [resetToken, email]);

  return resetToken;
}

async function registerPlayer(req, res) {
  const request = req.body;

  log("Registering player:");

  const errors = validationResult(req);
  log(errors.array[0].msg, 'error');
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  log("Check user existence");
  const user = await checkUserExists(request.username, request.email);
  if (user) return Apiresponse.badRequest(res, "Email or username already in use!");

  const insertUser = "INSERT INTO userTbl (email, username, password) VALUES (?,?,?)";
  delete request["confirmPassword"];
  log("Creating hashed password", 'info')
  request.password = await generateHash(request.password);
  const insertRes = await executeQuery(insertUser, Object.values(request));
  log(insertRes, 'success')

  return Apiresponse.ok(res, { message: "User registered successfully", data: insertRes });
}

async function loginPlayer(req, res) {
  const request = req.body;

  log("Logging in user:");

  const errors = validationResult(req);
  log(errors, 'error');
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  const user = await handleLoginType(request.username, request.password, req.headers["x-app-type"]);
  if (user === 404) return Apiresponse.notFound(res, "User not found");
  if (!user) return Apiresponse.unauthorized(res, "Invalid password");
  log(user, 'success')

  return Apiresponse.ok(res, user)
}

async function forgotPassword(req, res) {
  const request = req.body;

  log("Initiating password reset:");

  const errors = validationResult(req);
  log(errors.array[0], 'error');
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  let user = await checkUserExists("", request.email);
  if (!user) return Apiresponse.notFound(res, "User not found");

  let query = queries.selectUserByEmail;
  user = await executeQuery(query, request.email);

  log("Creating or generating token:")
  const resetToken = await checkAndUpdateResetToken(user[0], request.email);
  if (resetToken === 400) return Apiresponse.badRequest(res, "Password reset email has already been sent");

  log("Sending password reset email")
  const emailResult = await emailController.sendPasswordResetEmail(request.email, resetToken, user[0].username);
  log(emailResult, 'success')
  if (emailResult.error) return Apiresponse.internalServerError(res, "Error sending password reset email.");
  return Apiresponse.ok(res, { message: "Password reset email sent successfully" });
}

async function validateResetToken(req, res) {
  const request = req.body;

  log('Validating token:');

  const errors = validationResult(req);
  log(errors.array[0], 'error');
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  const decodedToken = decryptToken(request.token);
  if (!!decodedToken.error) return Apiresponse.badRequest(res, decodedToken.error);

  const query = "SELECT passwordResetToken FROM userTbl WHERE uid = ?";
  const checkIfTokenIsValid = await executeQuery(query, decodedToken.uid);

  if (checkIfTokenIsValid[0].passwordResetToken === null) return Apiresponse.notFound(res, "Reset token not found");
  if (checkIfTokenIsValid[0].passwordResetToken !== request.token) return Apiresponse.badRequest(res, "Invalid reset token");
  if (decodedToken.expires_at < Date.now() / 1000) return Apiresponse.badRequest(res, "Reset token expired");

  log(checkIfTokenIsValid, 'success');

  return Apiresponse.ok(res, { message: "Reset token found", data: [{ passwordResetToken: checkIfTokenIsValid[0].passwordResetToken }] });
}

async function resetPassword(req, res) {
  const request = req.body;

  log("Resetting password:");

  const errors = validationResult(req);
  log(errors.array[0], 'error');
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  const decodedToken = decryptToken(request.resetToken);
  if (!!decodedToken.error) return Apiresponse.badRequest(res, decodedToken.error);

  const user = await checkUserExists(decodedToken.username, "");
  if (!user) return Apiresponse.notFound(res, "User not found wrong token used!");

  log("Get user information with token", 'info')
  let query = "SELECT * FROM userTbl WHERE passwordResetToken = ?";
  const getUserByResetToken = await executeQuery(query, request.resetToken);
  if (getUserByResetToken.length === 0) return Apiresponse.badRequest(res, "User not found wrong token used!");

  log("Hashing password");
  const hashedPassword = await generateHash(request.password);
  query = "UPDATE userTbl SET password = ?, passwordResetToken = NULL WHERE uid = ?`";
  await executeQuery(query, [hashedPassword, decodedToken.uid]);

  log("Sending email with successful password reset", 'success');
  const emailResult = await emailController.passwordResetSuccessful(decodedToken.email, decodedToken.username);
  if (emailResult.error) return Apiresponse.internalServerError(res, "Error sending the password changed email");
  return Apiresponse.ok(res, { message: "Password reset was successful and password changed email sent successfully" });
}

module.exports = { registerPlayer, loginPlayer, forgotPassword, validateResetToken, resetPassword };
