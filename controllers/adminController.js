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
    if (request.tableName === "userTbl" && (await compareHash(updatedData.password, changeCheck[0].password))) delete updatedData.password;
    else if (request.tableName === "userTbl" && !(await compareHash(updatedData.password, changeCheck[0].password))) updatedData = { ...updatedData, password: await generateHash(updatedData.password) };

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