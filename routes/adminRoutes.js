const express = require('express');
const router = express.Router();
const { isAdmin, getTableNames, getRowsByTableName, insertRows, updateRows, deleteRows } = require('../controllers/adminController');
const { isAdminSchema, getRowsByTableNameSchema, insertAndUpdateRowsSchema} = require('../sharedFunctions/validationSchemas')

router.post('/isAdmin', isAdminSchema, (req, res) => isAdmin(req, res));
router.get('/getTableNames', (req, res) => getTableNames(req, res));
router.post('/getTableRows', getRowsByTableNameSchema, (req, res) => getRowsByTableName(req, res));
router.post('/insertRows', insertAndUpdateRowsSchema, (req, res) => insertRows(req, res));
router.post('/updateRows', insertAndUpdateRowsSchema, (req, res) => updateRows(req, res));
router.post('/deleteRows', (req, res) => deleteRows(req, res));

module.exports = router;