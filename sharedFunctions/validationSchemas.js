const { body } = require('express-validator');

const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_.-]{4,24}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%?&^])[A-Za-z\d@.#$!%?&]{7,23}$/;
const tokenRegex = /^[0-9a-f]{24}\.[0-9a-f]+:[0-9a-f]+.[0-9a-f]+$/;
const authCodeRegex = /^(?:[a-zA-Z][a-zA-Z0-9_.-]{4,24})\s(?:[0-9a-f]{24}\.[0-9a-f]+:[0-9a-f]+.[0-9a-f]+)$/;
const saveIdRegex = /^(?=.*[a-zA-Z0-9_.-]).{1,20}$/;

const tableNames = ['cpuTbl', 'gpuTbl', 'ramTbl', 'savedata', 'statsTbl', 'stgTbl', 'userTbl'];


const registerPlayerSchema = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('username').matches(usernameRegex).withMessage('Invalid username'),
  body('password').matches(passwordRegex).withMessage('Invalid password'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password and Confirm Password do not match');
    }
    return true;
  })
];

const loginSchema = [
  body('username').matches(usernameRegex).withMessage('Invalid username'),
  body('password').matches(passwordRegex).withMessage('Invalid password')
];

const forgotPasswordSchema = [
  body('email').isEmail().withMessage('Invalid email address')
];

const validateResetTokenSchema = [
  body('token').matches(tokenRegex).withMessage('Invalid token')
];

const resetPasswordSchema = [
  body('password').matches(passwordRegex).withMessage('Invalid new password'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password and Confirm Password do not match');
    }
    return true;
  })
];

const getSavesSchema = [
  body('authCode').matches(authCodeRegex).withMessage('Invalid user token')
];

const setSavesOrUpdateSchema = [
  body('authCode').matches(authCodeRegex).notEmpty().withMessage('Invalid user token'),
  body('data.*.saveId').isString().notEmpty().matches(saveIdRegex).withMessage('Invalid save ID'),
  body('data.*.lvl').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid level'),
  body('data.*xp').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid xp value'),
  body('data.*.money').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid money'),
  body('data.*.time').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid time'),
  body('data.*.cpuId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid CPU ID'),
  body('data.*.gpuId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid GPU ID'),
  body('data.*.ramId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid RAM ID'),
  body('data.*.stgId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid storage ID'),
  body('data.*.lastBought').optional().isString().notEmpty().withMessage('Invalid last bought'),
  body('data.*.jobs').optional().notEmpty().withMessage('Invalid jobs')
];

const deleteSaveSchema = [
  body('authCode').matches(authCodeRegex).notEmpty().withMessage('Invalid user token'),
  body('saveId').isString().notEmpty().matches(saveIdRegex).withMessage('Invalid save ID')
];

const isAdminSchema = [
  body('authCode').matches(authCodeRegex).notEmpty().withMessage('Invalid user token')
];

const getRowsByTableNameSchema = [
  body('tableName')
    .isString().withMessage('Table name must be a string')
    .isIn(tableNames)
    .withMessage('Invalid table name')
];

const insertAndUpdateRowsSchema = [
  body('tableName').isString().withMessage('Table name must be a string').isIn(tableNames).withMessage('Invalid table name'),
  body('data.*.hardwareId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid hardwareId'),
  body('data.*.name').optional().isLength({ max: 50 }).withMessage('Name must be less than 50 characters'),
  body('data.*.description').optional().isLength({ max: 255 }).withMessage('Description must be less than 255 characters'),
  body('data.*.company').optional().isLength({ max: 50 }).withMessage('Company must be less than 50 characters'),
  body('data.*.price').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid price'),
  body('data.*.saveId').optional().isString().notEmpty().matches(saveIdRegex).withMessage('Invalid save ID'),
  body('data.*.lvl').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid level'),
  body('data.*xp').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid xp value'),
  body('data.*.money').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid money'),
  body('data.*.time').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid time'),
  body('data.*.cpuId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid CPU ID'),
  body('data.*.gpuId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid GPU ID'),
  body('data.*.ramId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid RAM ID'),
  body('data.*.stgId').optional().isInt({ min: -128, max: 127 }).withMessage('Invalid storage ID'),
  body('data.*.lastBought').optional().isString().notEmpty().withMessage('Invalid last bought'),
  body('data.*.userId').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid userId'),
  body('data.*.missionComp').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid missionComp'),
  body('data.*.missionFast').optional().isInt({ min: -2147483648, max: 2147483647 }).withMessage('Invalid missionFast'),
  body('data.*.uid').isInt().optional(),
  body('data.*.email').isEmail().optional(),
  body('data.*.username').optional().isString().notEmpty().matches(usernameRegex).withMessage('Invalid username'),
  body('data.*.password').optional().isString().notEmpty().matches(passwordRegex).withMessage('Invalid password'),
  body('data.*.isAdmin').optional().isInt({ min: 0, max: 1 }).optional(),
  body('data.*.passwordResetToken').isString().matches(tokenRegex).optional()
];


module.exports = {
  registerPlayerSchema,
  loginSchema,
  forgotPasswordSchema,
  validateResetTokenSchema,
  resetPasswordSchema,
  getSavesSchema,
  setSavesOrUpdateSchema,
  deleteSaveSchema,
  isAdminSchema,
  getRowsByTableNameSchema,
  insertAndUpdateRowsSchema,
}