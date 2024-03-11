const { validationResult } = require("express-validator");

const Apiresponse = require("../sharedFunctions/response");
const { executeQuery, generateHash, compareHash } = require("../sharedFunctions/functions");
const { createToken, decryptToken } = require('./tokenGeneration');
const emailController = require("./emailController");

const queries = require('../JSON documents/queries.json');

async function checkUserExists(username, email) {
  let query = queries.selectUserByUsername;
  const usernameRes = await executeQuery(query, username);

  query = queries.selectUserByEmail;
  const emailRes = await executeQuery(query, email);
  if (usernameRes.length !== 0 || emailRes.length !== 0) return true;
  return false;
}


//TODO FINISH APPTYPE LOGIN RETURNS
async function handleLoginType(username, password, appType = "") {

  const user = await checkUserExists(username, "")

  if (!user) return 404

  let query = queries.selectUserByUsername;
  let selectRes = await executeQuery(query, username);
  const matchPassword = await compareHash(password, selectRes[0].password);

  if (!matchPassword) return false;

  return selectRes[0];
}

async function checkAndUpdateResetToken(user, email) {
  const userToken = user.passwordResetToken;

  if (userToken) {
    try {
      const decoded = decryptToken(userToken);
      if (decoded.expires_at > Math.floor(Date.now() / 1000)) return 400;

    } catch (decodeError) {
      console.log("Existing token verification failed or expired", "error");
    }
  }

  const resetToken = createToken(user, 60);
  const query = "UPDATE userTbl SET passwordResetToken = ? WHERE email = ?";
  await executeQuery(query, [resetToken, email]);

  return resetToken;
}

async function registerPlayer(req, res) {
  const request = req.body;

  console.log("Registering player:");
  const errors = validationResult(req);
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  console.log("Check user existence");
  const user = await checkUserExists(request.username, request.email);
  if (user) return Apiresponse.badRequest(res, "Email or username already in use!");

  const insertUser = "INSERT INTO userTbl (email, username, password) VALUES (?,?,?)";
  delete request["confirmPassword"];
  request.password = await generateHash(request.password);
  const insertRes = await executeQuery(insertUser, Object.values(request));

  return Apiresponse.ok(res, { message: "User registered successfully", data: insertRes });
}

async function loginPlayer(req, res) {
  const request = req.body;

  console.log("Logging in user:");
  const errors = validationResult(req);
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  const user = await handleLoginType(request.username, request.password, req.headers["x-app-type"]);
  if (user === 404) return Apiresponse.notFound(res, "User not found");
  if (!user) return Apiresponse.unauthorized(res, "Invalid password");


  return Apiresponse.ok(res, { data: [user.username, createToken(user)] })
}

async function forgotPassword(req, res) {
  const request = req.body;

  console.log("Initiating password reset:");
  const errors = validationResult(req);
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  let user = await checkUserExists("", request.email);
  if (!user) return Apiresponse.notFound(res, "User not found");

  let query = queries.selectUserByEmail;
  user = await executeQuery(query, request.email);

  const resetToken = await checkAndUpdateResetToken(user[0], request.email);
  if (resetToken === 400) return Apiresponse.badRequest(res, "Password reset email has already been sent");

  const emailResult = await emailController.sendPasswordResetEmail(request.email, resetToken, user[0].username);
  if (emailResult.error) return Apiresponse.internalServerError(res, "Error sending password reset email.");
  return Apiresponse.ok(res, { message: "Password reset email sent successfully" });
}

async function validateResetToken(req, res) {
  const request = req.body;

  console.log('Validating token:');
  const errors = validationResult(req);
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  const decodedToken = decryptToken(request.token);
  if (!!decodedToken.error) return Apiresponse.badRequest(res, decodedToken.error);

  const query = "SELECT passwordResetToken FROM userTbl WHERE uid = ?";
  const checkIfTokenIsValid = await executeQuery(query, decodedToken.uid);

  if (checkIfTokenIsValid[0].passwordResetToken === null) return Apiresponse.notFound(res, "Reset token not found");
  if (checkIfTokenIsValid[0].passwordResetToken !== request.token) return Apiresponse.badRequest(res, "Invalid reset token");
  if (decodedToken.expires_at < Date.now() / 1000) return Apiresponse.badRequest(res, "Reset token expired");

  return Apiresponse.ok(res, { message: "Reset token found", data: [{ passwordResetToken: checkIfTokenIsValid[0].passwordResetToken }] });
}

async function resetPassword(req, res) {
  const request = req.body;

  console.log("Resetting password:");
  const errors = validationResult(req);
  if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

  const decodedToken = decryptToken(request.resetToken);
  if (!!decodedToken.error) return Apiresponse.badRequest(res, decodedToken.error);

  const user = await checkUserExists(decodedToken.username, "");
  if (!user) return Apiresponse.notFound(res, "User not found wrong token used!");

  let query = "SELECT * FROM userTbl WHERE passwordResetToken = ?";
  const getUserByResetToken = await executeQuery(query, request.resetToken);
  if (getUserByResetToken.length === 0) return Apiresponse.badRequest(res, "User not found wrong token used!");

  const hashedPassword = await generateHash(request.password);
  query = "UPDATE userTbl SET password = ?, passwordResetToken = NULL WHERE uid = ?`";
  await executeQuery(hashedPassword, [hashedPassword, decodedToken.uid]);

  const emailResult = await emailController.passwordResetSuccessful(decodedToken.email, decodedToken.username);
  if (emailResult.error) return Apiresponse.internalServerError(res, "Error sending the password changed email");
  return Apiresponse.ok(res, { message: "Password reset was successful and password changed email sent successfully" });
}

module.exports = { registerPlayer, loginPlayer, forgotPassword, validateResetToken, resetPassword };
