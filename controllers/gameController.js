const db = require('../config/db');
const { executeQuery, getUserIdByUsername, tryCatch, checkExistingSave, updateSave, createSave } = require('../sharedFunctions/functions');


const gameController = {

    getSaves: async function (req, res) {
        const authCode = req.body.authCode;
        const username = authCode.split(' ')[0];

        await tryCatch(
            async () => {
                const uId = await getUserIdByUsername(username, res);

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
        const username = authCode.split(' ')[0];

        await tryCatch(
            async () => {
                const uId = await getUserIdByUsername(username, res);

                const savesData = req.body.data;

                for (const save of savesData) {
                    const saveId = save.saveId;
                    const existingSave = await checkExistingSave(uId, saveId, res);

                    if (existingSave) {
                        // Update existing save
                        await updateSave(uId, save, res);
                        log(`Save with ID ${saveId} updated successfully`, 'success');
                    } else {
                        // Create new save
                        await createSave(uId, save, res);
                        log(`Save with ID ${saveId} created successfully`, 'success');
                    }
                }

                log("Saves updated or created successfully", 'success');
                return [200, { message: "Saves updated or created successfully" }];
            },
            "Error updating or creating saves",
            res
        );
    },
};

module.exports = { gameController };