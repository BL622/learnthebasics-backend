const db = require("../config/db");
const { createToken } = require('../controllers/tokenGeneration');
const bcrypt = require('bcrypt');

class ApiResponse {
  static send(res, statusCode, data) {
    return res.status(statusCode).json(data);
  }
}

// function log(message, type) {
//   const colors = {
//     info: "\x1b[34m", // Blue
//     success: "\x1b[32m", // Green
//     error: "\x1b[31m", // Red
//   };

//   const resetColor = "\x1b[0m";
//   const color = colors[type] || resetColor; // Default to white

//   const formattedTimestamp = `[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}] - `;
//   const coloredMessage = `${color}${formattedTimestamp}${formatMessage(message)}${resetColor}`;

//   console.log(coloredMessage);
// }

// function formatMessage(message) {
//   if (Array.isArray(message)) {
//     return formatArray(message);
//   } else if (typeof message === 'object' && message !== null) {
//     return formatObject(message);
//   } else {
//     return message;
//   }
// }

// function formatArray(arr) {
//   return `[${arr.map(formatMessage).join(', ')}]`;
// }

// function formatObject(obj) {
//   const entries = Object.entries(obj).map(([key, value]) => `${key}: ${formatMessage(value)}`);
//   return `{ ${entries.join(', ')} }`;
// }


async function executeQuery(query, values) {
  const connection = await db.pool.getConnection();
  try {
    const [results] = await connection.query(query, values);
    return  results;
  } finally {
    connection.release();
  }
}

async function generateHash(password){
  const hashedPassword = await bcrypt.hash(password, 10);
  return hashedPassword
}

async function compareHash(password, hashedPassword){
  const passwordMatch = await bcrypt.compare(password, hashedPassword);
  return passwordMatch
}


module.exports = {executeQuery, generateHash, compareHash}

















// const checkUserExists = async (field, value, errorMessage, res) => {
//   const result = await executeQuery(`SELECT * FROM userTbl WHERE ${field} = ?`, [value], `Query to check ${field}`, res, "");
//   log(`Query results for ${field} check:\n${JSON.stringify(result[1].data)}`, "info");
//   if (result[1].data.length === 0) {
//     return [404, { error: errorMessage }];
//   }

//   return result[1].data[0];
// };

// const handleApplicationLogin = async (username, password, res) => {
//   const user = await checkUserExists("username", username, "User not found", res);
//   if (user[0] == 404) {
//     return user;
//   }

//   const passwordMatch = await bcrypt.compare(password, user.password);
//   if (!passwordMatch) {
//     return [401, { error: "Invalid password" }];
//   }

//   return [
//     200,
//     {
//       message: "Login successful",
//       data: [user.username, createToken(user)]
//     }
//   ];
// };

// const handleWebsiteLogin = async (username, password, res) => {
//   const user = await checkUserExists("username", username, "User not found", res);
//   if (user[0] == 404) {
//     return user;
//   }

//   const passwordMatch = await bcrypt.compare(password, user.password);
//   if (!passwordMatch) {
//     return [401, { error: "Invalid password" }];
//   }

//   return [
//     200,
//     {
//       message: "Login successful",
//       data: [user.username, createToken(user), user.password,]
//     }
//   ];
// };

// const updateUserField = async (field, newValue, conditionField, conditionValue, successMessage, res) => {
//   await executeQuery(`UPDATE userTbl SET ${field} = ? WHERE ${conditionField} = ?`, [newValue, conditionValue], `Query to update ${field}`, res, successMessage);
// };

// const checkExistingSave = async (uId, saveId, res) => {
//   const result = await executeQuery(`SELECT * FROM savedata WHERE userId = ? AND saveId = ?`, [uId, saveId], `Query to check existing save`, res, "");
//   return result[1].data.length > 0;
// };

// const updateSave = async (uId, save, res) => {
//   const updateQuery = `
//       UPDATE savedata
//       SET lvl = ?, time = ?, money = ?, cpuId = ?, gpuId = ?, ramId = ?, stgId = ?, lastBought = ?
//       WHERE userId = ? AND saveId = ?
//   `;

//   const updateValues = [
//     save.lvl, save.time, save.money, save.cpu, save.gpu, save.ram, save.stg, save.lb,
//     uId, save.id
//   ];

//   await executeQuery(updateQuery, updateValues, `Query to update save`, res, "Save updated successfully");
// }

// const createSave = async (uId, saveId, res) => {
//   const insertQuery = `CALL createFirstSaveFile(?,?)`;

//   const insertValues = [
//     saveId, uId
//   ];

//   await executeQuery(insertQuery, insertValues, `Query to create save`, res, "Save created successfully");
// };

// const createSaveIfNotExists = async (uId, save, res) => {
//   const insertQuery = `
//       INSERT INTO savedata (userId, saveId, lvl, time, money, cpuId, gpuId, ramId, stgId, lastBought)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `;

//   const insertValues = [
//     uId, save.saveId, save.lvl, save.time, save.money, save.cpuId, save.gpuId, save.ramId, save.stgId, save.lastBought
//   ];

//   await executeQuery(insertQuery, insertValues, `Query to create save`, res, "Save created successfully");
// }

// module.exports = {
//   executeQuery,

//   checkUserExists,
//   handleApplicationLogin,
//   handleWebsiteLogin,
//   updateUserField,
//   checkExistingSave,
//   updateSave,
//   createSave,
//   createSaveIfNotExists
// };

module.exports = ApiResponse