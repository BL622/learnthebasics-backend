const tipsData = require('../JSON documents/tips.json');
const { log } = require('../sharedFunctions/logFunction');
const { executeQuery, clamp } = require('../sharedFunctions/functions');

async function getRandomTips() {
    let tips = {};

    for (let category in tipsData) {
        const tipsArray = tipsData[category];
        const randomIndex = Math.floor(Math.random() * tipsArray.length);
        tips[category] = tipsArray[randomIndex];
    }

    return tips;
}


async function createStatistics(username) {
    log("Generating statistics");
    let stats = {};
    stats.tips = await getRandomTips();
//TODO query to JSON
    let query = "SELECT savedata.saveId, statsTbl.completedJobs, statsTbl.fastestCompletion, savedata.money, statsTbl.totalIncome, JSON_EXTRACT(savedata.lastBought, '$.cpu') + 1 AS boughtCpu,  JSON_EXTRACT(savedata.lastBought, '$.gpu') + 1 AS boughtGpu, JSON_EXTRACT(savedata.lastBought, '$.ram') + 1 AS boughtRam, JSON_EXTRACT(savedata.lastBought, '$.stg') + 1 AS boughtStg, savedata.time FROM statsTbl INNER JOIN userTbl ON statsTbl.userId = userTbl.uid INNER JOIN savedata ON savedata.userId = userTbl.uid WHERE userTbl.username = ? ORDER BY savedata.lastModified DESC";
    const statsRes = await executeQuery(query, username);
    log(statsRes,'success');

    log("Calculating overall time played:");
    stats = { ...stats, ...{ overallTime: statsRes.reduce((sum, x) => sum + x.time, 0) } };

    log("Calculating completed jobs:");
    stats = { ...stats, ...{ completedJobs: statsRes[0].completedJobs } };

    log("Getting fastest completion time:");
    stats = { ...stats, ...{ fastestCompletion: statsRes[0].fastestCompletion } };

    log("Calculating ranking in completion time:");
    //TODO query to JSON
    query = "SELECT DISTINCT fastestCompletion FROM statsTbl";
    const fastestCompletionRes = await executeQuery(query);
    stats = { ...stats, ...{ fastestCompletionPlace: fastestCompletionRes.filter(e => e.fastestCompletion < stats.fastestCompletion).length + 1 } };

    log("Calculating total income:");
    stats = { ...stats, ...{ totalIncome: statsRes[0].totalIncome } };

    log("Calculating total money spent:");
    stats = { ...stats, ...{ totalSpent: statsRes.reduce((sum, x) => clamp(sum + x.totalIncome - x.money, 0, Infinity), 0) } };

    log("Calculating all bought computer parts sum:");
    stats = { ...stats, ...{ totalBoughtParts: statsRes.reduce((total, x) => total + Object.entries(x).filter(([key, value]) => key.startsWith('bought')).reduce((acc, val) => acc + val[1], 0), 0) } };

    log("Calculating most played save:");
    stats = { ...stats, ...{ mostPlayedSave: statsRes.reduce((acc, x) => x.time > acc.time ? x : acc).saveId } };

    log("Selecting the last played save:");
    stats = { ...stats, ...{ lastPlayedSave: statsRes[0].saveId } };

    log("Counting save files:");
    stats = {...stats, ...{saveFileCount: statsRes.length}};

    return stats;
}

module.exports = { createStatistics }