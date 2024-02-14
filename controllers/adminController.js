const { executeQuery, tryCatch, log, checkExistingSave, updateSave, createSave } = require('../sharedFunctions/functions');
const {decryptToken} = require('./tokenGeneration');


const adminController = {
    isAdmin: async function (req, res){
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
                else{
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
        const {tableName} = req.body;
        await tryCatch(
            async () => {
                log('Select table rows');
                const query = 'SELECT * FROM ' + tableName;
                const results = await executeQuery(query, '', `Query to select all rows from table ${tableName}`, res, 'Table rows select was successful');
                if(tableName === "userTbl"){
                results[1].data.forEach(element => {
                    if (element.isAdmin === 1) {
                        element.isAdmin = true;
                    }else{
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
    }
};

module.exports = {adminController};