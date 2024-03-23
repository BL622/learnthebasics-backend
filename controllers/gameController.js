const { validationResult } = require("express-validator");

const Apiresponse = require("../sharedFunctions/response");
const { executeQuery } = require('../sharedFunctions/functions');
const { decryptToken } = require('./tokenGeneration');


async function determineActionByHeader(appType, data, uId) {
    const saveId = data[0].saveId;
    delete data[0]["saveId"];
    log('Checking existing save', 'info')
    let query = "SELECT * FROM savedata WHERE saveId = ? AND userId = ?";
    const existingSaveCheck = await executeQuery(query, [saveId, uId]);

    log('Determine action:')
    switch (appType) {
        case undefined:
            log('Creating new save file:', 'info')
            if (existingSaveCheck.length) return { error: "Would you like to override your existing save with this name?" };

            query = "CALL createFirstSaveAndEmptyJob(?,?)";
            await executeQuery(query, [saveId, uId]);

            break;
        case "update":
            log('Updating save file:', 'info')
            const encryptedJobs = data[0]["jobs"];
            const completedJobs = data[0]["completedJobs"];
            const fastestCompletion = data[0]["fastestCompletion"];
            const totalIncome = data[0]["totalIncome"];
            delete data[0]["jobs"];
            delete data[0]["completedJobs"];
            delete data[0]["fastestCompletion"];
            delete data[0]["totalIncome"];

            query = "UPDATE savedata, jobsTbl, statsTbl SET ?, jobsTbl.encryptedJobs = ?, statsTbl.completedJobs = ?, statsTbl.fastestCompletion = ?, statsTbl.totalIncome = ? WHERE savedata.saveId = ? AND savedata.userId = ? AND jobsTbl.saveId = (SELECT id FROM savedata WHERE saveId = ?) AND jobsTbl.userId = ? AND statsTbl.saveId = (SELECT id FROM savedata WHERE saveId = ?) AND statsTbl.userId = ?";
            await executeQuery(query, [data[0], encryptedJobs, completedJobs, fastestCompletion, totalIncome, saveId, uId, saveId, uId, saveId, uId]);

            break;
        case "override":
            log('Overriding save file:', 'info')
            query = "UPDATE savedata, jobsTbl, statsTbl SET lvl=0,money=0,time=0,cpuId=0,gpuId=0,ramId=0,stgId=0,lastBought='{\"cpu\":0,\"gpu\":0,\"ram\":0,\"stg\":0}', jobsTbl.encryptedJobs = '#-#-#-#', statsTbl.completedJobs = 0, statsTbl.fastestCompletion = 0, statsTbl.totalIncome = null WHERE savedata.userId = ? AND savedata.saveId = ? AND jobsTbl.saveId = (SELECT id FROM savedata WHERE saveId = ?) AND jobsTbl.userId = ? AND statsTbl.saveId = (SELECT id FROM savedata WHERE saveId = ?) AND statsTbl.userId = ?";
            await executeQuery(query, [uId, saveId, saveId, uId, saveId, uId]);

            break;
    }

    return true;
}

async function getHardwareElements(req, res) {
    log('Getting hardware elements:');
    const [cpu, gpu, ram, stg] = await Promise.all([
        executeQuery("SELECT * FROM `cpuTbl` ORDER BY hardwareId;"),
        executeQuery("SELECT * FROM `gpuTbl` ORDER BY hardwareId;"),
        executeQuery("SELECT * FROM `ramTbl` ORDER BY hardwareId;"),
        executeQuery("SELECT * FROM `stgTbl` ORDER BY hardwareId;")
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

    const query = "SELECT savedata.saveId, lvl, time, money, cpuId, gpuId, ramId, stgId, lastBought, jobsTbl.encryptedJobs, statsTbl.completedJobs, statsTbl.fastestCompletion, statsTbl.totalIncome FROM jobsTbl INNER JOIN savedata ON jobsTbl.saveId = savedata.id INNER JOIN statsTbl ON statsTbl.saveId = savedata.id WHERE savedata.userId = ? ORDER BY lastModified DESC";
    const saveRes = await executeQuery(query, decodedToken.uid);

    if (saveRes.length === 0) return Apiresponse.notFound(res, "User doesn't have saves!");
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

    const query = "DELETE FROM savedata WHERE userId = ? AND saveId = ?";
    const deleteRes = await executeQuery(query, [decodedToken.uid, request.saveId]);
    log(deleteRes, 'success')
    return Apiresponse.ok(res, { successMessage: "Saves deleted successfully", data: deleteRes });
}




module.exports = { getHardwareElements, getSaves, setSavesOrUpdate, deleteSave }