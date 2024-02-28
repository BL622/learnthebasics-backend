const { executeQuery, tryCatch, log, checkExistingSave, updateSave, createSave } = require('../sharedFunctions/functions');
const { decryptToken } = require('./tokenGeneration');


const adminController = {
    isAdmin: async function (req, res) {
        const authCode = req.body.authCode;
        const [username, token] = authCode.split(' ');
        await tryCatch(
            async () => {
                log('Admin checking:');
                const decodedToken = decryptToken(token);

                const isAdminQuery = `SELECT isAdmin FROM userTbl WHERE uid = ?`;
                const value = decodedToken.uid;
                const result = await executeQuery(isAdminQuery, value, 'IsAdmin query', res, 'User validation was successful');

                if (result[1].data[0].isAdmin == true && result[1].data[0].isAdmin === decodedToken.isAdmin) {
                    result[1].data[0].isAdmin = true;
                    return result
                }
                else {
                    result[1].data[0].isAdmin = false;
                    return result
                }

            },
            "Error during isAdmin check",
            res,
            "Successful validation"
        )
    },
    getTableNames: async function (req, res) {
        await tryCatch(
            async () => {
                log('Admin page data:');
                const query = 'SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?';
                const databaseName = 'learnthebasics'
                const results = await executeQuery(query, databaseName, 'Query to get all table names!', res, 'Table names select was successful');
                return results
            },
            "Error during table names query",
            res,
            "Successful query"
        )
    },
    getRowsByTableName: async function (req, res) {
        const { tableName } = req.body;
        await tryCatch(
            async () => {
                log('Select table rows');
                const query = 'SELECT * FROM ' + tableName;
                const results = await executeQuery(query, '', `Query to select all rows from table ${tableName}`, res, 'Table rows select was successful');
                if (tableName === "userTbl") {
                    results[1].data.forEach(element => {
                        if (element.isAdmin === 1) {
                            element.isAdmin = true;
                        } else {
                            element.isAdmin = false
                        }
                    })
                }
                return results;
            },
            "Error during select all data by table name",
            res,
            'Successful selection'
        )
    },

    insertRows: async function (req, res) {
        await tryCatch(
            async () => {
                log('Inserting new rows');
                const insertQuery = `INSERT INTO ${req.body.tableName} SET ?`
                log([req.body.data[0]], 'info')
                const result = await executeQuery(insertQuery, [req.body.data[0]], `Inserting new row into ${req.body.tableName}`, res, "Successful data insertion");
                return result;
            },
            "Error during data insertion",
            res,
            "Successful insert"
        )
    },

    updateRows: async function (req, res) {
        await tryCatch(
            async () => {
                log('Updating rows');
                const updateQuery = `UPDATE ${req.body.tableName} SET ? WHERE ${Object.keys(req.body.data[0])[0]} = ?`;
                log([req.body.data[0]], 'info')
                log([ Object.values(req.body.data[0])[0]], 'info')
                const result = await executeQuery(updateQuery, [req.body.data[0], Object.values(req.body.data[0])[0]], `Update ${req.body.tableName}`, res, "Successful update");
                return result
            },
            "Error during update",
            res,
            "Successful update"
        )
    },

    deleteRows: async function (req, res) {

        await tryCatch(
            async () => {
                log('Delete rows');
                const deleteQuery = `DELETE FROM ${req.body.tableName} WHERE ${Object.values(req.body)[1]} = ?`;
                log(Object.values(req.body)[2], 'info')
                log(Object.values(req.body)[1], 'info')
                const result = await executeQuery(deleteQuery, Object.values(req.body)[2], `Delete from ${req.body.tableName} by id: ${Object.values(req.body)[1]}`, res, "Successful update");
                return result;
            },
            "Error during delete",
            res,
            "Successful delete"
        )
    }

};

module.exports = { adminController };