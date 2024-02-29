// const bcrypt = require("bcrypt");
// const { validationResult } = require("express-validator");

// const {
//   executeQuery,
//   tryCatch,
//   log,
//   checkUserExists,
//   handleApplicationLogin,
//   handleWebsiteLogin,
//   updateUserField,
// } = require("../sharedFunctions/functions");
// const emailController = require("./emailController");
// const { createToken, decryptToken } = require("./tokenGeneration");
// const {
//   registerPlayerSchema,
//   loginSchema,
//   forgotPasswordSchema,
//   resetPasswordSchema,
// } = require("../sharedFunctions/validationSchemas");

// const playerController = {
//   registerPlayer: [
//     registerPlayerSchema,
//     async function (req, res) {
//       const { email, username, password } = req.body;
//       log("Registering player:");

//       await tryCatch(
//         "Error during player registration",
//         res,
//         "",

//         async () => {
//           const errors = validationResult(req);
//           if (!errors.isEmpty()) {
//             log(
//               `Error during player registration: ${errors.array()[0].msg}`,
//               "error"
//             );
//             return [400, { error: errors.array()[0].msg }];
//           }
//           let errorMsg = "Email already in use!";

//           const emailError = await checkUserExists(
//             "email",
//             email,
//             errorMsg,
//             res
//           );
//           if (emailError[0] !== 404) {
//             log(`Error during player registration: ${errorMsg}`, "error");
//             return [400, { error: errorMsg }];
//           }

//           errorMsg = "Username already exists!";
//           const usernameError = await checkUserExists(
//             "username",
//             username,
//             errorMsg,
//             res
//           );
//           if (usernameError[0] !== 404) {
//             log(`Error during player registration: ${errorMsg}`, "error");
//             return [400, { error: errorMsg }];
//           }

//           const hashedPassword = await bcrypt.hash(password, 10);

//           const result = await executeQuery(
//             "INSERT INTO userTbl (email, username, password) VALUES (?,?,?)",
//             [email, username, hashedPassword],
//             "Query to register user",
//             res,
//             "User registered successfully"
//           );

//           log("Player registered successfully", "success");
//           return result;
//         }
//       );
//     },
//   ],

//   loginUser: [
//     loginSchema,
//     async function (req, res) {
//       const { username, password } = req.body;
//       log("Logging in user:");

//       await tryCatch("Error during user login", res, "", async () => {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//           log(`Error during user login: ${errors.array()[0].msg}`, "error");
//           return [400, { error: errors.array()[0].msg }];
//         }
//         // Determine application type
//         const appType = req.headers["x-app-type"];

//         if (!appType) {
//           const noHeaderResp = await handleApplicationLogin(
//             username,
//             password,
//             res
//           );
//           return noHeaderResp;
//         }
//         const response = await handleWebsiteLogin(username, password, res);
//         return response;
//       });
//     },
//   ],

//   forgotPassword: [
//     forgotPasswordSchema,
//     async function (req, res) {
//       const { email } = req.body;
//       log("Initiating password reset:");

//       await tryCatch(
//         "Error during password reset token generation",
//         res,
//         "",
//         async () => {
//           const errors = validationResult(req);
//           if (!errors.isEmpty()) {
//             log(
//               `Error initiating password reset: ${errors.array()[0].msg}`,
//               "error"
//             );
//             return [400, { error: errors.array()[0].msg }];
//           }

//           const user = await checkUserExists(
//             "email",
//             email,
//             "User not found",
//             res
//           );
//           if (user[0] == 404) {
//             log("User not found for password reset", "error");
//             return user;
//           }

//           const userToken = user.passwordResetToken;
//           if (userToken) {
//             try {
//               const decoded = decryptToken(userToken);

//               if (decoded.expires_at > Math.floor(Date.now() / 1000)) {
//                 return [
//                   400,
//                   { error: "Password reset email has already been sent" },
//                 ];
//               }
//             } catch (decodeError) {
//               log("Existing token verification failed or expired", "error");
//             }
//           }

//           const resetToken = createToken(user, 60);

//           await updateUserField(
//             "passwordResetToken",
//             resetToken,
//             "email",
//             email,
//             "",
//             res
//           );

//           const emailResult = await emailController.sendPasswordResetEmail(
//             email,
//             resetToken,
//             user.username
//           );

