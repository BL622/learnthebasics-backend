const transporter = require('../config/emailConfig');
const fs = require('fs').promises;
const path = require('path');
const { log, ErrorHandler } = require('../sharedFunctions/functions');

async function readHtmlTemplate(templatePath) {
  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    const errorMessage = `Error reading HTML template from ${templatePath}: ${error.message}`;
    log(errorMessage, 'error');
    throw new Error(errorMessage);
  }
}

async function generateHtmlContent(templatePath, replacements) {
  try {
    let htmlTemplate = await readHtmlTemplate(templatePath);

    Object.entries(replacements).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      htmlTemplate = htmlTemplate.replace(placeholder, value);
    });

    return htmlTemplate;
  } catch (error) {
    const errorMessage = `Error generating HTML content: ${error.message}`;
    log(errorMessage, 'error');
    throw new Error(errorMessage);
  }
}

async function sendMail(mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);
    log(`Email sent successfully. Message ID: ${info.messageId}`, 'success');
    return { success: true, message: 'Email sent successfully.' };
  } catch (error) {
    const errorMessage = `Error sending email: ${error.message}`;
    log(errorMessage, 'error');
    throw new Error(errorMessage);
  }
}

async function sendPasswordResetEmail(userEmail, resetToken, username) {
  try {
    const resetLink = `http://localhost:3000/password-reset/${resetToken}`;

    const templatePath = path.join(__dirname, '..', 'emailStyles', 'index.html');
    const htmlContent = await generateHtmlContent(templatePath, {
      username,
      link: `<a href="${resetLink}" target="_blank">link</a>`,
    });

    const mailOptions = {
      from: 'noreply@learnthebasics.com',
      to: userEmail,
      subject: 'Password Reset',
      html: htmlContent,
    };

    return await sendMail(mailOptions);
  } catch (error) {
    ErrorHandler.handle(null, error, 'Error sending password reset email:');
    return { success: false, message: 'Error sending password reset email.', error };
  }
}

async function passwordResetSuccessful(userEmail, username) {
  try {
    const templatePath = path.join(__dirname, '..', 'emailStyles', 'successful.html');
    const htmlContent = await generateHtmlContent(templatePath, { username });

    const mailOptions = {
      from: 'noreply@learnthebasics.com',
      to: userEmail,
      subject: 'Password Reset Successful',
      html: htmlContent,
    };

    return await sendMail(mailOptions);
  } catch (error) {
    ErrorHandler.handle(null, error, 'Error sending successful reset email:');
    return { success: false, message: 'Error sending successful reset email.', error };
  }
}

module.exports = { sendPasswordResetEmail, passwordResetSuccessful };
