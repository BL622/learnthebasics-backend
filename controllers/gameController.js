// const { executeQuery, tryCatch, log, checkExistingSave, updateSave, createSave, createSaveIfNotExists } = require('../sharedFunctions/functions');
// const { decryptToken } = require('./tokenGeneration');


// const gameController = {

//     getSaves: async function (req, res) {
//         const authCode = req.body.authCode;
//         const [username, token] = authCode.split(' ');

//         await tryCatch(
//             "Error fetching saves",
//             res,
//             "",
//             async () => {
//                 const decodedToken = decryptToken(token);

//                 if (decodedToken.username !== username) {
//                     log("Username in the token does not match the provided username", 'error');
//                     return [400, { error: "Username in the token does not match the provided username" }];
//                 }

//                 const uId = decodedToken.uid;

//                 const query = `
//       SELECT saveId, lvl, time, money, cpuId, gpuId, ramId, stgId, lastBought
//       FROM savedata
//       WHERE userId = ?
//       ORDER BY lastModified DESC
//     `;
//                 const savesResults = await executeQuery(query, uId, res, 'Player found!');

//                 if (savesResults[1].data.length === 0) {
//                     log("User doesn't have saves!", 'info');
//                     return [404, { message: "User doesn't have saves!" }];
//                 }

//                 log("Saves retrieved successfully", 'success');
//                 return [savesResults[0], { message: "Saves retrieved successfully", data: savesResults[1].data }];
//             }
//         );
//     },

//     setSavesOrUpdate: async function (req, res) {
//         const authCode = req.body.authCode;
//         const [username, token] = authCode.split(' ');

//         await tryCatch(
//             "Error updating or creating saves",
//             res,
//             "",
//             async () => {
//                 const decodedToken = decryptToken(token);
//                 if (decodedToken.username !== username) {
//                     log("Username in the token does not match the provided username", 'error');
//                     return [400, { error: "Username in the token does not match the provided username" }];
//                 }

//                 const uId = decodedToken.uid;
//                 const savesData = req.body.data;

//                 const appType = req.headers['x-save-type'];
//                 switch (appType) {
//                     case null:
//                         for (const save of savesData) {
//                             const saveId = save.id;
//                             const existingSave = await checkExistingSave(uId, saveId, res);

//                             if (existingSave) {
//                                 // Save exists 
//                                 log(`Save with ID ${saveId} already exists`, 'info');
//                                 return [450, { message: `Would you like to override your  existing save with this name?`}]

//                             } else {
//                                 // Create new save
//                                 await createSave(uId, saveId, res);
//                                 log(`Save with ID ${saveId} created successfully`, 'success');
//                             }
//                         }
//                         break;
//                     case "update":
//                         for (const save of savesData) {
//                             const saveId = save.id;
//                             const existingSave = await checkExistingSave(uId, saveId, res);

//                             if (existingSave) {
//                                 // Update existing save
//                                 await updateSave(uId, save, res);
//                                 log(`Save with ID ${saveId} updated successfully`, 'success');
//                             } else {
//                                 // Create new save
//                                 await createSaveIfNotExists(uId, save, res);
//                                 log(`Save with ID ${saveId} created successfully`, 'success');
//                             }
//                         };
//                         break;
//                     case "override":
//                         const overrideQuery = `UPDATE savedata SET lvl=0,money=0,time=0,cpuId=0,gpuId=0,ramId=0,stgId=0,lastBought='{\"cpu\":0,\"gpu\":0,\"ram\":0,\"stg\":0}' WHERE userId = ? AND saveId = ?`;
//                         const overrideValues = [savesData.id, uId];
//                         await executeQuery(overrideQuery, overrideValues, 'Overriding existing savefile', res, 'Successful override');
//                         log(`Save with ID ${saveId} updated successfully`, 'success');
//                         break;
//                     default:
//                         break;
//                 }


//                 log("Saves updated or created successfully", 'success');
//                 return [200, { message: "Saves updated or created successfully" }];
//             }
//         );
//     },
//     deleteSave: async function (req, res) {
//         const {authCode, saveId} = req.body;
//         const [username, token] = authCode.split(' ');

//         await tryCatch(
//             "Error during save delete",
//             res,
//             "",
//             async () => {
//                 const decodedToken = decryptToken(token);

//                 if (decodedToken.username !== username) {
//                     log("Username in the token does not match the provided username", 'error');
//                     return [400, { error: "Username in the token does not match the provided username" }];
//                 }

