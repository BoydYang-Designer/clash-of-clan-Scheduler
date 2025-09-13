document.addEventListener('DOMContentLoaded', () => {

    // --- 帳號與區塊設定 ---
    const ACCOUNTS_CONFIG = [
        { name: '楊令公', avatar: 'images/楊令公.png' },
        { name: '奇異果冰沙', avatar: 'images/奇異果冰沙.png' },
        { name: '路人甲', avatar: 'images/路人甲.png' },
        { name: '燈眼魚', avatar: 'images/燈眼魚.png' },
        { name: '鯨頭鸛', avatar: 'images/鯨頭鸛.png' }
    ];

    const SECTIONS_CONFIG = [
        { id: 'home-village', title: '大本營', defaultLevel: '5', unit: '本' },
        { id: 'builder-base', title: '建築大師', defaultLevel: '2', unit: '本' },
        { id: 'laboratory', title: '實驗室', defaultLevel: '5', unit: '級' },
        { id: 'star-laboratory', title: '星空實驗', defaultLevel: '5', unit: '級' },
        { id: 'pet-house', title: '戰寵小屋', defaultLevel: '1', unit: '級' } // 新增戰寵小屋
    ];

    // --- 全局狀態 ---
    let appData = loadData(ACCOUNTS_CONFIG);
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
            // 傳遞 SECTIONS_CONFIG 以便渲染器可以查找標題
            renderScheduler(appData, SECTIONS_CONFIG);
        }
    }

    // --- 動態生成帳號頁面 ---
    function renderAccountPages(configs, data) {
        accountSlider.innerHTML = '';
        configs.forEach((acc, index) => {
            const slide = document.createElement('div');
            slide.className = 'account-page-slide';
            slide.dataset.index = index;

            // 確保每個帳號都有 levels 和 workerCounts 物件
            if (!data.accounts[acc.name].levels) {
                data.accounts[acc.name].levels = {};
            }
            if (!data.accounts[acc.name].workerCounts) {
                data.accounts[acc.name].workerCounts = {};
            }

            let sectionsHtml = '';
            SECTIONS_CONFIG.forEach(sec => {
                const savedLevel = data.accounts[acc.name].levels[sec.id] || sec.defaultLevel;
                sectionsHtml += `
                    <div class="input-section" data-section-id="${sec.id}">
                        <div class="section-header">
                            <h3 class="section-title">${sec.title}</h3>
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
                `;
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

    // --- 動態生成工人輸入行 ---
    function generateWorkerRows(container, count, accountName, sectionId) {
        container.innerHTML = '';
        const accountTasks = appData.accounts[accountName].tasks.filter(t => t.section === sectionId);

        for (let i = 1; i <= count; i++) {
            const workerId = `工人${i}`;
            const existingTask = accountTasks.find(t => t.worker === workerId);
            const taskId = existingTask ? existingTask.id : `${accountName}-${sectionId}-${workerId}-${Date.now()}`;

            // 處理時長數據結構
            // 確保 existingTask?.duration 是一個物件，以便安全地訪問其屬性
            const durationData = existingTask?.duration || {};

            const row = document.createElement('div');
            row.className = 'worker-row';
            row.innerHTML = `
                <label class="worker-label">${workerId}</label>
                <input type="text" class="task-input" placeholder="任務名稱" value="${existingTask?.task || ''}">
                <div class="duration-group">
                    <input type="number" class="duration-days" placeholder="天" min="0" value="${durationData.days || ''}">
                    <input type="number" class="duration-hours" placeholder="時" min="0" max="23" value="${durationData.hours || ''}">
                    <input type="number" class="duration-minutes" placeholder="分" min="0" max="59" value="${durationData.minutes || ''}">
                </div>
                <div class="completion-time" readonly>${existingTask?.completion || 'N/A'}</div>
            `;
            container.appendChild(row);

            // 獲取所有輸入框
            const inputs = row.querySelectorAll('.task-input, .duration-group input');
            inputs.forEach(input => {
                input.addEventListener('input', () => handleTaskInputChange(row, accountName, sectionId, workerId, taskId));
            });
        }
    }
    
    // --- 從數據恢復輸入狀態 (恢復工人數和任務) ---
    function restoreInputsFromData(data) {
        Object.keys(data.accounts).forEach(accountName => {
            const account = data.accounts[accountName];
            if (account.workerCounts) {
                Object.keys(account.workerCounts).forEach(sectionId => {
                    const count = account.workerCounts[sectionId];
                    const countInput = document.querySelector(`.worker-count[data-account="${accountName}"][data-section="${sectionId}"]`);
                    if (countInput) {
                        countInput.value = count;
                        const container = countInput.closest('.input-section').querySelector('.worker-rows-container');
                        generateWorkerRows(container, count, accountName, sectionId);
                    }
                });
            }
        });
    }

    // --- 處理任務輸入變更 ---
    function handleTaskInputChange(row, accountName, sectionId, workerId, taskId) {
        const taskInput = row.querySelector('.task-input').value.trim();
        // 讀取新的三個輸入框值
        const durationDays = parseInt(row.querySelector('.duration-days').value, 10) || 0;
        const durationHours = parseInt(row.querySelector('.duration-hours').value, 10) || 0;
        const durationMinutes = parseInt(row.querySelector('.duration-minutes').value, 10) || 0;

        // 將所有時長換算成總分鐘數
        const totalDurationInMinutes = (durationDays * 24 * 60) + (durationHours * 60) + durationMinutes;

        // 如果總時長為 0 或非有效數字，則不計算
        const completionTime = (totalDurationInMinutes > 0) ? calculateCompletionTime(totalDurationInMinutes, '分鐘') : null;
        const completionTimeDiv = row.querySelector('.completion-time');
        completionTimeDiv.textContent = completionTime || 'N/A';

        let task = appData.accounts[accountName].tasks.find(t => t.id === taskId);
        if (!task) {
             task = { id: taskId, section: sectionId, worker: workerId };
             appData.accounts[accountName].tasks.push(task);
        }

        task.task = taskInput;
        // 將時長儲存為一個物件
        task.duration = {
            days: durationDays,
            hours: durationHours,
            minutes: durationMinutes
        };
        task.unit = '分鐘'; // 固定單位為分鐘
        task.completion = completionTime;

        saveData(appData);
    }
    
    // --- 滑動頁面邏輯 ---
    function updateSlider() {
        accountSlider.scrollLeft = currentAccountIndex * accountSlider.clientWidth;
        document.getElementById('account-indicator').textContent = `${currentAccountIndex + 1} / ${ACCOUNTS_CONFIG.length}`;
    }

    // --- 事件監聽 ---
    // 導航
    document.getElementById('go-to-scheduler-from-home').addEventListener('click', () => navigateTo('scheduler-page'));
    document.getElementById('go-to-accounts-from-home').addEventListener('click', () => navigateTo('accounts-page'));
    document.getElementById('go-to-scheduler-from-accounts').addEventListener('click', () => navigateTo('scheduler-page'));
    document.getElementById('go-to-accounts-from-scheduler').addEventListener('click', () => navigateTo('accounts-page'));


    // 帳號頁面輸入 (事件委派)
    accountsPage.addEventListener('input', e => {
        const accountName = e.target.dataset.account;
        const sectionId = e.target.dataset.section;

        // 處理工人數變更
        if (e.target.classList.contains('worker-count')) {
            const count = parseInt(e.target.value, 10) || 0;
            const container = e.target.closest('.input-section').querySelector('.worker-rows-container');
            
            // 保存工人數
            if (!appData.accounts[accountName].workerCounts) {
                appData.accounts[accountName].workerCounts = {};
            }
            appData.accounts[accountName].workerCounts[sectionId] = count;
            saveData(appData);

            generateWorkerRows(container, count, accountName, sectionId);
        }
        // 處理等級變更
        if (e.target.classList.contains('level-input')) {
            if (!appData.accounts[accountName].levels) {
                appData.accounts[accountName].levels = {};
            }
            appData.accounts[accountName].levels[sectionId] = e.target.value;
            saveData(appData);
        }
    });

    // *** 新增：解決手機輸入時畫面滑動問題 ***
    // 使用 'focusin' 事件（可冒泡的 focus）
    accountsPage.addEventListener('focusin', (e) => {
        // 如果事件目標是任何輸入框
        if (e.target.matches('input, select')) {
            // 禁用水平滑動
            accountSlider.style.overflowX = 'hidden';
        }
    });

    // 使用 'focusout' 事件（可冒泡的 blur）
    accountsPage.addEventListener('focusout', (e) => {
        // 如果事件目標是任何輸入框
        if (e.target.matches('input, select')) {
            // 重新啟用水平滑動
            accountSlider.style.overflowX = 'scroll';
        }
    });


    // 排程頁面刪除的邏輯
    taskListContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.btn-delete');
        if (deleteButton) {
            const accountName = deleteButton.dataset.account;
            const taskId = deleteButton.dataset.taskId;

            const account = appData.accounts[accountName];
            if (account) {
                // 1. 找到對應任務並移除
                account.tasks = account.tasks.filter(task => task.id !== taskId);
                // 2. 儲存 (工人數不受影響)
                saveData(appData);

                // 3. 找到對應帳號的索引
                const accountIndex = ACCOUNTS_CONFIG.findIndex(acc => acc.name === accountName);
                if (accountIndex !== -1) {
                    // 4. 更新當前索引並跳轉
                    currentAccountIndex = accountIndex;
                    navigateTo('accounts-page');
                    
                    // 5. 確保頁面內容和滾動位置正確更新
                    renderAccountPages(ACCOUNTS_CONFIG, appData);
                    updateSlider();
                }
            }
        }
    });


    // 滑動按鈕
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
    
    // --- 初始化 ---
    function init() {
        renderAccountPages(ACCOUNTS_CONFIG, appData);
        navigateTo('home-page');
    }

    init();
});