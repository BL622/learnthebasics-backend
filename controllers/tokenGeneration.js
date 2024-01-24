const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.SECRET_KEY , { expiresIn: '1m' });
}

module.exports = { generateToken };