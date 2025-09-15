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
    const loadingOverlay = document.getElementById('loading-overlay'); // 【新增】

    // --- 【新增】載入提示函式 ---
    function showLoader() {
        loadingOverlay.classList.add('visible');
    }

    function hideLoader() {
        loadingOverlay.classList.remove('visible');
    }

    // --- 【修改】導航函數，整合載入提示 ---
    function navigateTo(pageId) {
        showLoader();
        
        // 使用 setTimeout 確保載入提示有時間渲染出來
        setTimeout(() => {
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            
            if (pageId === 'scheduler-page') {
                renderScheduler(appData, SECTIONS_CONFIG);
            } else if (pageId === 'accounts-page') {
                // 當切換到帳號頁時，重新渲染以確保資料最新
                renderAccountPages(ACCOUNTS_CONFIG, appData);
                updateSlider();
            }
            
            // 延遲一點時間隱藏載入提示，讓頁面內容渲染完成
            setTimeout(hideLoader, 200);
        }, 50);
    }


// --- 【修改】動態生成帳號頁面，移除頁尾按鈕 ---
function renderAccountPages(configs, data) {
    accountSlider.innerHTML = '';
    configs.forEach((acc, index) => {
        const slide = document.createElement('div');
        slide.className = 'account-page-slide';
        slide.dataset.index = index;
        slide.dataset.accountName = acc.name;

        const accountData = data.accounts[acc.name];

        const homeVillageTasks = accountData.tasks.filter(t => t.section === 'home-village');
        const taskMap = {};
        homeVillageTasks.forEach(task => {
            taskMap[task.worker] = task.task || '(無任務)';
        });
        
        const homeVillageWorkerCount = accountData.workerCounts['home-village'] || 0;
        const specialTasks = accountData.specialTasks;
        let workerOptions = '';
        for(let i = 1; i <= homeVillageWorkerCount; i++) {
            const workerId = `${i}`;
            const taskName = taskMap[workerId] || '(無任務)';
            workerOptions += `<option value="${workerId}" ${specialTasks.workerApprentice.targetWorker === workerId ? 'selected' : ''}>${workerId} - ${taskName}</option>`;
        }

        const specialCollapsed = accountData.collapsedSections['special-tasks'] || true;

        const specialTasksHtml = `
            <div class="special-tasks-container">
                <div class="input-section ${specialCollapsed ? 'collapsed' : ''}" data-section-id="special-tasks" data-account="${acc.name}">
                    <div class="section-header">
                        <h3 class="section-title">特殊任務</h3>
                    </div>
                    <div class="input-section-body">
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
        
        let sectionsHtml = '';
        SECTIONS_CONFIG.forEach(sec => {
            const savedLevel = accountData.levels[sec.id] || sec.defaultLevel;
            const isCollapsed = accountData.collapsedSections[sec.id];
            sectionsHtml += `
                <div class="input-section ${isCollapsed ? 'collapsed' : ''}" data-section-id="${sec.id}" data-account="${acc.name}">
                    <div class="section-header">
                        <h3 class="section-title">${sec.title}</h3>
                    </div>
                    <div class="input-section-body">
                        <div class="section-header-level">
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

            if (sec.id === 'laboratory') {
                sectionsHtml += specialTasksHtml;
            }
        });

         // 【修改】移除 slide 內部獨立的頁尾按鈕
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

    const homeVillageTasks = appData.accounts[accountName].tasks.filter(t => t.section === 'home-village');
    const taskMap = {};
    homeVillageTasks.forEach(task => {
        taskMap[task.worker] = task.task || '(無任務)';
    });

    const homeVillageWorkerCount = appData.accounts[accountName].workerCounts['home-village'] || 0;
    let workerOptions = '';
    for (let i = 1; i <= homeVillageWorkerCount; i++) {
        const workerId = `${i}`;
        const taskName = taskMap[workerId] || '(無任務)';
        const selected = appData.accounts[accountName].specialTasks.workerApprentice.targetWorker === workerId ? 'selected' : '';
        workerOptions += `<option value="${workerId}" ${selected}>${workerId} - ${taskName}</option>`;
    }

    select.innerHTML = workerOptions;
}

