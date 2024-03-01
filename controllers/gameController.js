const {
  executeQuery,
  tryCatch,
  log,
  checkExistingSave,
  updateSave,
  createSave,
  createSaveIfNotExists,
} = require("../sharedFunctions/functions");
const { decryptToken } = require("./tokenGeneration");

const gameController = {
  getSaves: async function (req, res) {
    const authCode = req.body.authCode;
    const [username, token] = authCode.split(" ");

    await tryCatch(
      async () => {
        const decodedToken = decryptToken(token);

        if (decodedToken.username !== username) {
          log(
            "Username in the token does not match the provided username",
            "error"
          );
          return [
            400,
            {
              error:
                "Username in the token does not match the provided username",
            },
          ];
        }

        const uId = decodedToken.uid;

        const query = `
      SELECT saveId, lvl, time, money, cpuId, gpuId, ramId, stgId, lastBought
      FROM savedata
      WHERE userId = ?
      ORDER BY lastModified DESC
    `;
        const savesResults = await executeQuery(
          query,
          uId,
          res,
          "Player found!"
        );

        if (savesResults[1].data.length === 0) {
          log("User doesn't have saves!", "info");
          return [404, { message: "User doesn't have saves!" }];
        }

        log("Saves retrieved successfully", "success");
        return [
          savesResults[0],
          {
            message: "Saves retrieved successfully",
            data: savesResults[1].data,
          },
        ];
      },
      "Error fetching saves",
      res
    );
  },

  setSavesOrUpdate: async function (req, res) {
    const authCode = req.body.authCode;
    const [username, token] = authCode.split(" ");

    await tryCatch(
      async () => {
        const decodedToken = decryptToken(token);
        if (decodedToken.username !== username) {
          log(
            "Username in the token does not match the provided username",
            "error"
          );
          return [
            400,
            {
              error:
                "Username in the token does not match the provided username",
            },
          ];
        }

        const uId = decodedToken.uid;
        const savesData = req.body.data;

        const appType = req.headers["x-save-type"];
        switch (appType) {
          case undefined:
            log("test", "info");
            for (const save of savesData) {
              const saveId = save.saveId;
              const existingSave = await checkExistingSave(uId, saveId, res);

              if (existingSave) {
                // Save exists
                log(`Save with ID ${saveId} already exists`, "info");
                return [
                  450,
                  {
                    message: `Would you like to override your  existing save with this name?`,
                  },
                ];
              } else {
                // Create new save
                await createSave(uId, saveId, res);
                log(`Save with ID ${saveId} created successfully`, "success");
              }
            }
            break;
          case "update":
            for (const save of savesData) {
              const saveId = save.saveId;
              const existingSave = await checkExistingSave(uId, saveId, res);
              log(existingSave, 'info')
              if (existingSave) {
                // Update existing save
                log(save);
                await updateSave(uId, save, res);
                log(`Save with ID ${saveId} updated successfully`, "success");
              } else {
                // Create new save
                await createSaveIfNotExists(uId, save, res);
                log(`Save with ID ${saveId} created successfully`, "success");
              }
            }
            break;
          case "override":
            const overrideQuery = `UPDATE savedata SET lvl=0,money=0,time=0,cpuId=0,gpuId=0,ramId=0,stgId=0,lastBought='{\"cpu\":0,\"gpu\":0,\"ram\":0,\"stg\":0}' WHERE userId = ? AND saveId = ?`;
            const overrideValues = [uId, savesData[0].saveId];
            await executeQuery(
              overrideQuery,
              overrideValues,
              "Overriding existing savefile",
              res,
              "Successful override"
            );
            log(`Save with ID ${savesData[0].saveId} updated successfully`, "success");
            break;
          default:
            break;
        }

        log("Saves updated or created successfully", "success");
        return [200, { message: "Saves updated or created successfully" }];
      },
      "Error updating or creating saves",
      res
    );
  },
  deleteSave: async function (req, res) {
    const { authCode, saveId } = req.body;
    const [username, token] = authCode.split(" ");

    await tryCatch(
      async () => {
        const decodedToken = decryptToken(token);

        if (decodedToken.username !== username) {
          log(
            "Username in the token does not match the provided username",
            "error"
          );
          return [
            400,
            {
              error:
                "Username in the token does not match the provided username",
            },
          ];
        }

        const uId = decryptToken(token).uid;
        const deleteQuery = `DELETE FROM savedata WHERE userId = ? AND saveId = ?`;
        const values = [uId, saveId];
        const results = await executeQuery(
          deleteQuery,
          values,
          "Player save successfully deleted",
          res,
          "Saves deleted successfully"
        );
        return results;
      },
      "Error during save delete",
      res
    );
  },
  getHardwareelements: async function (req, res) {
    let sql = "SELECT * FROM `cpuTbl` ORDER BY hardwareId;";
    const cpu = await executeQuery(sql, [], "", res, "").then(hw => hw[1].data);
    sql = "SELECT * FROM `gpuTbl` ORDER BY hardwareId;";
    const gpu = await executeQuery(sql, [], "", res, "").then(hw => hw[1].data);
    sql = "SELECT * FROM `ramTbl` ORDER BY hardwareId;";
    const ram = await executeQuery(sql, [], "", res, "").then(hw => hw[1].data);
    sql = "SELECT * FROM `stgTbl` ORDER BY hardwareId;";
    const stg = await executeQuery(sql, [], "", res, "").then(hw => hw[1].data);

    log({cpu, gpu, ram, stg}, "info");

    res.status(200).json({cpu, gpu, ram, stg});
  }
};

module.exports = { gameController };
