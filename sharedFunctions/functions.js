const db = require("../config/db");
const { createToken } = require('../controllers/tokenGeneration');
const bcrypt = require('bcrypt');

async function executeQuery(query, values) {
  const connection = await db.pool.getConnection();
  try {
    const [queryRes] = await connection.query(query, values);
    return queryRes;
  } catch (error) {
    return error;
  } finally {
    connection.release();
  }
}

async function generateHash(password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return hashedPassword
}

async function compareHash(password, hashedPassword) {
  const passwordMatch = await bcrypt.compare(password, hashedPassword);
  return passwordMatch
}


module.exports = { executeQuery, generateHash, compareHash };