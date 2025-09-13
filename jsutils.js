// --- 資料處理 ---
const STORAGE_KEY = 'clashSchedulerData';

/**
 * 從 localStorage 載入資料
 * @param {Array} accountsConfig - 帳號設定檔
 * @returns {Object} 資料物件
 */
function loadData(accountsConfig) {
    const data = localStorage.getItem(STORAGE_KEY);
    let parsedData = data ? JSON.parse(data) : { accounts: {} };

    // 確保所有帳號都存在且擁有完整的資料結構
    accountsConfig.forEach(acc => {
        if (!parsedData.accounts[acc.name]) {
            parsedData.accounts[acc.name] = {
                avatar: acc.avatar,
                tasks: [],
                levels: {},
                workerCounts: {}
            };
        }
        
        // 確保 levels, workerCounts, specialTasks 物件存在
        if (!parsedData.accounts[acc.name].levels) {
            parsedData.accounts[acc.name].levels = {};
        }
        if (!parsedData.accounts[acc.name].workerCounts) {
            parsedData.accounts[acc.name].workerCounts = {};
        }
        if (!parsedData.accounts[acc.name].specialTasks) {
            parsedData.accounts[acc.name].specialTasks = {
                labAssistant: { level: '' },
                // 【修改】將預設目標工人改為數字
                workerApprentice: { level: '', targetWorker: '1' }
            };
        }
    });
    
    return parsedData;
}


/**
 * 儲存資料到 localStorage
 * @param {Object} data - 要儲存的資料物件
 */
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// --- 時間計算 ---

/**
 * 計算完成時間
 * @param {number} duration - 時長 (數字)
 * @param {string} unit - 單位 ('分鐘', '小時', '天')
 * @returns {string|null} 格式化的時間字串 or null
 */
function calculateCompletionTime(duration, unit) {
    if (isNaN(duration) || duration <= 0) {
        return null;
    }

    const now = new Date();
    let futureDate = new Date(now);

    switch (unit) {
        case '分鐘':
            futureDate.setMinutes(now.getMinutes() + duration);
            break;
        case '小時':
            futureDate.setMinutes(now.getMinutes() + duration * 60);
            break;
        case '天':
            futureDate.setHours(now.getHours() + duration * 24);
            break;
    }

    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    const hours = String(futureDate.getHours()).padStart(2, '0');
    const minutes = String(futureDate.getMinutes()).padStart(2, '0');

    return `${month}/${day} ${hours}:${minutes}`;
}