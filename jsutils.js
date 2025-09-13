// --- 資料處理 ---
const STORAGE_KEY = 'clashSchedulerData';

/**
 * 從 localStorage 載入資料
 * @param {Array} accountsConfig - 帳號設定檔
 * @returns {Object} 資料物件
 */
function loadData(accountsConfig) {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        const parsedData = JSON.parse(data);
        // 確保所有帳號都有 levels 和 workerCounts 結構
        accountsConfig.forEach(acc => {
            if (parsedData.accounts[acc.name]) {
                if (!parsedData.accounts[acc.name].levels) {
                    parsedData.accounts[acc.name].levels = {};
                }
                if (!parsedData.accounts[acc.name].workerCounts) {
                    parsedData.accounts[acc.name].workerCounts = {};
                }
            }
        });
        return parsedData;
    }
    // 如果沒有資料，則建立初始結構
    const initialData = { accounts: {} };
    accountsConfig.forEach(acc => {
        initialData.accounts[acc.name] = {
            avatar: acc.avatar,
            tasks: [],
            levels: {}, // 初始化 levels 物件
            workerCounts: {} // 初始化 workerCounts 物件
        };
    });
    return initialData;
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

    // *** 主要修改處 ***
    // 直接使用 new Date() 獲取使用者當前的即時時間 (台灣時間) 作為起點
    const now = new Date();
    let futureDate = new Date(now);

    switch (unit) {
        case '分鐘':
            futureDate.setMinutes(now.getMinutes() + duration);
            break;
        case '小時':
            // 將小數小時轉換為分鐘
            futureDate.setMinutes(now.getMinutes() + duration * 60);
            break;
        case '天':
            // 將小數天轉換為小時
            futureDate.setHours(now.getHours() + duration * 24);
            break;
    }

    // 格式化輸出: MM/DD HH:MM (移除年份)
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    const hours = String(futureDate.getHours()).padStart(2, '0');
    const minutes = String(futureDate.getMinutes()).padStart(2, '0');

    return `${month}/${day} ${hours}:${minutes}`;
}