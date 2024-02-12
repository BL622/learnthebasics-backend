const { executeQuery, tryCatch, log, checkExistingSave, updateSave, createSave } = require('../sharedFunctions/functions');


const adminController = {
    getTableNames: async function (req, res) {
        await tryCatch(
            async () => {
                log('Admin page data:');
                const query = 'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA LIKE ?';
                const tableName = 'learnthebasics'
                const results = await executeQuery(query, tableName, 'Query to get all table names!', res);
                log(results, 'success');
                return [200, { message: "Saves updated or created successfully", data: results }]
            },
            "Error during table names query",
            res,
            "Successful query"
        )
    },
};

module.exports = {adminController};