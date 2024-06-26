const { validationResult } = require("express-validator");

const { log } = require('../sharedFunctions/logFunction')
const Apiresponse = require("../sharedFunctions/response");
const { executeQuery, generateHash, compareHash } = require("../sharedFunctions/functions");
const { createToken, decryptToken } = require('./tokenGeneration');
const { createStatistics } = require('../sharedFunctions/generateStatistics');
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
      userInfo = {
        data: [username, createToken(selectRes[0])]
      }

      response = { ...userInfo, ...{ stats: await createStatistics(username) } };

      break;
    default:
      //TODO query to JSON
      query = "SELECT completedJobs, fastestCompletion, totalIncome FROM statsTbl WHERE userId = (SELECT uid FROM userTbl WHERE username = ?)";
      const statsRes = await executeQuery(query, username);
      response = {
        data: [username, createToken(selectRes[0]), statsRes[0]]
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
  const query = queries.updateResetTokenByEmail;
  await executeQuery(query, [resetToken, email]);

  return resetToken;
}

async function registerPlayer(req, res) {
  const request = req.body;

  log("Registering player:");

  const errors = validationResult(req);
  log(errors, 'error');
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  log("Check user existence");
  const user = await checkUserExists(request.username, request.email);
  if (user) return Apiresponse.badRequest(res, "Email or username already in use!");

  const insertUser = queries.insertNewUser;
  delete request["confirmPassword"];
  log("Creating hashed password", 'info')
  request.password = await generateHash(request.password);
  log(request)
  const insertRes = await executeQuery(insertUser, [request.email, request.username, request.password]);
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

  const query = queries.selectTokenByUid;
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
  log(request, 'info');

  const errors = validationResult(req);
  log(errors.array[0], 'error');
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  const decodedToken = decryptToken(request.token);
  if (!!decodedToken.error) return Apiresponse.badRequest(res, decodedToken.error);

  const user = await checkUserExists(decodedToken.username, "");
  if (!user) return Apiresponse.notFound(res, "User not found wrong token used!");

  log("Get user information with token", 'info')
  let query = queries.selectUserInfoByResetToken;
  const getUserByResetToken = await executeQuery(query, request.token);
  if (getUserByResetToken.length === 0) return Apiresponse.badRequest(res, "User not found wrong token used!");

  log("Hashing password");
  const hashedPassword = await generateHash(request.password);
  query = queries.setNewPasswordByUid;
  await executeQuery(query, [hashedPassword, decodedToken.uid]);

  log("Sending email with successful password reset", 'success');
  const emailResult = await emailController.passwordResetSuccessful(getUserByResetToken[0].email, decodedToken.username);
  if (emailResult.error) return Apiresponse.internalServerError(res, "Error sending the password changed email");
  return Apiresponse.ok(res, { message: "Password reset was successful and password changed email sent successfully" });
}

async function getStatistics(req, res) {
  const [username, token] = req.body.authCode.split(' ');
  log("Getting statistics for user: " + username, "info");

  const userStats = await createStatistics(username);

  return Apiresponse.ok(res, { data: userStats, message: "User statistics retrieved successfully" });
}

module.exports = { registerPlayer, loginPlayer, forgotPassword, validateResetToken, resetPassword, getStatistics };