//           if (emailResult.error) {
//             log(
//               `Error sending password reset email: ${emailResult.message}`,
//               "error"
//             );
//             return [500, { error: "Error sending password reset email." }];
//           }

//           log("Password reset email sent successfully", "success");
//           return [200, { message: "Password reset email sent successfully" }];
//         }
//       );
//     },
//   ],

//   resetPassword: [
//     resetPasswordSchema,
//     async function (req, res) {
//       const { resetToken, password } = req.body;
//       log("Resetting password:");

//       await tryCatch("Error during password reset", res, "", async () => {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//           log(`Error resetting password: ${errors.array()[0].msg}`, "error");
//           return [400, { error: errors.array()[0].msg }];
//         }
//         // Check if reset token is valid
//         const user = await checkUserExists(
//           "passwordResetToken",
//           resetToken,
//           "Invalid reset token",
//           res
//         );
//         if (user[0] == 404) {
//           log("Invalid reset token", "error");
//           return user;
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);

//         await updateUserField(
//           "password",
//           hashedPassword,
//           "uid",
//           decryptToken(resetToken).uid,
//           "Password reset successful",
//           res
//         );
//         await updateUserField(
//           "passwordResetToken",
//           null,
//           "uid",
//           decryptToken(resetToken).uid,
//           "Reset token set to null",
//           res
//         );

//         // Send password changed email
//         const emailResult = await emailController.passwordResetSuccessful(
//           decryptToken(resetToken).email,
//           decryptToken(resetToken).username
//         );

//         if (emailResult.error) {
//           log("Error sending the password changed email", "error");
//           return [500, { error: "Error sending the password changed email" }];
//         }

//         log(
//           "Password reset was successful and password changed email sent successfully",
//           "success"
//         );
//         return [
//           200,
//           {
//             message:
//               "Password reset was successful and password changed email sent successfully",
//           },
//         ];
//       });
//     },
//   ],
// };

// module.exports = {
//   playerController,
// };

const { validationResult } = require("express-validator");

const Apiresponse = require("../sharedFunctions/response");
const { executeQuery, generateHash, compareHash } = require("../sharedFunctions/functions");
const {createToken} = require('./tokenGeneration');


async function checkUserExists(username, email) {
  let query;

  query = "SELECT * FROM userTbl WHERE username = ?";
  const usernameRes = await executeQuery(query, username);

  query = "SELECT * FROM userTbl WHERE email = ?";
  const emailRes = await executeQuery(query, email);

  if (usernameRes.length !== 0 || emailRes.length !== 0) return true;
  return false;
}

async function handleLoginType(username, password, appType = ""){

  const user = await checkUserExists(username, "")

  if(!user) return 404

  let query = "SELECT * FROM userTbl WHERE username = ?";
  let selectRes = await executeQuery(query, username);
  const matchPassword = await compareHash(password, selectRes[0].password);

  if(!matchPassword) return false;
  
  return selectRes[0];

}

async function registerPlayer(req, res) {
  const request = req.body;

  console.log("Registering player:");
  const errors = validationResult(req);
  if (!errors.isEmpty()) return Apiresponse.send(res, 403, { error: errors.array()[0].msg });

  console.log("Check user existence");
  const user = await checkUserExists(request.username, request.email);
  if (user) return Apiresponse.send(res, 400, {error: "Email or username already in use!",});

  const insertUser = "INSERT INTO userTbl (email, username, password) VALUES (?,?,?)";
  delete request["confirmPassword"];
  request.password = await generateHash(request.password);
  const insertRes = await executeQuery(insertUser, Object.values(request));

  return Apiresponse.send(res, 200, {message: "User registered successfully", data: insertRes});
}

async function loginPlayer(req, res) {
  const request = req.body;

  console.log("Logging in user:");
  const errors = validationResult(req);
  if (!errors.isEmpty()) return Apiresponse.send(res, 400, { error: errors.array()[0].msg });

  const user = await handleLoginType(request.username, request.password, req.headers["x-app-type"]);
  if(user === 404) return Apiresponse.send(res, 404, {error: "User not found"});
  if(!user) return Apiresponse.send(res, 401, { error: "Invalid password" });


  return Apiresponse.send(res, 200, { data: [user.username, createToken(user)]})
}

module.exports = { registerPlayer, loginPlayer };
