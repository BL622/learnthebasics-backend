// const { executeQuery, tryCatch, log, } = require('../sharedFunctions/functions');
// const { decryptToken } = require('./tokenGeneration');


// const adminController = {
//     isAdmin: async function (req, res) {
//         const authCode = req.body.authCode;
//         const [username, token] = authCode.split(' ');
//         await tryCatch(
//             "Error during isAdmin check",
//             res,
//             "Successful validation",
//             async () => {
//                 log('Admin checking:');
//                 const decodedToken = decryptToken(token);
//                 log(decodedToken, 'info')
//                 const isAdminQuery = `SELECT isAdmin FROM userTbl WHERE uid = ?`;
//                 const value = decodedToken.uid;
//                 const result = await executeQuery(isAdminQuery, value, 'IsAdmin query', res, 'User validation was successful');

//                 result[1].data[0].isAdmin = !!result[1].data[0].isAdmin;
//                 return result


//             }
//         )
//     },
//     getTableNames: async function (req, res) {
//         await tryCatch(
//             "Error during table names query",
//             res,
//             "Successful query",
//             async () => {
//                 log('Admin page data:');
//                 const query = 'SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?';
//                 const databaseName = 'learnthebasics'
//                 const results = await executeQuery(query, databaseName, 'Query to get all table names!', res, 'Table names select was successful');
//                 return results
//             }
//         )
//     },
//     getRowsByTableName: async function (req, res) {
//         const { tableName } = req.body;
//         await tryCatch(
//             "Error during select all data by table name",
//             res,
//             'Successful selection',
//             async () => {
//                 log('Select table rows');
//                 const query = 'SELECT * FROM ' + tableName;
//                 const results = await executeQuery(query, '', `Query to select all rows from table ${tableName}`, res, 'Table rows select was successful');
//                 if (tableName === "userTbl") {
//                     results[1].data.forEach(element => {
//                         element.isAdmin = !!element.isAdmin;
//                     })
//                 }
//                 return results;
//             }
//         )
//     },

//     insertRows: async function (req, res) {
//         await tryCatch(
//             "Error during data insertion",
//             res,
//             "Successful insert",
//             async () => {
//                 log('Inserting new rows');
//                 const insertQuery = `INSERT INTO ${req.body.tableName} SET ?`
//                 const result = await executeQuery(insertQuery, [req.body.data[0]], `Inserting new row into ${req.body.tableName}`, res, "Successful data insertion");
//                 log(result, 'info')
//                 return result;
//             }
//         )
//     },

//     updateRows: async function (req, res) {
//         await tryCatch(
//             "Error during update",
//             res,
//             "Successful update",
//             async () => {
//                 log('Updating rows');
//                 const updateQuery = `UPDATE ${req.body.tableName} SET ? WHERE ${Object.keys(req.body.data[0])[0]} = ?`;
//                 const result = await executeQuery(updateQuery, [req.body.data[0], Object.values(req.body.data[0])[0]], `Update ${req.body.tableName}`, res, "Successful update");
//                 log(result[1].data.changedRows, 'error');
//                 if (result[1].data.changedRows === 0) {
//                     result[0] = 304;
//                 }
//                 return result
//             }
//         )
//     },

//     deleteRows: async function (req, res) {

//         await tryCatch(
//             "Error during delete",
//             res,
//             "Successful delete",
//             async () => {
//                 log('Delete rows');
//                 const deleteQuery = `DELETE FROM ${req.body.tableName} WHERE ${Object.values(req.body)[1]} = ?`;
//                 const result = await executeQuery(deleteQuery, Object.values(req.body)[2], `Delete from ${req.body.tableName} by id: ${Object.values(req.body)[1]}`, res, "Successful update");
//                 return result;
//             }
//         )
//     }

// };

// module.exports = { adminController };

const { validationResult } = require("express-validator");

const Apiresponse = require("../sharedFunctions/response");
const { executeQuery, generateHash, compareHash } = require('../sharedFunctions/functions');
const { decryptToken } = require('./tokenGeneration');

const mysql = require('mysql2')

async function isAdmin(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const [username, token] = req.body.authCode.split(' ');

    console.log("Admin checking:");

    const decodedToken = decryptToken(token);

    const query = "SELECT isAdmin FROM userTbl WHERE uid = ?";
    const adminRes = await executeQuery(query, decodedToken.uid);

    if (adminRes[0].isAdmin == true && adminRes[0].isAdmin == decodedToken.isAdmin) adminRes[0].isAdmin = !!adminRes[0].isAdmin;
    else adminRes[0].isAdmin = !!adminRes[0].isAdmin;

    return Apiresponse.ok(res, { message: "User validation was successful", data: [{ isAdmin: adminRes[0].isAdmin }] })
}

async function getTableNames(req, res) {
    const query = "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?";
    const tableNameRes = await executeQuery(query, 'learnthebasics');

    return Apiresponse.ok(res, { message: "Table names select was successful", data: tableNameRes })
}

async function getRowsByTableName(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const request = req.body;

    const query = "SELECT * FROM ??";
    const tableRowsRes = await executeQuery(query, [request.tableName]);

    if (request.tableName === "userTbl") tableRowsRes.map(element => ({ ...element, isAdmin: element.isAdmin = !!element.isAdmin }));

    Apiresponse.ok(res, { message: "Table rows select was successful", data: tableRowsRes })
}

async function insertRows(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const request = req.body;

    const query = "INSERT INTO ?? SET ?";
    if (request.tableName === "userTbl") request.data[0] = { ...request.data[0], password: await generateHash(request.data[0].password) };

    console.log(request.data)

    const insertRes = await executeQuery(query, [[request.tableName], request.data[0]]);

    console.log(insertRes)
    if (!!insertRes.errno) return Apiresponse.duplicate(res, insertRes.sqlMessage);
    return Apiresponse.created(res, { message: "Successful data insertion", data: [insertRes] })
}

async function updateRows(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const request = req.body;
    const nameOfKey = Object.keys(request.data[0])[0];
    const id = Object.values(request.data[0])[0];
    delete request.data[0][nameOfKey];

    let query = "SELECT * FROM ?? WHERE ?? = ?";
    const changeCheck = await executeQuery(query, [request.tableName, nameOfKey, id]);

    let updatedData = { ...request.data[0] };

    for (const key of Object.keys(updatedData)) {
        if (changeCheck[0].hasOwnProperty(key) && updatedData[key] === changeCheck[0][key]) delete updatedData[key];
    }

    console.log(updatedData)
    if (request.tableName === "userTbl" && await compareHash(updatedData.password, changeCheck[0].password) === true) delete updatedData.password;
    else if (request.tableName === "userTbl" && await compareHash(updatedData.password, changeCheck[0].password) === false) updatedData = { ...updatedData, password: await generateHash(updatedData.password) };

    if (Object.keys(updatedData).length === 0) return Apiresponse.notModified(res, "No values changed");

    query = "UPDATE ?? SET ? WHERE ?? = ?";
    const updateRes = await executeQuery(query, [[request.tableName], updatedData, [nameOfKey], id]);

    return Apiresponse.ok(res, { message: "Update was successful", data: updateRes })
}

async function deleteRows(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const request = req.body;
    const query = "DELETE FROM ?? WHERE ?? = ?";

    const deleteRes = await executeQuery(query,[[request.tableName], [request.fieldName], request.fieldValue]);

    return Apiresponse.ok(res, {message: `Delete from ${request.tableName} by id: ${request.fieldValue} was successful`, data: deleteRes});
}

module.exports = { isAdmin, getTableNames, getRowsByTableName, insertRows, updateRows, deleteRows }