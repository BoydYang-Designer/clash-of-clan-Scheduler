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
        { id: 'home-village', title: '家鄉大本營', defaultLevel: '5', unit: '本' },
        { id: 'builder-base', title: '建築大師基地', defaultLevel: '2', unit: '本' },
        { id: 'laboratory', title: '實驗室', defaultLevel: '5', unit: '級' },
        { id: 'star-laboratory', title: '星空實驗室', defaultLevel: '5', unit: '級' }
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
            renderScheduler(appData);
        }
    }

    // --- 動態生成帳號頁面 ---
    function renderAccountPages(configs, data) {
        accountSlider.innerHTML = '';
        configs.forEach((acc, index) => {
            const slide = document.createElement('div');
            slide.className = 'account-page-slide';
            slide.dataset.index = index;

            // 確保每個帳號都有 levels 物件
            if (!data.accounts[acc.name].levels) {
                data.accounts[acc.name].levels = {};
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
                            <input type="number" class="worker-count" min="1" max="10" placeholder="0" data-account="${acc.name}" data-section="${sec.id}">
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

            const row = document.createElement('div');
            row.className = 'worker-row';
            row.innerHTML = `
                <label class="worker-label">${workerId}</label>
                <input type="text" class="task-input" placeholder="任務名稱" value="${existingTask?.task || ''}">
                <input type="number" class="duration-input" placeholder="時間" min="1" step="0.5" value="${existingTask?.duration || ''}">
                <select class="unit-select">
                    <option value="小時" ${existingTask?.unit === '小時' ? 'selected' : ''}>小時</option>
                    <option value="分鐘" ${existingTask?.unit === '分鐘' ? 'selected' : ''}>分鐘</option>
                    <option value="天" ${existingTask?.unit === '天' ? 'selected' : ''}>天</option>
                </select>
                <div class="completion-time" readonly>${existingTask?.completion || 'N/A'}</div>
            `;
            container.appendChild(row);

            const inputs = row.querySelectorAll('.task-input, .duration-input, .unit-select');
            inputs.forEach(input => {
                input.addEventListener('input', () => handleTaskInputChange(row, accountName, sectionId, workerId, taskId));
            });
        }
    }
    
    // --- 從數據恢復輸入狀態 (僅恢復工人任務) ---
    function restoreInputsFromData(data) {
        Object.keys(data.accounts).forEach(accountName => {
            const sectionWorkerCounts = {};
            data.accounts[accountName].tasks.forEach(task => {
                if (task.section && task.worker) {
                    if (!sectionWorkerCounts[task.section]) {
                        sectionWorkerCounts[task.section] = new Set();
                    }
                    sectionWorkerCounts[task.section].add(task.worker);
                }
            });

            Object.keys(sectionWorkerCounts).forEach(sectionId => {
                const count = sectionWorkerCounts[sectionId].size;
                const countInput = document.querySelector(`.worker-count[data-account="${accountName}"][data-section="${sectionId}"]`);
                if(countInput) {
                    countInput.value = count;
                    const container = countInput.closest('.input-section').querySelector('.worker-rows-container');
                    generateWorkerRows(container, count, accountName, sectionId);
                }
            });
        });
    }

    // --- 處理任務輸入變更 ---
    function handleTaskInputChange(row, accountName, sectionId, workerId, taskId) {
        const taskInput = row.querySelector('.task-input').value.trim();
        const duration = parseFloat(row.querySelector('.duration-input').value, 10);
        const unit = row.querySelector('.unit-select').value;
        const completionTimeDiv = row.querySelector('.completion-time');

        const completionTime = calculateCompletionTime(duration, unit);
        completionTimeDiv.textContent = completionTime || 'N/A';
        
        let task = appData.accounts[accountName].tasks.find(t => t.id === taskId);
        if (!task) {
             task = { id: taskId, section: sectionId, worker: workerId };
             appData.accounts[accountName].tasks.push(task);
        }

        task.task = taskInput;
        task.duration = duration || null;
        task.unit = unit;
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
    document.getElementById('back-to-accounts').addEventListener('click', () => navigateTo('accounts-page'));

    // 帳號頁面輸入 (事件委派)
    accountsPage.addEventListener('input', e => {
        // 處理工人數變更
        if (e.target.classList.contains('worker-count')) {
            const count = parseInt(e.target.value, 10) || 0;
            const accountName = e.target.dataset.account;
            const sectionId = e.target.dataset.section;
            const container = e.target.closest('.input-section').querySelector('.worker-rows-container');
            generateWorkerRows(container, count, accountName, sectionId);
        }
        // 處理等級變更
        if (e.target.classList.contains('level-input')) {
            const accountName = e.target.dataset.account;
            const sectionId = e.target.dataset.section;
            if (!appData.accounts[accountName].levels) {
                appData.accounts[accountName].levels = {};
            }
            appData.accounts[accountName].levels[sectionId] = e.target.value;
            saveData(appData);
        }
    });

    // 排程頁面刪除 (事件委派)
    taskListContainer.addEventListener('click', (e) => handleDeleteTask(e, appData, ACCOUNTS_CONFIG));

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