accountsPage.addEventListener('click', e => {
    if (e.target.closest('.section-title')) {
        const section = e.target.closest('.input-section');
        if (section) {
            const accountName = section.dataset.account;
            const sectionId = section.dataset.sectionId;
            const isCurrentlyCollapsed = section.classList.contains('collapsed');
            section.classList.toggle('collapsed');
            if (!appData.accounts[accountName].collapsedSections) {
                appData.accounts[accountName].collapsedSections = {};
            }
            appData.accounts[accountName].collapsedSections[sectionId] = !isCurrentlyCollapsed;
            saveData(appData);
            
            if (sectionId === 'home-village' || (sectionId === 'special-tasks' && isCurrentlyCollapsed)) {
                 updateWorkerApprenticeSelect(accountName);
            }
        }
    }
});
    function generateWorkerRows(container, count, accountName, sectionId) {
    container.innerHTML = '';
    const accountTasks = appData.accounts[accountName].tasks.filter(t => t.section === sectionId);

    for (let i = 1; i <= count; i++) {
        const workerId = `${i}`;
        const existingTask = accountTasks.find(t => t.worker === workerId);
        const taskId = existingTask ? existingTask.id : `${accountName}-${sectionId}-${workerId}-${Date.now()}`;
        
        let durationString = '';
        let durationColor = 'black';

        if (existingTask && existingTask.duration && existingTask.entryTimestamp) {
            const originalMinutes = (existingTask.duration.days || 0) * 1440 +
                                  (existingTask.duration.hours || 0) * 60 +
                                  (existingTask.duration.minutes || 0);
            
            if (originalMinutes > 0) {
                const elapsedMinutes = (Date.now() - existingTask.entryTimestamp) / (1000 * 60);
                const remainingMinutes = Math.max(0, originalMinutes - elapsedMinutes);

                const days = Math.floor(remainingMinutes / 1440);
                const hours = Math.floor((remainingMinutes % 1440) / 60);
                const minutes = Math.round(remainingMinutes % 60);

                durationString = `${days}-${hours}-${minutes}`;
                durationColor = 'blue';
            }
        } else if (existingTask && existingTask.duration) {
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
                <input type="text" class="duration-combined" placeholder="天-時-分 (例: 5-12-30)" value="${durationString}" style="color: ${durationColor};">
            </div>
            <div class="completion-time" readonly></div>
        `;
        container.appendChild(row);

        const durationInput = row.querySelector('.duration-combined');
        durationInput.addEventListener('input', () => {
            durationInput.style.color = 'black';
        });

        handleTaskInputChange(row, accountName, sectionId, workerId, taskId, false);

        const inputs = row.querySelectorAll('.task-input, .duration-combined');
        inputs.forEach(input => {
            input.addEventListener('input', () => handleTaskInputChange(row, accountName, sectionId, workerId, taskId, true));
        });
    }
}
    
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
    const completionTimeDiv = row.querySelector('.completion-time');

    let task = appData.accounts[accountName].tasks.find(t => t.id === taskId);

    const parts = durationInput.split('-').map(p => p.trim());
    const durationDays = parseInt(parts[0], 10) || 0;
    const durationHours = parseInt(parts[1], 10) || 0;
    const durationMinutes = parseInt(parts[2], 10) || 0;
    const totalDurationInMinutes = (durationDays * 24 * 60) + (durationHours * 60) + durationMinutes;

    let entryTimestamp = task?.entryTimestamp || null;
    const hasNewDuration = totalDurationInMinutes > 0;
    const oldDurationInMinutes = task?.duration ? (task.duration.days * 1440) + (task.duration.hours * 60) + task.duration.minutes : 0;

    if (shouldSave && hasNewDuration && totalDurationInMinutes !== oldDurationInMinutes) {
        entryTimestamp = Date.now();
    }
    
    if (!hasNewDuration) {
        entryTimestamp = null;
    }

    const finalDurationInMinutes = applySpecialReductions(totalDurationInMinutes, accountName, sectionId, workerId);
    
    const completionTime = calculateCompletionTime(entryTimestamp, finalDurationInMinutes);
    completionTimeDiv.textContent = completionTime || 'N/A';

    if (shouldSave) {
        if (!task) {
            if (taskInput || hasNewDuration) {
                task = { id: taskId, section: sectionId, worker: workerId };
                appData.accounts[accountName].tasks.push(task);
            } else {
                return;
            }
        }

        task.task = taskInput;
        task.duration = { days: durationDays, hours: durationHours, minutes: durationMinutes };
        task.entryTimestamp = entryTimestamp;
        task.completion = completionTime;
        
        if (!task.task && !hasNewDuration) {
            appData.accounts[accountName].tasks = appData.accounts[accountName].tasks.filter(t => t.id !== taskId);
        }

        saveData(appData);
        
        if (sectionId === 'home-village') {
            updateWorkerApprenticeSelect(accountName);
        }
    }
}

function calculateCompletionTime(entryTimestamp, finalDurationInMinutes) {
    if (!entryTimestamp || finalDurationInMinutes <= 0) {
        return 'N/A';
    }

    const completionDate = new Date(entryTimestamp);
    completionDate.setMinutes(completionDate.getMinutes() + finalDurationInMinutes);

    const year = completionDate.getFullYear();
    const month = (completionDate.getMonth() + 1).toString().padStart(2, '0');
    const day = completionDate.getDate().toString().padStart(2, '0');
    const hours = completionDate.getHours().toString().padStart(2, '0');
    const minutes = completionDate.getMinutes().toString().padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
}
    
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

    function updateSlider() {
        accountSlider.scrollLeft = currentAccountIndex * accountSlider.clientWidth;
        document.getElementById('account-indicator').textContent = `${currentAccountIndex + 1} / ${ACCOUNTS_CONFIG.length}`;
    }

   // --- 事件監聽 ---
    document.getElementById('go-to-scheduler-from-home').addEventListener('click', () => navigateTo('scheduler-page'));
    document.getElementById('go-to-accounts-from-home').addEventListener('click', () => navigateTo('accounts-page'));
    
    // 【修改】此監聽器現在會處理固定頁尾中的按鈕
    document.body.addEventListener('click', e => {
        if (e.target.classList.contains('go-to-scheduler-from-accounts')) {
            navigateTo('scheduler-page');
        }
    });

    document.getElementById('go-to-accounts-from-scheduler').addEventListener('click', () => navigateTo('accounts-page'));
      
    document.getElementById('export-json-btn').addEventListener('click', () => {
        const jsonString = JSON.stringify(appData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().slice(0, 10);
        a.download = `clash-scheduler-data-${today}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

accountsPage.addEventListener('input', e => {
    const accountName = e.target.dataset.account;
    if (!accountName) return;

    const sectionId = e.target.dataset.section;

    if (e.target.classList.contains('worker-count')) {
        const count = parseInt(e.target.value, 10) || 0;
        const container = e.target.closest('.input-section').querySelector('.worker-rows-container');
        if (!appData.accounts[accountName].workerCounts) appData.accounts[accountName].workerCounts = {};
        appData.accounts[accountName].workerCounts[sectionId] = count;
        
        if (sectionId === 'home-village') {
            updateWorkerApprenticeSelect(accountName);
        }

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
        appData.accounts[accountName].specialTasks.workerApprentice.targetWorker = e.target.value;
        saveData(appData);
        recalculateDependentTasks(accountName);
        updateWorkerApprenticeSelect(accountName);
    }
});
    // --- 【修改】刪除任務的事件監聽，整合載入提示 ---
    taskListContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.btn-delete');
        if (deleteButton) {
            const accountName = deleteButton.dataset.account;
            const taskId = deleteButton.dataset.taskId;
            
            showLoader(); // 顯示載入提示

            // 異步處理，確保提示優先顯示
            setTimeout(() => {
                const account = appData.accounts[accountName];
                if (!account) {
                    hideLoader();
                    return;
                }

                const taskToDelete = account.tasks.find(task => task.id === taskId);
                if (!taskToDelete) {
                    hideLoader();
                    return;
                }

                const sectionToExpand = taskToDelete.section;

                // 清理相關特殊任務
                const specialTasks = account.specialTasks;
                if (taskToDelete.section === 'home-village' && taskToDelete.worker === specialTasks.workerApprentice.targetWorker) {
                    specialTasks.workerApprentice.level = '';
                }
                if (taskToDelete.section === 'laboratory') {
                    specialTasks.labAssistant.level = '';
                }
                
                if (!account.collapsedSections) account.collapsedSections = {};
                account.collapsedSections[sectionToExpand] = false; // 展開相關區塊

                account.tasks = account.tasks.filter(task => task.id !== taskId);
                
                saveData(appData);

                const accountIndex = ACCOUNTS_CONFIG.findIndex(acc => acc.name === accountName);
                if (accountIndex !== -1) {
                    currentAccountIndex = accountIndex;
                    
                    // 手動執行導航和渲染，以更好地控制載入提示的隱藏時機
                    pages.forEach(p => p.classList.remove('active'));
                    const accountsPageElement = document.getElementById('accounts-page');
                    accountsPageElement.classList.add('active');
                    
                    renderAccountPages(ACCOUNTS_CONFIG, appData);
                    updateSlider();

                    const scrollToAction = () => {
                        const targetSlide = document.querySelector(`.account-page-slide[data-account-name="${accountName}"]`);
                        if (targetSlide) {
                            const targetSection = targetSlide.querySelector(`.input-section[data-section-id="${sectionToExpand}"]`);
                            if (targetSection) {
                                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                        // 在轉場和滾動都結束後才隱藏載入提示
                        setTimeout(hideLoader, 100);
                    };
                    
                    accountsPageElement.addEventListener('transitionend', scrollToAction, { once: true });
                } else {
                    hideLoader();
                }
            }, 50);
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
            loadState();
    loadSchedulerState();
    checkAndApplySpecialTaskDeductions();
    }

    init();
});

/**
 * Checks for and applies special task deductions based on the current date and time.
 * This function handles multi-day deductions if the user hasn't logged in for a while.
 */
function checkAndApplySpecialTaskDeductions() {
    const now = new Date();
    const today = formatDate(now);
    const lastDeductionRecords = JSON.parse(localStorage.getItem('specialTaskDeductions')) || {};
    let changed = false;

    // Only run if it's after 3 PM
    if (now.getHours() >= 15) {
        state.taskData.forEach(task => {
            if (task.section === 'special-tasks' && task.assignedTo && task.totalHours > 0) {
                const lastDeductionDateStr = lastDeductionRecords[task.id];
                const lastDeductionDate = lastDeductionDateStr ? new Date(lastDeductionDateStr) : new Date(task.assignedDate);

                const oneDay = 24 * 60 * 60 * 1000;
                let daysToDeduct = 0;

                // Handle initial assignment date if it's today
                if (!lastDeductionDateStr) {
                    const assignedDate = new Date(task.assignedDate);
                    // Check if assigned today before 3 PM
                    if (formatDate(assignedDate) === today && assignedDate.getHours() < 15) {
                        daysToDeduct = 1;
                    }
                } else {
                    // Calculate days passed since last deduction
                    let currentDate = new Date(lastDeductionDate.getTime() + oneDay);
                    while (formatDate(currentDate) <= today) {
                        // Only count days that passed 3 PM
                        if (currentDate.getHours() >= 15 || formatDate(currentDate) !== lastDeductionDateStr) {
                            daysToDeduct++;
                        }
                        currentDate.setTime(currentDate.getTime() + oneDay);
                    }
                }
                
                if (daysToDeduct > 0) {
                    const hoursToDeduct = task.level * daysToDeduct;
                    task.totalHours = Math.max(0, task.totalHours - hoursToDeduct);
                    console.log(`Deducted ${hoursToDeduct} hours for task ${task.id} over ${daysToDeduct} day(s). New total: ${task.totalHours}`);
                    lastDeductionRecords[task.id] = today;
                    changed = true;
                }
            }
        });
        
        if (changed) {
            localStorage.setItem('specialTaskDeductions', JSON.stringify(lastDeductionRecords));
            saveState(); // Update the main app state
            renderAccountTasks();
            renderScheduler();
        }
    }
}

// 處理行動裝置鍵盤彈出時的畫面高度問題
const appContainer = document.getElementById('app-container');

function setAppHeight() {
    // 使用 window.innerHeight 來取得包含鍵盤的正確可視高度
    appContainer.style.height = `${window.innerHeight}px`;
}

// 頁面載入和視窗大小改變時都重新計算高度
window.addEventListener('resize', setAppHeight);

// 初始載入時先設定一次
setAppHeight();