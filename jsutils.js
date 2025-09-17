// 【修正】將 SECTIONS_CONFIG 移至此處，確保在使用它的函數之前被定義
const SECTIONS_CONFIG = [
    { id: 'home-village', title: '大本營', defaultLevel: '5', unit: '本' },
    { id: 'laboratory', title: '實驗室', defaultLevel: '5', unit: '級' },
    { id: 'pet-house', title: '戰寵小屋', defaultLevel: '1', unit: '級' },
    { id: 'builder-base', title: '建築大師', defaultLevel: '2', unit: '本' },
    { id: 'star-laboratory', title: '星空實驗', defaultLevel: '5', unit: '級' },
];

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
                workerApprentice: { level: '', targetWorker: '1' }
            };
        }

        if (!parsedData.accounts[acc.name].collapsedSections) {
            parsedData.accounts[acc.name].collapsedSections = {};
        }
        SECTIONS_CONFIG.forEach(sec => {
            if (parsedData.accounts[acc.name].collapsedSections[sec.id] === undefined) {
                parsedData.accounts[acc.name].collapsedSections[sec.id] = true;
            }
        });
        if (parsedData.accounts[acc.name].collapsedSections['special-tasks'] === undefined) {
            parsedData.accounts[acc.name].collapsedSections['special-tasks'] = true;
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

/**
 * 【共用函數】計算並格式化完成時間
 * ★★★【邏輯修改】★★★
 * 即使任務已完成，rawTime 仍回傳原始的完成時間 Date 物件，以便於篩選和排序。
 */
function calculateCompletionTime(entryTimestamp, totalDurationInMinutes, totalDeductedMinutes = 0) {
    if (!entryTimestamp || totalDurationInMinutes <= 0) {
        return { time: 'N/A', deductions: 0, rawTime: null };
    }

    const now = Date.now();
    // 計算出絕對的、不變的完成時間戳
    const completionTimestamp = entryTimestamp + (totalDurationInMinutes - totalDeductedMinutes) * 60 * 1000;
    const completionDate = new Date(completionTimestamp);

    // 如果當前時間已經超過完成時間
    if (now >= completionDate) {
        return { 
            time: '已完成', 
            deductions: Math.round(totalDeductedMinutes), 
            rawTime: completionDate // ★ 關鍵修改：回傳原始完成時間
        };
    }

    // --- 若任務尚未完成，則計算並格式化顯示時間 ---
    const today = new Date();

    const year = completionDate.getFullYear();
    const month = (completionDate.getMonth() + 1).toString().padStart(2, '0');
    const day = completionDate.getDate().toString().padStart(2, '0');
    const hours = completionDate.getHours().toString().padStart(2, '0');
    const minutes = completionDate.getMinutes().toString().padStart(2, '0');

    let displayTimeForAccounts;
    const isToday = today.getFullYear() === year &&
                    today.getMonth() === completionDate.getMonth() &&
                    today.getDate() === day;

    if (isToday) {
        displayTimeForAccounts = `${hours}:${minutes}`;
    } else {
        displayTimeForAccounts = `${month}/${day} ${hours}:${minutes}`;
    }

    return {
        time: displayTimeForAccounts, 
        deductions: Math.round(totalDeductedMinutes),
        rawTime: completionDate 
    };
}


/**
 * @param {Date} date
 * @returns {string} The date in 'YYYY-MM-DD' format.
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}