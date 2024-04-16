const { log } = require('../sharedFunctions/logFunction');
const transporter = require('../config/emailConfig');
const {generatePasswordResetEmailContent, generatePasswordResetSuccessfulEmailContent} = require('../emailStyles/emailContents')

const LOG_PREFIX = 'Email Service: ';

const defaultEmailConfig = {
  sender: 'noreply@learnthebasics.com',
  passwordResetUrl: 'https://bgs.jedlik.eu/learnthebasics/password-reset/',
};

const errors = {
  sendingEmail: () => `${LOG_PREFIX}Error sending email`,
};

const sendMail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    log(`${LOG_PREFIX}Email sent successfully. Message ID: ${info.messageId}`, 'success');
    return { success: true, message: 'Email sent successfully.' };
  } catch (error) {
    const errorMessage = errors.sendingEmail();
    log(`${LOG_PREFIX}${errorMessage}: ${error.message}`, 'error');
    return { error: true, message: 'Email sending is not possible' };
  }
};

const sendPasswordResetEmail = async (userEmail, resetToken, username) => {
  const mailOptions = {
    from: defaultEmailConfig.sender,
    to: userEmail,
    subject: 'Password Reset',
    html: generatePasswordResetEmailContent(username, resetToken, defaultEmailConfig),
  };

  return sendMail(mailOptions);
};

const sendPasswordResetSuccessfulEmail = async (userEmail, username) => {
  const mailOptions = {
    from: defaultEmailConfig.sender,
    to: userEmail,
    subject: 'Password Reset Successful',
    html: generatePasswordResetSuccessfulEmailContent(username),
  };

  return sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail, sendPasswordResetSuccessfulEmail };
