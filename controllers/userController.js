const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_.-]{4,24}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%?&^])[A-Za-z\d@.#$!%?&]{7,23}$/;

const emailController = require("./emailController");
const tokenGeneration = require("./tokenGeneration");

async function executeQuery(query, values, res, successMessage) {
  try {
    const connection = await db.pool.getConnection();
    const [results] = await connection.query(query, values);

    connection.release();

    console.log(Date(), results);
    return [200, { message: successMessage, data: results }];
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ error: "Database query error" });
  }
};

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
        return 'Passwords do not match';
      }
    }
    else if (!inputs[field] || (regex && !regex.test(inputs[field]))) {
      return errorMessage;
    }
  }
  return null;
};


const playerController = {
  registerPlayer: async function (req, res) {
    const { email, username, password } = req.body;
    console.log(req.body);
    
    const validations = [
      { field: 'email', regex: emailRegex, errorMessage: 'Invalid email address', required: true },
      { field: 'username', regex: usernameRegex, errorMessage: 'Invalid username', required: true },
      { field: 'password', regex: passwordRegex, errorMessage: 'Invalid password', required: true },
      { field: 'confirmPassword', errorMessage: 'Invalid confirm password', required: true },
    ];

    const validationError = validateInputs(req.body, validations);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      // Check if email is already used
      const emailQuery = "SELECT * FROM userTbl WHERE email = ?";
      const usernameQuery = "SELECT * FROM userTbl WHERE username = ?";
      const emailCheck = await executeQuery(emailQuery, email, res, "");
      const usernameCheck = await executeQuery(
        usernameQuery,
        username,
        res,
        ""
      );

      if (emailCheck[1].data.length > 0) {
        return res.status(400).json({ error: "Email already in use!" });
      } else if (usernameCheck[1].data.length > 0) {
        return res.status(400).json({ error: "Username already exists!" });
      }

      // Password hashing
      const hashedPassword = await bcrypt.hash(password, 10);

      const query =
        "INSERT INTO userTbl (email, username, password)" + "VALUES (?,?,?)";

      const values = [email, username, hashedPassword];
      const registerSuccessMessage = "User registered successfully";
      const querySuccRegister = await executeQuery(
        query,
        values,
        res,
        registerSuccessMessage
      );
      res.status(querySuccRegister[0]).json(querySuccRegister[1]);
    } catch (error) {
      console.error("Error during user registration:", error);
      res
        .status(error.status || 500)
        .json({ error: error.message || "User registration failed" });
    }
  },

  loginUser: async function (req, res) {
    const { username, password } = req.body;
    console.log(req.body);

    const validations = [
      { field: 'username', regex: usernameRegex, errorMessage: 'Invalid username', required: true },
      { field: 'password', regex: passwordRegex, errorMessage: 'Invalid password', required: true },
    ];

    const validationError = validateInputs(req.body, validations);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const userQuery = "SELECT * FROM userTbl WHERE username = ? OR email = ?";
      const user = await executeQuery(userQuery, [username, username], res, "");

      if (user[1].data.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordMatch = await bcrypt.compare(
        password,
        user[1].data[0].password
      );
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid password" });
      }

      const informationSent = [
        user[1].data[0].username,
        user[1].data[0].password,
      ];

      res
        .status(200)
        .json({ message: "Login successful", data: informationSent });
    } catch (error) {
      console.error("Error during user login:", error);
      res.status(500).json({ error: "User login failed" });
    }
  },

  forgotPassword: async function (req, res) {
    const { email } = req.body;

    const validations = [
      { field: 'email', regex: emailRegex, errorMessage: 'Invalid email address', required: true },
    ];

    const validationError = validateInputs(req.body, validations);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const query = 'SELECT * FROM userTbl WHERE email = ?';
      const user = await executeQuery(query, email, res, '');

      if (user[1].data.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userToken = user[1].data[0].passwordResetToken;

      if (userToken) {
        try {
          const decoded = jwt.verify(userToken, process.env.SECRET_KEY);

          if (decoded.exp > Date.now() / 1000) {
            return res.status(400).json({ message: 'Password reset email has already been sent' });
          }
        } catch (decodeError) {
          console.error('Existing token verification failed or expired:', decodeError);

          const resetToken = tokenGeneration.generateToken(user[1].data[0].uid);

          console.log(resetToken);

          const updateQuery = 'UPDATE userTbl SET passwordResetToken = ? WHERE email = ?';
          const updateValues = [resetToken, email];
          await executeQuery(updateQuery, updateValues, res, '');

          const emailResult = await emailController.sendPasswordResetEmail(email, resetToken, user[1].data[0].username);

          if (emailResult.success) {
            return res.status(200).json({ message: 'New password reset email sent successfully' });
          } else {
            console.error('Error sending password reset email with new token:', emailResult.error);
            return res.status(500).json({ error: 'Error sending password reset email with new token.' });
          }
        }
      }


      const resetToken = tokenGeneration.generateToken(user[1].data[0].uid);

      console.log(resetToken);

      const updateQuery = 'UPDATE userTbl SET passwordResetToken = ? WHERE email = ?';
      const updateValues = [resetToken, email];
      await executeQuery(updateQuery, updateValues, res, '');

      // Send password reset email
      const emailResult = await emailController.sendPasswordResetEmail(email, resetToken, user[1].data[0].username);

      console.log(user[1].data[0])
      if (emailResult.success) {
        res.status(200).json({ message: 'Password reset email sent successfully' });
      } else {
        res.status(500).json({ error: 'Error sending password reset email.' });
      }
    } catch (error) {
      console.error('Error during password reset token generation:', error);
      res.status(500).json({ error: 'Reset token set failed' });
    }
  },


  resetPassword: async function (req, res) {
    const { resetToken, password } = req.body;
  
    const validations = [
      { field: 'newPassword', regex: passwordRegex, errorMessage: 'Invalid new password', required: true },
      { field: 'confirmPassword', errorMessage: 'Invalid confirm password', required: true },
    ];

    const validationError = validateInputs(req.body, validations);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
  
    try {
  
      const query = "SELECT * FROM userTbl WHERE uid = ? AND passwordResetToken = ?";
      const results = await executeQuery(query, [decoded.userId, resetToken], res, "");
  
      if (results[1].data.length === 0) {
        return res.status(400).json({ message: "Invalid reset token" });
      }
  
      const user = results[1].data[0];
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Update user's password and mark the reset token as used
      const updateQuery = "UPDATE userTbl SET password = ?, passwordResetToken = null WHERE uid = ?";
      await executeQuery(updateQuery, [hashedPassword, user.uid], res, "");
  
      const emailResult = await emailController.passwordResetSuccessful(user.email, user.username);
  
      if (emailResult.success) {
        return res.status(200).json({
          message: "Password reset was successful and password changed email sent successfully",
        });
      } else {
        return res.status(500).json({ error: "Error sending the password changed email" });
      }
    } catch (error) {
      console.error("Error during password reset:", error);
      return res.status(400).json({ message: "Invalid reset token" });
    }
  },  
};

module.exports = { playerController, executeQuery };
