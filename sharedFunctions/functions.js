const db = require("../config/db");
const { createToken, decryptToken } = require('../controllers/tokenGeneration');
const bcrypt = require('bcrypt')

class ApiResponse {
  static send(res, statusCode, data) {
    return res.status(statusCode).json(data);
  }
}

class ErrorHandler {
  static handle(res, error, defaultMessage) {
    let errorMessage = defaultMessage;

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    log(errorMessage || "An error occurred", 'error');

    return ApiResponse.send(res, 500, { error: errorMessage });
  }
}

function log(message, type) {
  const colors = {
    info: "\x1b[34m", // Blue
    success: "\x1b[32m", // Green
    error: "\x1b[31m", // Red
  };

  const resetColor = "\x1b[0m";
  const color = colors[type] || "\x1b[37m"; // Default to white

  const formattedTimestamp = `[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}] - `;
  const coloredMessage = `${color}${formattedTimestamp}${message.replace(/\n/g, `\n${formattedTimestamp}`)}${resetColor}`;

  console.log(coloredMessage);
}

async function tryCatch(callback, errorMessage, res, successMessage = "Operation successful") {
  try {
    const result = await callback();
    log(successMessage, "success");
    ApiResponse.send(res, result[0], result[1]);
  } catch (error) {
    const logMessage = errorMessage || "An error occurred";
    log(logMessage, 'error');
    console.error(error);
    ErrorHandler.handle(res, error, logMessage);
  }
}

async function executeQuery(query, values, logMessage, res, successMessage) {
  const connection = await db.pool.getConnection();
  try {
    const [results] = await connection.query(query, values);
    log(logMessage + "\n" + `Database query successful: ${query}`, "success");
    return [200, { message: successMessage, data: results }];
  } finally {
    connection.release();
  }
}

const validateInputs = (inputs, validations) => {
  for (const validation of validations) {
    const { field, regex, errorMessage, required } = validation;

    if (required && (!inputs[field] || inputs[field].trim() === '')) {
      return `${field} is required`;
    }

    if (field === 'confirmPassword') {
      const password = inputs['password'];
      if (required && (!inputs[field] || inputs[field].trim() === '')) {
        return 'Confirm password is required';
      }
      if (inputs[field] !== password) {
        return 'Password and confirm password do not match';
      }
    } else if (!inputs[field] || (regex && !regex.test(inputs[field]))) {
      return errorMessage;
    }
  }
  return null;
};
const checkExistingUser = async (field, value, errorMessage, res) => {
  const result = await executeQuery(`SELECT * FROM userTbl WHERE ${field} = ?`, [value], `Query to check existing ${field}`, res, "");
  log(`Query results for registration ${field} check:\n${JSON.stringify(result[1].data)}`, "info");

  if (result[1].data.length > 0) {
    return [400, { error: errorMessage }];
  }

  return null;
};

const getUserByField = async (field, value, errorMessage, res) => {
  const result = await executeQuery(`SELECT * FROM userTbl WHERE ${field} = ?`, [value], `Query to check ${field} for password reset`, res, "");
  log(`Query results for ${field} check:\n${JSON.stringify(result[1].data)}`, "info");
  if (result[1].data.length == 0) {
    return [404, { error: `${field} not found` }];
  }

  return result[1].data[0];
};

const handleApplicationLogin = async (username, password, res) => {
  const user = await getUserByField("username", username, "User not found", res);
  if (user[0] == 404) {
    return user;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return [401, { error: "Invalid password" }];
  }

  return [
    200,
    {
      message: "Login successful",
      data: [user.username, createToken(user)]
    }
  ];
};

const handleWebsiteLogin = async (username, password, res) => {
  const user = await getUserByField("username", username, "User not found", res);
  if (user[0] == 404) {
    return user;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return [401, { error: "Invalid password" }];
  }

  return [
    200,
    {
      message: "Login successful",
      data: [user.username, createToken(user), user.password,]
    }
  ];
};

const updateUserField = async (field, newValue, conditionField, conditionValue, successMessage, res) => {
  await executeQuery(`UPDATE userTbl SET ${field} = ? WHERE ${conditionField} = ?`, [newValue, conditionValue], `Query to update ${field}`, res, successMessage);
};

const getUserIdByUsername = async (username, res) => {
  const uIdQuery = 'SELECT uid FROM userTbl WHERE username = ?';
  const uIdResult = await executeQuery(uIdQuery, username, res, "");
  return uIdResult[1].data[0].uid;
};

const checkExistingSave = async (uId, saveId, res) => {
  const result = await executeQuery(`SELECT * FROM savedata WHERE userId = ? AND saveId = ?`, [uId, saveId], `Query to check existing save`, res, "");
  return result[1].data.length > 0;
};

const updateSave = async (uId, save, res) => {
  const updateQuery = `
      UPDATE savedata
      SET lvl = ?, time = ?, money = ?, cpuId = ?, gpuId = ?, ramId = ?, stgId = ?, lastBought = ?
      WHERE userId = ? AND saveId = ?
  `;

  const updateValues = [
    save.lvl, save.time, save.money, save.cpuId, save.gpuId, save.ramId, save.stgId, save.lastBought,
    uId, save.saveId
  ];

  await executeQuery(updateQuery, updateValues, `Query to update save`, res, "Save updated successfully");
}

const createSave = async (uId, save, res) => {
  const insertQuery = `
      INSERT INTO savedata (userId, saveId, lvl, time, money, cpuId, gpuId, ramId, stgId, lastBought)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const insertValues = [
    uId, save.saveId, save.lvl, save.time, save.money, save.cpuId, save.gpuId, save.ramId, save.stgId, save.lastBought
  ];

  await executeQuery(insertQuery, insertValues, `Query to create save`, res, "Save created successfully");
}

module.exports = {
  tryCatch,
  executeQuery,
  log,
  validateInputs,
  checkExistingUser,
  getUserByField,
  handleApplicationLogin,
  handleWebsiteLogin,
  updateUserField,
  getUserIdByUsername,
  checkExistingSave,
  updateSave,
  createSave
};