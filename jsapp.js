// 【修正】將 SECTIONS_CONFIG 移到全域，讓 jsutils.js 可存取
const SECTIONS_CONFIG = [
    { id: 'home-village', title: '大本營', defaultLevel: '5', unit: '本' },
    { id: 'laboratory', title: '實驗室', defaultLevel: '5', unit: '級' },
    { id: 'pet-house', title: '戰寵小屋', defaultLevel: '1', unit: '級' },
    { id: 'builder-base', title: '建築大師', defaultLevel: '2', unit: '本' },
    { id: 'star-laboratory', title: '星空實驗', defaultLevel: '5', unit: '級' },
];

document.addEventListener('DOMContentLoaded', () => {
    // --- 帳號與區塊設定 ---（移除 SECTIONS_CONFIG，只保留 ACCOUNTS_CONFIG）
    const ACCOUNTS_CONFIG = [
        { name: '路人甲', avatar: 'images/路人甲.png' },
        { name: '奇異果冰沙', avatar: 'images/奇異果冰沙.png' },
        { name: '鯨頭鸛', avatar: 'images/鯨頭鸛.png' },
        { name: '楊令公', avatar: 'images/楊令公.png' },
        { name: '燈眼魚', avatar: 'images/燈眼魚.png' },
    ];

    // --- 全局狀態 ---
    let appData = loadData(ACCOUNTS_CONFIG);  // 現在 loadData 可存取全域 SECTIONS_CONFIG
    let currentAccountIndex = 0;

    // --- DOM 元素 ---
    const pages = document.querySelectorAll('.page');
    const accountsPage = document.getElementById('accounts-page');
    const taskListContainer = document.getElementById('task-list');
    const accountSlider = document.querySelector('.account-slider-container');

    // --- 導航函數 ---
    function navigateTo(pageId) {
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        
        if (pageId === 'scheduler-page') {
            renderScheduler(appData, SECTIONS_CONFIG);
        }
    }

    // --- 動態生成帳號頁面 ---
// --- 動態生成帳號頁面 ---（僅顯示修改部分）
function renderAccountPages(configs, data) {
    accountSlider.innerHTML = '';
    configs.forEach((acc, index) => {
        const slide = document.createElement('div');
        slide.className = 'account-page-slide';
        slide.dataset.index = index;
        slide.dataset.accountName = acc.name;

        const accountData = data.accounts[acc.name];

        // 【修改】先過濾出 home-village 的任務，來獲取每個工人的任務名稱
        const homeVillageTasks = accountData.tasks.filter(t => t.section === 'home-village');
        const taskMap = {}; // 建立工人 ID 到任務名稱的映射
        homeVillageTasks.forEach(task => {
            taskMap[task.worker] = task.task || '(無任務)';
        });

        // 【修改】生成 workerOptions 時，加入任務名稱
        const specialTasks = accountData.specialTasks;
        let workerOptions = '';
        for(let i = 1; i <= 5; i++) {
            const workerId = `${i}`;
            const taskName = taskMap[workerId] || '(無任務)'; // 如果無任務，顯示預設文字
            workerOptions += `<option value="${workerId}" ${specialTasks.workerApprentice.targetWorker === workerId ? 'selected' : ''}>${workerId} - ${taskName}</option>`;
        }

        // 【新增】檢查特殊任務的收合狀態
        const specialCollapsed = accountData.collapsedSections['special-tasks'] || true;

        const specialTasksHtml = `
            <div class="special-tasks-container">
                <div class="input-section ${specialCollapsed ? 'collapsed' : ''}" data-section-id="special-tasks" data-account="${acc.name}">
                    <div class="section-header">
                        <h3 class="section-title">特殊任務</h3>
                    </div>
                    <div class="input-section-body">  <!-- 【新增】包裝內容以便 CSS 隱藏 -->
                        <div class="special-task-block">
                            <label>工人學徒等級:</label>
                            <input type="number" class="special-task-input" data-account="${acc.name}" data-special-task="workerApprentice" value="${specialTasks.workerApprentice.level || ''}">
                            <select class="special-task-select apprentice-target-worker" data-account="${acc.name}" data-special-task="workerApprenticeTarget">
                                ${workerOptions}
                            </select>
                        </div>

                        <div class="special-task-row">
                            <label>實驗助手等級:</label>
                            <input type="number" class="special-task-input" data-account="${acc.name}" data-special-task="labAssistant" value="${specialTasks.labAssistant.level || ''}">
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 【修改】在迴圈中插入特殊任務區塊
        let sectionsHtml = '';
        SECTIONS_CONFIG.forEach(sec => {
            const savedLevel = accountData.levels[sec.id] || sec.defaultLevel;
            // 【新增】檢查該區塊的收合狀態
            const isCollapsed = accountData.collapsedSections[sec.id] || true;
            // 產生一般區塊的 HTML
            sectionsHtml += `
                <div class="input-section ${isCollapsed ? 'collapsed' : ''}" data-section-id="${sec.id}" data-account="${acc.name}">
                    <div class="section-header">
                        <h3 class="section-title">${sec.title}</h3>
                    </div>
                    <div class="input-section-body">  <!-- 【新增】包裝內容以便 CSS 隱藏 -->
                        <div class="section-header-level">  <!-- 【調整】將 level-input 移到這裡 -->
                            <div class="level-input-container">
                                <input type="text" class="level-input" value="${savedLevel}" data-account="${acc.name}" data-section="${sec.id}">
                                <span class="level-unit">${sec.unit}</span>
                            </div>
                        </div>
                        <div class="worker-count-input">
                            <label>工人數：</label>
                            <input type="number" class="worker-count" min="0" max="10" placeholder="0" data-account="${acc.name}" data-section="${sec.id}">
                        </div>
                        <div class="worker-rows-container"></div>
                    </div>
                </div>
            `;

            // 如果當前區塊是實驗室，就在它後面插入特殊任務區塊
            if (sec.id === 'laboratory') {
                sectionsHtml += specialTasksHtml;
            }
        });

        slide.innerHTML = `
            <div class="account-header">
                <img src="${acc.avatar}" alt="${acc.name} 頭像" class="account-avatar">
                <h2 class="account-name">${acc.name}</h2>
            </div>
            <div class="account-body">
                ${sectionsHtml}
            </div>
        `;
        accountSlider.appendChild(slide);
    });
    
    restoreInputsFromData(data);
}

function updateWorkerApprenticeSelect(accountName) {
    const select = document.querySelector(`.account-page-slide[data-account-name="${accountName}"] .apprentice-target-worker`);
    if (!select) return;

    // 重新獲取 home-village 任務來建立 taskMap
    const homeVillageTasks = appData.accounts[accountName].tasks.filter(t => t.section === 'home-village');
    const taskMap = {};
    homeVillageTasks.forEach(task => {
        taskMap[task.worker] = task.task || '(無任務)';
    });

    // 重建選項
    let workerOptions = '';
    for (let i = 1; i <= 5; i++) {  // 假設最多 5 個工人，依據您的 workerCounts 調整
        const workerId = `${i}`;
        const taskName = taskMap[workerId] || '(無任務)';
        const selected = appData.accounts[accountName].specialTasks.workerApprentice.targetWorker === workerId ? 'selected' : '';
        workerOptions += `<option value="${workerId}" ${selected}>${workerId} - ${taskName}</option>`;
    }

    // 更新 select
    select.innerHTML = workerOptions;
}

// --- 修改：accountsPage 事件監聽（在現有的 'input' 事件後，新增 'click' 事件處理收合） ---
accountsPage.addEventListener('input', e => {
    // ... 原有 input 邏輯保持不變 ...
});

accountsPage.addEventListener('click', e => {
    if (e.target.closest('.section-title')) {
        const section = e.target.closest('.input-section');
        if (section) {
            const accountName = section.dataset.account;
            const sectionId = section.dataset.sectionId;
            const isCurrentlyCollapsed = section.classList.contains('collapsed');
            section.classList.toggle('collapsed');
            // 更新資料結構並儲存
            if (!appData.accounts[accountName].collapsedSections) {
                appData.accounts[accountName].collapsedSections = {};
            }
            appData.accounts[accountName].collapsedSections[sectionId] = !isCurrentlyCollapsed;
            saveData(appData);

            // 【新增】如果展開的是 special-tasks，則即時更新工人學徒下拉選單
            if (sectionId === 'special-tasks' && isCurrentlyCollapsed) {  // 只在從收合轉展開時觸發
                updateWorkerApprenticeSelect(accountName);
            }
        }
    }
});

    // --- 動態生成工人輸入行 ---
    function generateWorkerRows(container, count, accountName, sectionId) {
        container.innerHTML = '';
        const accountTasks = appData.accounts[accountName].tasks.filter(t => t.section === sectionId);

        for (let i = 1; i <= count; i++) {
            const workerId = `${i}`;
            const existingTask = accountTasks.find(t => t.worker === workerId);
            const taskId = existingTask ? existingTask.id : `${accountName}-${sectionId}-${workerId}-${Date.now()}`;
            
            let durationString = '';
            if (existingTask && existingTask.duration) {
                const d = existingTask.duration;
                if (d.days > 0 || d.hours > 0 || d.minutes > 0) {
                   durationString = `${d.days || 0}-${d.hours || 0}-${d.minutes || 0}`;
                }
            }

            const row = document.createElement('div');
            row.className = 'worker-row';
            row.dataset.workerId = workerId;
            row.dataset.sectionId = sectionId;

            row.innerHTML = `
                <div class="worker-task-line">
                    <label class="worker-label">${workerId}</label>
                    <input type="text" class="task-input" placeholder="任務名稱" value="${existingTask?.task || ''}">
                </div>
                <div class="duration-group">
                    <input type="text" class="duration-combined" placeholder="天-時-分 (例: 5-12-30)" value="${durationString}">
                </div>
                <div class="completion-time" readonly></div>
            `;
            container.appendChild(row);

            handleTaskInputChange(row, accountName, sectionId, workerId, taskId, false);

            const inputs = row.querySelectorAll('.task-input, .duration-combined');
            inputs.forEach(input => {
                input.addEventListener('input', () => handleTaskInputChange(row, accountName, sectionId, workerId, taskId, true));
            });
        }
    }
    
    // --- 從數據恢復輸入狀態 ---
    function restoreInputsFromData(data) {
        Object.keys(data.accounts).forEach(accountName => {
            const account = data.accounts[accountName];
            if (account.workerCounts) {
                Object.keys(account.workerCounts).forEach(sectionId => {
                    const count = account.workerCounts[sectionId];
                    const countInput = document.querySelector(`.account-page-slide[data-account-name="${accountName}"] .worker-count[data-section="${sectionId}"]`);
                    if (countInput) {
                        countInput.value = count;
                        const container = countInput.closest('.input-section').querySelector('.worker-rows-container');
                        generateWorkerRows(container, count, accountName, sectionId);
                    }
                });
            }
        });
    }

    // --- 應用特殊任務的時間減免 ---
    function applySpecialReductions(originalMinutes, accountName, sectionId, workerId) {
        if (originalMinutes <= 0) return originalMinutes;

        const specialTasks = appData.accounts[accountName].specialTasks;
        let reductionMinutes = 0;

        const originalDays = originalMinutes / (24 * 60);
        const baseDays = Math.ceil(originalDays);

        const labAssistantLevel = parseInt(specialTasks.labAssistant.level, 10);
        if (sectionId === 'laboratory' && labAssistantLevel > 0) {
            reductionMinutes += baseDays * labAssistantLevel * 60;
        }

        const apprenticeLevel = parseInt(specialTasks.workerApprentice.level, 10);
        const targetWorker = specialTasks.workerApprentice.targetWorker;
        if (sectionId === 'home-village' && workerId === targetWorker && apprenticeLevel > 0) {
            reductionMinutes += baseDays * apprenticeLevel * 60;
        }

        return Math.max(0, originalMinutes - reductionMinutes);
    }

function handleTaskInputChange(row, accountName, sectionId, workerId, taskId, shouldSave = true) {
    const taskInput = row.querySelector('.task-input').value.trim();
    
    const durationInput = row.querySelector('.duration-combined').value;
    const parts = durationInput.split('-').map(p => p.trim());
    const durationDays = parseInt(parts[0], 10) || 0;
    const durationHours = parseInt(parts[1], 10) || 0;
    const durationMinutes = parseInt(parts[2], 10) || 0;

    const totalDurationInMinutes = (durationDays * 24 * 60) + (durationHours * 60) + durationMinutes;

    const finalDurationInMinutes = applySpecialReductions(totalDurationInMinutes, accountName, sectionId, workerId);

    const completionTime = (finalDurationInMinutes > 0) ? calculateCompletionTime(finalDurationInMinutes, '分鐘') : null;
    const completionTimeDiv = row.querySelector('.completion-time');
    completionTimeDiv.textContent = completionTime || 'N/A';

    if (shouldSave) {
        let task = appData.accounts[accountName].tasks.find(t => t.id === taskId);
        if (!task) {
            task = { id: taskId, section: sectionId, worker: workerId };
            appData.accounts[accountName].tasks.push(task);
        }
        task.task = taskInput;
        task.duration = { days: durationDays, hours: durationHours, minutes: durationMinutes };
        task.completion = completionTime;
        saveData(appData); // 保存到 localStorage
    }

    // 【新增】如果修改的是 home-village 任務，即時更新下拉選單
    if (sectionId === 'home-village') {
        updateWorkerApprenticeSelect(accountName);
    }
}

    // --- 處理任務輸入變更 ---
    function handleTaskInputChange(row, accountName, sectionId, workerId, taskId, shouldSave = true) {
        const taskInput = row.querySelector('.task-input').value.trim();
        
        const durationInput = row.querySelector('.duration-combined').value;
        const parts = durationInput.split('-').map(p => p.trim());
        const durationDays = parseInt(parts[0], 10) || 0;
        const durationHours = parseInt(parts[1], 10) || 0;
        const durationMinutes = parseInt(parts[2], 10) || 0;

        const totalDurationInMinutes = (durationDays * 24 * 60) + (durationHours * 60) + durationMinutes;

        const finalDurationInMinutes = applySpecialReductions(totalDurationInMinutes, accountName, sectionId, workerId);

        const completionTime = (finalDurationInMinutes > 0) ? calculateCompletionTime(finalDurationInMinutes, '分鐘') : null;
        const completionTimeDiv = row.querySelector('.completion-time');
        completionTimeDiv.textContent = completionTime || 'N/A';

        if (shouldSave) {
            let task = appData.accounts[accountName].tasks.find(t => t.id === taskId);
            if (!task) {
                task = { id: taskId, section: sectionId, worker: workerId };
                appData.accounts[accountName].tasks.push(task);
            }
            task.task = taskInput;
            task.duration = { days: durationDays, hours: durationHours, minutes: durationMinutes };
            task.completion = completionTime;
            saveData(appData);
        }
    }
    
    // --- 當特殊任務等級改變時，重新計算相關任務時間 ---
    function recalculateDependentTasks(accountName) {
        const slide = document.querySelector(`.account-page-slide[data-account-name="${accountName}"]`);
        if (!slide) return;

        const labRows = slide.querySelectorAll(`.worker-row[data-section-id="laboratory"]`);
        labRows.forEach(row => {
            const workerId = row.dataset.workerId;
            const task = appData.accounts[accountName].tasks.find(t => t.section === 'laboratory' && t.worker === workerId);
            if (task) {
                handleTaskInputChange(row, accountName, 'laboratory', workerId, task.id, true);
            }
        });

        const targetWorker = appData.accounts[accountName].specialTasks.workerApprentice.targetWorker;
        const apprenticeRow = slide.querySelector(`.worker-row[data-section-id="home-village"][data-worker-id="${targetWorker}"]`);
        if (apprenticeRow) {
            const task = appData.accounts[accountName].tasks.find(t => t.section === 'home-village' && t.worker === targetWorker);
            if(task) {
                handleTaskInputChange(apprenticeRow, accountName, 'home-village', targetWorker, task.id, true);
            }
        }
    }

    // --- 滑動頁面邏輯 ---
    function updateSlider() {
        accountSlider.scrollLeft = currentAccountIndex * accountSlider.clientWidth;
        document.getElementById('account-indicator').textContent = `${currentAccountIndex + 1} / ${ACCOUNTS_CONFIG.length}`;
    }

    // --- 事件監聽 ---
    document.getElementById('go-to-scheduler-from-home').addEventListener('click', () => navigateTo('scheduler-page'));
    document.getElementById('go-to-accounts-from-home').addEventListener('click', () => navigateTo('accounts-page'));
    document.getElementById('go-to-scheduler-from-accounts').addEventListener('click', () => navigateTo('scheduler-page'));
    document.getElementById('go-to-accounts-from-scheduler').addEventListener('click', () => navigateTo('accounts-page'));

accountsPage.addEventListener('input', e => {
    const accountName = e.target.dataset.account;
    if (!accountName) return;

    const sectionId = e.target.dataset.section;

    if (e.target.classList.contains('worker-count')) {
        const count = parseInt(e.target.value, 10) || 0;
        const container = e.target.closest('.input-section').querySelector('.worker-rows-container');
        if (!appData.accounts[accountName].workerCounts) appData.accounts[accountName].workerCounts = {};
        appData.accounts[accountName].workerCounts[sectionId] = count;
        saveData(appData);
        generateWorkerRows(container, count, accountName, sectionId);
    } else if (e.target.classList.contains('level-input')) {
        if (!appData.accounts[accountName].levels) appData.accounts[accountName].levels = {};
        appData.accounts[accountName].levels[sectionId] = e.target.value;
        saveData(appData);
    } else if (e.target.classList.contains('special-task-input')) {
        const taskType = e.target.dataset.specialTask;
        if (taskType === 'labAssistant') {
            appData.accounts[accountName].specialTasks.labAssistant.level = e.target.value;
        } else if (taskType === 'workerApprentice') {
            appData.accounts[accountName].specialTasks.workerApprentice.level = e.target.value;
        }
        saveData(appData);
        recalculateDependentTasks(accountName);
    } else if (e.target.classList.contains('special-task-select')) {
        // 【修改】原本的邏輯保持，新增即時更新選單
        appData.accounts[accountName].specialTasks.workerApprentice.targetWorker = e.target.value;
        saveData(appData);
        recalculateDependentTasks(accountName);
        // 【新增】選擇後即時重建選單（以防其他任務同時修改）
        updateWorkerApprenticeSelect(accountName);
    }
});

    taskListContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.btn-delete');
        if (deleteButton) {
            const accountName = deleteButton.dataset.account;
            const taskId = deleteButton.dataset.taskId;
            const account = appData.accounts[accountName];
            if (account) {
                account.tasks = account.tasks.filter(task => task.id !== taskId);
                saveData(appData);
                const accountIndex = ACCOUNTS_CONFIG.findIndex(acc => acc.name === accountName);
                if (accountIndex !== -1) {
                    currentAccountIndex = accountIndex;
                    navigateTo('accounts-page');
                    renderAccountPages(ACCOUNTS_CONFIG, appData);
                    updateSlider();
                }
            }
        }
    });

    document.getElementById('next-account').addEventListener('click', () => {
        if (currentAccountIndex < ACCOUNTS_CONFIG.length - 1) {
            currentAccountIndex++;
            updateSlider();
        }
    });
    document.getElementById('prev-account').addEventListener('click', () => {
        if (currentAccountIndex > 0) {
            currentAccountIndex--;
            updateSlider();
        }
    });
    
    function init() {
        renderAccountPages(ACCOUNTS_CONFIG, appData);
        navigateTo('home-page');
    }

    init();
});