//                 const uId = decryptToken(token).uid;
//                 const deleteQuery = `DELETE FROM savedata WHERE userId = ? AND saveId = ?`;
//                 const values = [uId, saveId];
//                 const results = await executeQuery(deleteQuery, values, "Player save successfully deleted", res, 'Saves deleted successfully')
//                 return results;
//             }
//         )
//     }
// };

// module.exports = { gameController };


const { validationResult } = require("express-validator");

const Apiresponse = require("../sharedFunctions/response");
const { executeQuery } = require('../sharedFunctions/functions');
const { decryptToken } = require('./tokenGeneration');

async function updateSave(uId, values, saveId) {
    const query = "UPDATE savedata SET ? WHERE saveId = ? AND userId = ?";
    for (const save of values) {
        await executeQuery(query, [save, saveId, uId]);
    }

    return { success: true };
}

async function determineActionByHeader(appType, data, uId) {
    const saveId = data[0].saveId;
    delete data[0]["saveId"];
    let query = "SELECT * FROM savedata WHERE saveId = ? AND userId = ?";
    const existingSaveCheck = await executeQuery(query, [saveId, uId]);

    switch (appType) {
        case undefined:
            if (existingSaveCheck.length) return { error: "Would you like to override your existing save with this name?" };

            query = "CALL createFirstSaveFile(?,?)";
            await executeQuery(query, [saveId, uId]);

            break;
        case "update":
            if (existingSaveCheck.length) return await updateSave(uId, data, saveId);
            console.log("check")
            query = "INSERT INTO savedata SET ?";
            data[0] = Object.assign({userId: uId, saveId: saveId}, data[0])
            await executeQuery(query, data[0]);

            break;
        case "override":

            query = "UPDATE savedata SET lvl=0,money=0,time=0,cpuId=0,gpuId=0,ramId=0,stgId=0,lastBought='{\"cpu\":0,\"gpu\":0,\"ram\":0,\"stg\":0}' WHERE userId = ? AND saveId = ?";
            await executeQuery(query, [uId, saveId]);

            break;
    }

    return true;
}

async function getHardwareElements(req, res){
    const [cpu, gpu, ram, stg] = await Promise.all([
        executeQuery("SELECT * FROM `cpuTbl` ORDER BY hardwareId;"),
        executeQuery("SELECT * FROM `gpuTbl` ORDER BY hardwareId;"),
        executeQuery("SELECT * FROM `ramTbl` ORDER BY hardwareId;"),
        executeQuery("SELECT * FROM `stgTbl` ORDER BY hardwareId;")
    ].map(promise => promise.then(result => result)));
    console.log({ cpu, gpu, ram, stg })

    Apiresponse.ok(res, { cpu, gpu, ram, stg });
}

async function getSaves(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const [username, token] = req.body.authCode.split(" ");
    console.log("Get player saves:");

    const decodedToken = decryptToken(token);
    if (decodedToken.username !== username) return Apiresponse.badRequest(res, "Username in the token does not match the provided username");

    const query = "SELECT saveId, lvl, time, money, cpuId, gpuId, ramId, stgId, lastBought FROM savedata WHERE userId = ? ORDER BY lastModified DESC";
    const saveRes = await executeQuery(query, decodedToken.uid);

    if (saveRes.length === 0) return Apiresponse.notFound(res, "User doesn't have saves!");
    return Apiresponse.ok(res, { message: "Saves retrieved successfully", data: saveRes })
}

async function setSavesOrUpdate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const [username, token] = req.body.authCode.split(" ");
    const requestBody = req.body;

    const decodedToken = decryptToken(token);
    if (decodedToken.username !== username) return Apiresponse.badRequest(res, "Username in the token does not match the provided username");

    const determinedAction = await determineActionByHeader(req.headers["x-save-type"], requestBody.data, decodedToken.uid);
    if (!!determinedAction.error) return Apiresponse.overrideRequest(res, determinedAction.error);

    return Apiresponse.ok(res, { message: "Saves updated or created successfully" })
}

async function deleteSave(req, res){
    const errors = validationResult(req);
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const request = req.body;
    const [username, token] = request.authCode.split(" ");

    const decodedToken = decryptToken(token);
    if(decodedToken.username !== username) return ApiResponse.badRequest(res, "Username in the token does not match the provided username");

    const query = "DELETE FROM savedata WHERE userId = ? AND saveId = ?";
    const deleteRes = await executeQuery(query, [decodedToken.uid, request.saveId]);
    return Apiresponse.ok(res, {successMessage: "Saves deleted successfully", data: deleteRes});
}




module.exports = { getHardwareElements, getSaves, setSavesOrUpdate, deleteSave }