const { validationResult } = require("express-validator");

const Apiresponse = require("../sharedFunctions/response");
const { executeQuery } = require('../sharedFunctions/functions');
const { decryptToken } = require('./tokenGeneration');
const queries = require('../JSON documents/queries.json');
const { log } = require('../sharedFunctions/logFunction');
async function determineActionByHeader(appType, data, uId) {
    const saveId = data[0].saveId;
    delete data[0]["saveId"];
    log('Checking existing save', 'info')
    let query = queries.selectSavesByUidAndSaveId;
    const existingSaveCheck = await executeQuery(query, [saveId, uId]);

    log('Determine action:')
    switch (appType) {
        case undefined:
            log('Creating new save file:', 'info')
            if (existingSaveCheck.length) return { error: "Would you like to override your existing save with this name?" };

            query = queries.createFirstSave;
            await executeQuery(query, [saveId, uId]);

            break;
        case "update":
            log('Updating save file:', 'info');
            const encryptedJobs = data[0]["jobs"];
            const completedJobs = data[0]["completedJobs"] | 0;
            const fastestCompletion = data[0]["fastestCompletion"];
            const totalIncome = data[0]["totalIncome"] | 0;
            delete data[0]["jobs"];
            delete data[0]["completedJobs"];
            delete data[0]["fastestCompletion"];
            delete data[0]["totalIncome"];

            query = queries.updateSaveFile;
            await executeQuery(query, [data[0], encryptedJobs, completedJobs, fastestCompletion, totalIncome, saveId, uId, saveId, uId, uId]);

            break;
        case "override":
            log('Overriding save file:', 'info')
            query = queries.overrideSaveFile;
            await executeQuery(query, [uId, saveId, saveId, uId]);

            break;
    }

    return true;
}

async function getHardwareElements(req, res) {
    log('Getting hardware elements:');
    const [cpu, gpu, ram, stg] = await Promise.all([
        executeQuery(queries.selectCpus),
        executeQuery(queries.selectGpus),
        executeQuery(queries.selectRams),
        executeQuery(queries.selectStgs)
    ].map(promise => promise.then(result => result)));

    Apiresponse.ok(res, { cpu, gpu, ram, stg });
}

async function getSaves(req, res) {
    log('Getting save files for user');
    const errors = validationResult(req);
    log(errors.array[0], 'error');
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const [username, token] = req.body.authCode.split(" ");

    log('Decoding token:', 'info');
    const decodedToken = decryptToken(token);
    if (decodedToken.username !== username) return Apiresponse.badRequest(res, "Username in the token does not match the provided username");

    const query = queries.selectAllSavesForGame;
    const saveRes = await executeQuery(query, decodedToken.uid);

    if (saveRes.length === 0) return Apiresponse.ok(res, { data:[], message: "User doesn't have saves!" });
    log(saveRes, 'success')
    return Apiresponse.ok(res, { message: "Saves retrieved successfully", data: saveRes })
}

async function setSavesOrUpdate(req, res) {
    log('Updating saves or creating saves:')
    const errors = validationResult(req);
    log(errors.array[0], 'error');
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const [username, token] = req.body.authCode.split(" ");
    const request = req.body;
    const decodedToken = decryptToken(token);
    if (decodedToken.username !== username) return Apiresponse.badRequest(res, "Username in the token does not match the provided username");

    const determinedAction = await determineActionByHeader(req.headers["x-save-type"], request.data, decodedToken.uid);
    if (!!determinedAction.error) return Apiresponse.overrideRequest(res, determinedAction.error);

    log('Successful update or save', 'success')
    return Apiresponse.ok(res, { message: "Saves updated or created successfully" })
}

async function deleteSave(req, res) {
    log('Deleting save file:')
    const errors = validationResult(req);
    log(errors.array[0], 'error');
    if (!errors.isEmpty()) return Apiresponse.badRequest(res, errors.array()[0].msg);

    const request = req.body;
    const [username, token] = request.authCode.split(" ");

    const decodedToken = decryptToken(token);
    if (decodedToken.username !== username) return ApiResponse.badRequest(res, "Username in the token does not match the provided username");

    const query = queries.deleteSaveFile;
    const deleteRes = await executeQuery(query, [decodedToken.uid, request.saveId]);
    log(deleteRes, 'success')
    return Apiresponse.ok(res, { successMessage: "Saves deleted successfully", data: deleteRes });
}




module.exports = { getHardwareElements, getSaves, setSavesOrUpdate, deleteSave }