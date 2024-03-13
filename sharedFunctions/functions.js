const db = require("../config/db");
const { createToken } = require('../controllers/tokenGeneration');
const bcrypt = require('bcrypt');

class ApiResponse {
  static send(res, statusCode, data) {
    return res.status(statusCode).json(data);
  }
}

class ErrorHandler {
  static handle(res, error, defaultMessage = "An error occurred") {
    const errorMessage = (error instanceof Error) ? error.message : defaultMessage;
    log(errorMessage, 'error');
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
  const color = colors[type] || resetColor; // Default to white

  const formattedTimestamp = `[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}] - `;
  const coloredMessage = `${color}${formattedTimestamp}${formatMessage(message)}${resetColor}`;

  console.log(coloredMessage);
}

function formatMessage(message) {
  if (Array.isArray(message)) {
    return formatArray(message);
  } else if (typeof message === 'object' && message !== null) {
    return formatObject(message);
  } else {
    return message;
  }
}

function formatArray(arr) {
  return `[${arr.map(formatMessage).join(', ')}]`;
}

function formatObject(obj) {
  const entries = Object.entries(obj).map(([key, value]) => `${key}: ${formatMessage(value)}`);
  return `{ ${entries.join(', ')} }`;
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
  const keys = Object.keys(inputs);

  // Check if all required fields are present
  for (const validation of validations) {
    const { field, required } = validation;
    if (required && !keys.includes(field)) {
      return `Required field "${field}" is missing in the request body`;
    }
  }

  // Check for unexpected keys
  for (const key of keys) {
    const isUnexpected = !validations.some(validation => validation.field === key);
    if (isUnexpected) {
      return `Unexpected field "${key}" in the request body`;
    }
  }

  const password = inputs['password'];
  const confirmPassword = inputs['confirmPassword'];
  if (password !== confirmPassword) {
    return 'Password and Confirm Password do not match';
  }

  // Validate inputs based on regex
  for (const validation of validations) {
    const { field, regex, errorMessage } = validation;
    if (regex && !regex.test(inputs[field])) {
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

const checkExistingSave = async (uId, saveId, res) => {
  const result = await executeQuery(`SELECT * FROM savedata WHERE userId = ? AND saveId = ?`, [uId, saveId], `Query to check existing save`, res, "");
  return result[1].data.length > 0;
};

const updateSave = async (uId, save, res) => {
  const updateQuery = `
      UPDATE savedata, jobsTbl
      SET savedata.lvl = ?, savedata.time = ?, savedata.money = ?, savedata.cpuId = ?, savedata.gpuId = ?, savedata.ramId = ?, savedata.stgId = ?, savedata.lastBought = ?, jobsTbl.encryptedJobs = ?
      WHERE savedata.userId = ? AND savedata.saveId = ?  AND jobsTbl.userId = ? AND jobsTbl.saveId = (SELECT id FROM savedata WHERE saveId = ?)
  `;

  const updateValues = [
    save.lvl, save.time, save.money, save.cpuId, save.gpuId, save.ramId, save.stgId, save.lastBought, save.jobs,
    uId, save.saveId, uId, save.saveId
  ];

  await executeQuery(updateQuery, updateValues, `Query to update save`, res, "Save updated successfully");
}

const createSave = async (uId, saveId, res) => {
  const insertQuery = `CALL createFirstSaveFile(?,?)`;

  const insertValues = [
    saveId, uId
  ];

  await executeQuery(insertQuery, insertValues, `Query to create save`, res, "Save created successfully");
};

const createSaveIfNotExists = async (uId, save, res) => {
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
  checkExistingSave,
  updateSave,
  createSave,
  createSaveIfNotExists
};