const { executeQuery, tryCatch, log, checkExistingSave, updateSave, createSave, createSaveIfNotExists } = require('../sharedFunctions/functions');
const { decryptToken } = require('./tokenGeneration');


const gameController = {

    getSaves: async function (req, res) {
        const authCode = req.body.authCode;
        const [username, token] = authCode.split(' ');

        await tryCatch(
            async () => {
                const decodedToken = decryptToken(token);

                if (decodedToken.username !== username) {
                    log("Username in the token does not match the provided username", 'error');
                    return [400, { error: "Username in the token does not match the provided username" }];
                }

                const uId = decryptToken(token).uid;

                const query = `
      SELECT saveId, lvl, time, money, cpuId, gpuId, ramId, stgId, lastBought
      FROM savedata
      WHERE userId = ?
      ORDER BY last_modified DESC
    `;
                const savesResults = await executeQuery(query, uId, res, 'Player found!');

                if (savesResults[1].data.length === 0) {
                    log("User doesn't have saves!", 'info');
                    return [404, { message: "User doesn't have saves!" }];
                }

                log("Saves retrieved successfully", 'success');
                return [savesResults[0], { message: "Saves retrieved successfully", data: savesResults[1].data }];
            },
            "Error fetching saves",
            res
        );
    },

    setSavesOrUpdate: async function (req, res) {
        const authCode = req.body.authCode;
        const [username, token] = authCode.split(' ');

        await tryCatch(
            async () => {

                const uId = decryptToken(token).uid;
                const savesData = req.body.data;

                const appType = req.headers['x-save-type'];
                switch (appType) {
                    case null:
                        for (const save of savesData) {
                            const saveId = save.saveId;
                            const existingSave = await checkExistingSave(uId, saveId, res);
        
                            if (existingSave) {
                                // Save exists 
                                log(`Save with ID ${saveId} already exists`, 'info');
                                return [450, { message: `Would you like to override your  existing save with this name?`}]
                                
                            } else {
                                // Create new save
                                await createSave(uId, saveId, res);
                                log(`Save with ID ${saveId} created successfully`, 'success');
                            }
                        }
                        break;
                    case update:
                        for (const save of savesData) {
                            const saveId = save.saveId;
                            const existingSave = await checkExistingSave(uId, saveId, res);
        
                            if (existingSave) {
                                // Update existing save
                                await updateSave(uId, save, res);
                                log(`Save with ID ${saveId} updated successfully`, 'success');
                            } else {
                                // Create new save
                                await createSaveIfNotExists(uId, save, res);
                                log(`Save with ID ${saveId} created successfully`, 'success');
                            }
                        };
                        break;
                    case override:
                        const overrideQuery = `UPDATE savedata SET lvl=0,money=0,time=0,cpuId=0,gpuId=0,ramId=0,stgId=0,lastBought='{\"cpu\":0,\"gpu\":0,\"ram\":0,\"stg\":0}' WHERE userId = ? AND saveId = ?`;
                        const overrideValues = [savesData.saveId, uId];
                        await executeQuery(overrideQuery, overrideValues, 'Overriding existing savefile', res, 'Successful override');
                        log(`Save with ID ${saveId} updated successfully`, 'success');
                        break;
                    default:
                        break;
                }
                

                log("Saves updated or created successfully", 'success');
                return [200, { message: "Saves updated or created successfully" }];
            },
            "Error updating or creating saves",
            res
        );
    },
    deleteSave: async function (req, res) {
        const {authCode, saveId} = req.body;
        const [username, token] = authCode.split(' ');

        await tryCatch(
            async () => {
                const decodedToken = decryptToken(token);

                if (decodedToken.username !== username) {
                    log("Username in the token does not match the provided username", 'error');
                    return [400, { error: "Username in the token does not match the provided username" }];
                }
                
                const uId = decryptToken(token).uid;
                const deleteQuery = `DELETE FROM savedata WHERE userId = ? AND saveId = ?`;
                const values = [uId, saveId];
                const results = await executeQuery(deleteQuery, values, "Player save successfully deleted", res)
                return [200, { message: "Saves deleted successfully", data: results }];
            },
            "Error during save delete",
            res
        )
    }
};

module.exports = { gameController };