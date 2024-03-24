const fs = require('fs').promises;
const path = require('path');
const { log } = require('../sharedFunctions/logFunction')
const transporter = require('../config/emailConfig');

const LOG_PREFIX = 'Email Service: ';

const defaultEmailConfig = {
  sender: 'noreply@learnthebasics.com',
  stylesDir: path.join(__dirname, '..', 'emailStyles'),
  passwordResetUrl: 'https://bgs.jedlik.eu/learnthebasics/password-reset/',
};

const errors = {
  readingTemplate: templatePath => `${LOG_PREFIX}Error reading HTML template from ${templatePath}`,
  sendingEmail: () => `${LOG_PREFIX}Error sending email`,
};

const readHtmlTemplate = async templatePath => {
  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    throw new Error(errors.readingTemplate(templatePath), error);
  }
};

const replacePlaceholders = (template, replacements = {}) =>
  template?.replace(/{{(\w+)}}/g, (_, key) => replacements[key] || '');

const sendMail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    log(`${LOG_PREFIX}Email sent successfully. Message ID: ${info.messageId}`, 'success');
    return { success: true, message: 'Email sent successfully.' };
  } catch (error) {
    const errorMessage = errors.sendingEmail();
    log(`${LOG_PREFIX}${errorMessage}: ${error.message}`, 'error');
    return { error: true, message: 'Email sending is not possible' }
  }
};

const sendSpecializedEmail = async (userEmail, subject, templateFile, replacements = {}) => {
  const templatePath = path.join(defaultEmailConfig.stylesDir, `${templateFile}.html`);
  const htmlTemplate = await readHtmlTemplate(templatePath);
  const htmlContent = replacePlaceholders(htmlTemplate, replacements);

  const mailOptions = {
    from: defaultEmailConfig.sender,
    to: userEmail,
    subject,
    html: htmlContent,
  };

  return sendMail(mailOptions);
};

const sendPasswordResetEmail = (userEmail, resetToken, username) =>
  sendSpecializedEmail(userEmail, 'Password Reset', 'index',
    { username, link: `<a href="${defaultEmailConfig.passwordResetUrl}${resetToken}" target="_blank">link</a>` });

const passwordResetSuccessful = (userEmail, username) =>
  sendSpecializedEmail(userEmail, 'Password Reset Successful', 'successful', { username });

module.exports = { sendPasswordResetEmail, passwordResetSuccessful };
