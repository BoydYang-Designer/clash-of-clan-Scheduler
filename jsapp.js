// 【修正】將 SECTIONS_CONFIG 移到全域，讓 jsutils.js 可存取
const SECTIONS_CONFIG = [
    { id: 'home-village', title: '大本營', defaultLevel: '5', unit: '本' },
    { id: 'laboratory', title: '實驗室', defaultLevel: '5', unit: '級' },
    { id: 'pet-house', title: '戰寵小屋', defaultLevel: '1', unit: '級' },
    { id: 'builder-base', title: '建築大師', defaultLevel: '2', unit: '本' },
    { id: 'star-laboratory', title: '星空實驗', defaultLevel: '5', unit: '級' },
];

document.addEventListener('DOMContentLoaded', () => {
    // --- 帳號設定 ---
    const ACCOUNTS_CONFIG = [
        { name: '路人甲', avatar: 'images/路人甲.png' },
        { name: '奇異果冰沙', avatar: 'images/奇異果冰沙.png' },
        { name: '鯨頭鸛', avatar: 'images/鯨頭鸛.png' },
        { name: '楊令公', avatar: 'images/楊令公.png' },
        { name: '燈眼魚', avatar: 'images/燈眼魚.png' },
    ];

    // --- 全局狀態 ---
    let appData = loadData(ACCOUNTS_CONFIG);
    let currentAccountIndex = 0;

    // --- DOM 元素 ---
    const pages = document.querySelectorAll('.page');
    const accountsPage = document.getElementById('accounts-page');
    const taskListContainer = document.getElementById('task-list');
    const accountSlider = document.querySelector('.account-slider-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    // --- 載入提示函式 ---
    function showLoader() {
        loadingOverlay.classList.add('visible');
    }

    function hideLoader() {
        loadingOverlay.classList.remove('visible');
    }

    // --- 導航函數 ---
    function navigateTo(pageId) {
        showLoader();
        
        setTimeout(() => {
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            
            if (pageId === 'scheduler-page') {
                renderScheduler(appData, SECTIONS_CONFIG);
            } else if (pageId === 'accounts-page') {
                renderAccountPages(ACCOUNTS_CONFIG, appData);
                updateSlider();
            }
            
            setTimeout(hideLoader, 200);
        }, 50);
    }

// --- 動態生成帳號頁面 ---
function renderAccountPages(configs, data) {
    accountSlider.innerHTML = '';
    configs.forEach((acc, index) => {
        const slide = document.createElement('div');
        slide.className = 'account-page-slide';
        slide.dataset.index = index;
        slide.dataset.accountName = acc.name;

        const accountData = data.accounts[acc.name];
        const specialTasks = accountData.specialTasks || {};
        const specialCollapsed = accountData.collapsedSections['special-tasks'] || true;
        
        const specialTasksHtml = `
            <div class="special-tasks-container">
                <div class="input-section ${specialCollapsed ? 'collapsed' : ''}" data-section-id="special-tasks" data-account="${acc.name}">
                    <div class="section-header">
                        <h3 class="section-title">特殊任務</h3>
                    </div>
                    <div class="input-section-body">
                        <div class="special-task-block">
                            <label>工人學徒</label>
                            <div class="special-task-row">
                                <span>等級:</span>
                                <input type="number" class="special-task-input" data-account="${acc.name}" data-special-task="workerApprentice" value="${specialTasks.workerApprentice?.level || ''}" placeholder="Lv">
                                <span>開始:</span>
                                <input type="time" class="special-task-time-input" data-account="${acc.name}" data-special-task="workerApprentice" value="${specialTasks.workerApprentice?.startTime || '15:00'}">
                            </div>
                            <label>指定任務 (大本營):</label>
                            <select class="special-task-select" data-account="${acc.name}" data-special-task="workerApprenticeTarget">
                                <option value="">-- 未指派 --</option>
                            </select>
                        </div>
                        <div class="special-task-block">
                            <label>實驗助手</label>
                             <div class="special-task-row">
                                <span>等級:</span>
                                <input type="number" class="special-task-input" data-account="${acc.name}" data-special-task="labAssistant" value="${specialTasks.labAssistant?.level || ''}" placeholder="Lv">
                                <span>開始:</span>
                                <input type="time" class="special-task-time-input" data-account="${acc.name}" data-special-task="labAssistant" value="${specialTasks.labAssistant?.startTime || '15:00'}">
                            </div>
                            <label>指定任務 (實驗室):</label>
                            <select class="special-task-select" data-account="${acc.name}" data-special-task="labAssistantTarget">
                                <option value="">-- 未指派 --</option>
                            </select>
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
                            <input type="number" class="worker-count" min="0" max="9" placeholder="0" data-account="${acc.name}" data-section="${sec.id}">
                        </div>
                        <div class="worker-rows-container"></div>
                    </div>
                </div>
            `;

            if (sec.id === 'home-village') {
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

        updateTaskTargetSelect(acc.name, 'workerApprenticeTarget', 'home-village');
        updateTaskTargetSelect(acc.name, 'labAssistantTarget', 'laboratory');
    });

    restoreInputsFromData(data);
}

function updateTaskTargetSelect(accountName, specialTaskType, sourceSectionId) {
    const selector = `.account-page-slide[data-account-name="${accountName}"] .special-task-select[data-special-task="${specialTaskType}"]`;
    const select = document.querySelector(selector);
    if (!select) return;

    const relevantTasks = appData.accounts[accountName].tasks.filter(t => t.section === sourceSectionId && t.task);
    const specialTaskKey = specialTaskType.replace('Target', '');
    const currentTargetId = appData.accounts[accountName].specialTasks[specialTaskKey]?.targetTaskId || '';
    
    let taskOptions = '<option value="">-- 未指派 --</option>';
    relevantTasks.forEach(task => {
        const selected = task.id === currentTargetId ? 'selected' : '';
        taskOptions += `<option value="${task.id}" ${selected}>工人 ${task.worker} - ${task.task}</option>`;
    });

    select.innerHTML = taskOptions;
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
        }
    }
});

/**
 * 【修改】重寫時間計算邏輯，以反應剩餘時間
 */
function generateWorkerRows(container, count, accountName, sectionId) {
    count = Math.min(count, 9);
    container.innerHTML = '';
    const accountTasks = appData.accounts[accountName].tasks.filter(t => t.section === sectionId);

    for (let i = 1; i <= count; i++) {
        const workerId = `${i}`;
        const existingTask = accountTasks.find(t => t.worker === workerId);
        const taskId = existingTask ? existingTask.id : `${accountName}-${sectionId}-${workerId}-${Date.now()}`;
        
        // 永遠顯示原始持續時間（黑字）
        let durationString = '';
        let durationColor = 'black';
        if (existingTask?.duration) {
            durationString = `${existingTask.duration.days || 0}-${existingTask.duration.hours || 0}-${existingTask.duration.minutes || 0}`;
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

    /**
     * 【修改】註記改為以小時顯示
     */
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
        
        // 只有在手動輸入新時間時，才更新時間戳，並儲存原始 duration
        if (shouldSave && document.activeElement === row.querySelector('.duration-combined')) {
            entryTimestamp = Date.now();
        }
        
        if (!hasNewDuration) {
            entryTimestamp = null;
        }

        const totalDeductedMinutes = task?.totalDeductedMinutes || 0;
        
        // 使用儲存的原始 duration（如果存在），否則用 input 的（新輸入時）
        const effectiveTotalDuration = task?.duration 
            ? (task.duration.days * 24 * 60) + (task.duration.hours * 60) + task.duration.minutes
            : totalDurationInMinutes;
        
        const completionResult = calculateCompletionTime(entryTimestamp, effectiveTotalDuration, totalDeductedMinutes);
        
        let completionHtml = completionResult.time;
        if (completionResult.deductions > 0) {
            let deductionText;
            if (completionResult.deductions % 60 === 0) {
                const hours = completionResult.deductions / 60;
                deductionText = `(已扣除: ${hours} 小時)`;
            } else {
                deductionText = `(已扣除: ${completionResult.deductions} 分鐘)`;
            }
            completionHtml += ` <span class="deduction-note">${deductionText}</span>`;
        }
        completionTimeDiv.innerHTML = completionHtml;

        if (shouldSave) {
            if (!task) {
                if (taskInput || hasNewDuration) {
                    task = { id: taskId, section: sectionId, worker: workerId, totalDeductedMinutes: 0 };
                    appData.accounts[accountName].tasks.push(task);
                } else {
                    return;
                }
            }

            task.task = taskInput;
            task.duration = { days: durationDays, hours: durationHours, minutes: durationMinutes };
            task.entryTimestamp = entryTimestamp;
            task.completion = completionResult.time;
            
            if (!task.task && !hasNewDuration) {
                appData.accounts[accountName].tasks = appData.accounts[accountName].tasks.filter(t => t.id !== taskId);
            }

            saveData(appData);
            
            updateTaskTargetSelect(accountName, 'workerApprenticeTarget', 'home-village');
            updateTaskTargetSelect(accountName, 'labAssistantTarget', 'laboratory');
        }
    }

function calculateCompletionTime(entryTimestamp, totalDurationInMinutes, totalDeductedMinutes = 0) {
    if (!entryTimestamp || totalDurationInMinutes <= 0) {
        return { time: 'N/A', deductions: 0 };
    }

    const now = Date.now();
    const elapsedMinutes = (now - entryTimestamp) / (1000 * 60);
    const remainingMinutes = Math.max(0, totalDurationInMinutes - totalDeductedMinutes - elapsedMinutes);

    if (remainingMinutes <= 0) {
        return { time: '已完成', deductions: totalDeductedMinutes };
    }

    // 如果剩餘時間小於 60 分鐘，直接回傳分鐘數
    if (remainingMinutes < 60) {
        return { time: `${Math.round(remainingMinutes)} 分鐘`, deductions: totalDeductedMinutes };
    }

    const completionDate = new Date(now);
    completionDate.setMinutes(completionDate.getMinutes() + remainingMinutes);

    const year = completionDate.getFullYear();
    const month = (completionDate.getMonth() + 1).toString().padStart(2, '0');
    const day = completionDate.getDate().toString().padStart(2, '0');
    const hours = completionDate.getHours().toString().padStart(2, '0');
    const minutes = completionDate.getMinutes().toString().padStart(2, '0');

    return {
        time: `${year}/${month}/${day} ${hours}:${minutes}`,
        deductions: totalDeductedMinutes
    };
}
    
    function updateSlider() {
        accountSlider.scrollLeft = currentAccountIndex * accountSlider.clientWidth;
        document.getElementById('account-indicator').textContent = `${currentAccountIndex + 1} / ${ACCOUNTS_CONFIG.length}`;
    }

   // --- 事件監聽 ---
    document.getElementById('go-to-scheduler-from-home').addEventListener('click', () => navigateTo('scheduler-page'));
    document.getElementById('go-to-accounts-from-home').addEventListener('click', () => navigateTo('accounts-page'));
    
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

    const importJsonBtn = document.getElementById('import-json-btn');
    const importFileInput = document.getElementById('import-file-input');

    importJsonBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('此操作會覆蓋所有現有設定，並重新載入頁面。您確定要繼續嗎？')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && importedData.accounts) {
                    saveData(importedData);
                    alert('匯入成功！應用程式將會重新載入。');
                    window.location.reload();
                } else {
                    alert('匯入失敗：無效的 JSON 檔案格式。');
                }
            } catch (error) {
                alert(`匯入失敗： ${error.message}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    });

accountsPage.addEventListener('input', e => {
    const accountName = e.target.dataset.account;
    if (!accountName) return;

    const sectionId = e.target.dataset.section;

    if (e.target.classList.contains('worker-count')) {
        let count = parseInt(e.target.value, 10) || 0;
        if (count > 9) {
            e.target.value = 9;
            count = 9;
        }
        const container = e.target.closest('.input-section').querySelector('.worker-rows-container');
        appData.accounts[accountName].workerCounts[sectionId] = count;
        saveData(appData);
        generateWorkerRows(container, count, accountName, sectionId);
    } else if (e.target.classList.contains('level-input')) {
        appData.accounts[accountName].levels[sectionId] = e.target.value;
        saveData(appData);
    } else if (e.target.classList.contains('special-task-input')) {
        const taskType = e.target.dataset.specialTask;
        appData.accounts[accountName].specialTasks[taskType].level = e.target.value;
        saveData(appData);
    } else if (e.target.classList.contains('special-task-time-input')) {
        const taskType = e.target.dataset.specialTask;
        appData.accounts[accountName].specialTasks[taskType].startTime = e.target.value;
        saveData(appData);
    } else if (e.target.classList.contains('special-task-select')) {
        const taskType = e.target.dataset.specialTask.replace('Target', '');
        appData.accounts[accountName].specialTasks[taskType].targetTaskId = e.target.value;
        saveData(appData);
    }
});

    taskListContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.btn-delete');
        if (deleteButton) {
            const accountName = deleteButton.dataset.account;
            const taskId = deleteButton.dataset.taskId;
            
            showLoader();

            setTimeout(() => {
                const account = appData.accounts[accountName];
                if (!account) { hideLoader(); return; }

                if (account.specialTasks) {
                    if (account.specialTasks.labAssistant?.targetTaskId === taskId) {
                        account.specialTasks.labAssistant.targetTaskId = '';
                    }
                    if (account.specialTasks.workerApprentice?.targetTaskId === taskId) {
                        account.specialTasks.workerApprentice.targetTaskId = '';
                    }
                }

                const taskToDelete = account.tasks.find(task => task.id === taskId);
                if (!taskToDelete) { hideLoader(); return; }
                
                const sectionToExpand = taskToDelete.section;
                if (!account.collapsedSections) account.collapsedSections = {};
                account.collapsedSections[sectionToExpand] = false;

                account.tasks = account.tasks.filter(task => task.id !== taskId);
                
                saveData(appData);

                const accountIndex = ACCOUNTS_CONFIG.findIndex(acc => acc.name === accountName);
                if (accountIndex !== -1) {
                    currentAccountIndex = accountIndex;
                    navigateTo('accounts-page');
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
    
    let scrollLeftBeforeFocus;
    accountsPage.addEventListener('focusin', (e) => {
        if (e.target.classList.contains('task-input')) {
            scrollLeftBeforeFocus = accountSlider.scrollLeft;
        }
    });

    accountsPage.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('task-input')) {
            setTimeout(() => {
                if (accountSlider.scrollLeft !== scrollLeftBeforeFocus) {
                    accountSlider.scrollLeft = scrollLeftBeforeFocus;
                }
            }, 100);
        }
    });

    function checkAndApplySpecialTaskDeductions() {
        const now = new Date();
        const todayStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
        const deductionRecords = JSON.parse(localStorage.getItem('dailyDeductionRecords')) || {};
        let dataChanged = false;

        Object.keys(appData.accounts).forEach(accountName => {
            const account = appData.accounts[accountName];
            if (!account.specialTasks) return;

            ['workerApprentice', 'labAssistant'].forEach(specialTaskType => {
                const specialTask = account.specialTasks[specialTaskType];

                if (!specialTask || !specialTask.level || !specialTask.targetTaskId || !specialTask.startTime) return;

                const recordKey = `${accountName}-${specialTask.targetTaskId}-${specialTaskType}`;
                if (deductionRecords[recordKey] === todayStr) return;

                const [startHours, startMinutes] = specialTask.startTime.split(':').map(Number);
                if (now.getHours() > startHours || (now.getHours() === startHours && now.getMinutes() >= startMinutes)) {
                    const targetTask = account.tasks.find(t => t.id === specialTask.targetTaskId);
                    if (!targetTask) return;

                    const deductionAmount = parseInt(specialTask.level, 10) * 60;
                    if (deductionAmount <= 0) return;

                    targetTask.totalDeductedMinutes = (targetTask.totalDeductedMinutes || 0) + deductionAmount;

                    deductionRecords[recordKey] = todayStr;
                    dataChanged = true;
                }
            });
        });

        if (dataChanged) {
            localStorage.setItem('dailyDeductionRecords', JSON.stringify(deductionRecords));
            saveData(appData);
            if (document.getElementById('accounts-page').classList.contains('active')) {
                renderAccountPages(ACCOUNTS_CONFIG, appData);
                updateSlider();
            }
        }
    }
    
    function setAppHeight() {
        document.getElementById('app-container').style.height = `${window.innerHeight}px`;
    }

    function init() {
        renderAccountPages(ACCOUNTS_CONFIG, appData);
        checkAndApplySpecialTaskDeductions();
        navigateTo('home-page');
        window.addEventListener('resize', setAppHeight);
        setAppHeight();
    }

    init();
});