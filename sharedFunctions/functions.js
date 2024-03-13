const db = require("../config/db");
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
    return await bcrypt.hash(password, 10)
}

async function compareHash(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword)
}


module.exports = { executeQuery, generateHash, compareHash };