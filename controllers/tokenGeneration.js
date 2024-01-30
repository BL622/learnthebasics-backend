const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: '1h' });
};


const secretKey = Buffer.from('My6VoJly9V2d9qJpIkZgD5V7cHokeCdr', 'utf-8');

const createToken = (userData, expirationTimeInMinutes = null) => {

  // Timestamps
  const currentTime = Math.floor(Date.now() / 1000);

  const tokenData = {
    uid: userData.uid,
    username: userData.username,
    hashedPassword: userData.password, 
    isAdmin: userData.isAdmin,
    created_at: currentTime,
  };

  if (expirationTimeInMinutes !== null) {
    const expirationTime = currentTime + expirationTimeInMinutes * 60;
    tokenData.expires_at = expirationTime;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv);

  let encryptedToken = cipher.update(JSON.stringify(tokenData), 'utf-8', 'hex');
  encryptedToken += cipher.final('hex');

  const hmac = crypto.createHmac('sha256', secretKey);
  const ciphertextWithTag = encryptedToken + ':' + cipher.getAuthTag().toString('hex');
  const signature = hmac.update(ciphertextWithTag).digest('hex');

  const finalToken = `${iv.toString('hex')}.${ciphertextWithTag}.${signature}`;

  return finalToken;
};

const decryptToken = (token) => {
  const [receivedIV, receivedCiphertextWithTag, receivedSignature] = token.split('.');
  const receivedAuthTag = Buffer.from(receivedCiphertextWithTag.slice(-32), 'hex');
  const receivedCiphertext = receivedCiphertextWithTag.slice(0, -33);

  const hmac = crypto.createHmac('sha256', secretKey);
  const calculatedSignature = hmac.update(receivedCiphertextWithTag).digest('hex');

  if (calculatedSignature !== receivedSignature) {
    throw new Error('Token is invalid: Signature mismatch');
  }

  // Decryption
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, Buffer.from(receivedIV, 'hex'));
  decipher.setAuthTag(receivedAuthTag);

  let decryptedToken = decipher.update(receivedCiphertext, 'hex', 'utf-8');
  decryptedToken += decipher.final('utf-8');

  const tokenData = JSON.parse(decryptedToken);

  return tokenData;
};

module.exports = { generateToken, createToken, decryptToken };