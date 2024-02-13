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
                const tableName = 'learnthebasics'
                const results = await executeQuery(query, tableName, 'Query to get all table names!', res, 'Table names select was successful');
                return results
            },
            "Error during table names query",
            res,
            "Successful query"
        )
    },
};

module.exports = {adminController};