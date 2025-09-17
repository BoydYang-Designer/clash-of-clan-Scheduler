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
        { name: '路人甲', avatar: 'images/路人甲.png', arrow: 'images/路人甲箭頭.png' },
        { name: '奇異果冰沙', avatar: 'images/奇異果冰沙.png', arrow: 'images/奇異果冰沙箭頭.png' },
        { name: '鯨頭鸛', avatar: 'images/鯨頭鸛.png', arrow: 'images/鯨頭鸛箭頭.png' },
        { name: '楊令公', avatar: 'images/楊令公.png', arrow: 'images/楊令公箭頭.png' },
        { name: '燈眼魚', avatar: 'images/燈眼魚.png', arrow: 'images/燈眼魚箭頭.png' },
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

// --- 【MAJOR UPDATE】動態生成帳號頁面，並修改頭部佈局 ---
function renderAccountPages(configs, data) {
    accountSlider.innerHTML = '';
    configs.forEach((acc, index) => {
        const slide = document.createElement('div');
        slide.className = 'account-page-slide';
        slide.dataset.index = index;
        slide.dataset.accountName = acc.name;

        const accountData = data.accounts[acc.name];
        const specialTasks = accountData.specialTasks || {};
        
        let sectionsHtml = '';
        SECTIONS_CONFIG.forEach(sec => {
            const savedLevel = accountData.levels[sec.id] || sec.defaultLevel;
            const isCollapsed = accountData.collapsedSections[sec.id];
            
            let specialTaskBlockHtml = '';

            if (sec.id === 'home-village') {
                specialTaskBlockHtml = `
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
                `;
            }
            else if (sec.id === 'laboratory') {
                specialTaskBlockHtml = `
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
                `;
            }

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
                        
                        ${specialTaskBlockHtml}
                    </div>
                </div>
            `;
        });
         
        // 【修改】HTML 結構以實現新的黏性頭部
        slide.innerHTML = `
            <div class="account-header">
                <button class="slider-arrow prev-account-arrow">
                    <img src="${acc.arrow}" alt="上一個帳號">
                </button>
                <img src="${acc.avatar}" alt="${acc.name} 頭像" class="account-avatar">
                <button class="slider-arrow next-account-arrow">
                    <img src="${acc.arrow}" alt="下一個帳號">
                </button>
            </div>
            <h2 class="account-name">${acc.name}</h2>
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
 * 【MAJOR UPDATE】重寫此函數以滿足新的時間計算與顯示需求
 */
function generateWorkerRows(container, count, accountName, sectionId) {
    count = Math.min(count, 9);
    container.innerHTML = '';
    const accountTasks = appData.accounts[accountName].tasks.filter(t => t.section === sectionId);

    for (let i = 1; i <= count; i++) {
        const workerId = `${i}`;
        const existingTask = accountTasks.find(t => t.worker === workerId);
        const taskId = existingTask ? existingTask.id : `${accountName}-${sectionId}-${workerId}-${Date.now()}`;
        
        let durationString = '';
        let durationColor = 'black'; // 預設為黑色字體

        // 如果任務存在且有計時開始點，則計算剩餘時間並顯示為藍色
        if (existingTask && existingTask.entryTimestamp) {
            const originalTotalMinutes = (existingTask.duration.days * 24 * 60) + (existingTask.duration.hours * 60) + existingTask.duration.minutes;
            const elapsedMinutes = (Date.now() - existingTask.entryTimestamp) / (1000 * 60);
            const totalDeductedMinutes = existingTask.totalDeductedMinutes || 0;
            
            const remainingMinutes = Math.max(0, originalTotalMinutes - elapsedMinutes - totalDeductedMinutes);

            const remDays = Math.floor(remainingMinutes / (24 * 60));
            const remHours = Math.floor((remainingMinutes % (24 * 60)) / 60);
            const remMinutes = Math.round(remainingMinutes % 60);

            durationString = `${remDays}-${remHours}-${remMinutes}`;
            durationColor = 'blue'; // 已重新計算的時間顯示為藍色
        } else if (existingTask?.duration) {
            // 若任務存在但尚未開始計時，顯示原始時間
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

        // 手動輸入時，字體顏色變回黑色
        const durationInput = row.querySelector('.duration-combined');
        durationInput.addEventListener('input', () => {
            durationInput.style.color = 'black';
        });

        // 觸發一次計算以顯示當前的完成時間
        handleTaskInputChange(row, accountName, sectionId, workerId, taskId, false);

        // 為所有輸入框添加事件監聽器，以便在變動時保存
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
        
        // 【核心變動】只在手動輸入新時間時，才更新時間戳，並儲存原始 duration
        if (shouldSave && document.activeElement === row.querySelector('.duration-combined')) {
            entryTimestamp = Date.now();
        }
        
        if (totalDurationInMinutes <= 0) {
            entryTimestamp = null;
        }

        const totalDeductedMinutes = task?.totalDeductedMinutes || 0;
        
        // 【核心變動】使用儲存的原始 duration 進行計算（如果存在），否則用 input 的（代表是新輸入）
        const effectiveTotalDuration = (shouldSave && document.activeElement === row.querySelector('.duration-combined')) || !task?.duration
            ? totalDurationInMinutes
            : (task.duration.days * 24 * 60) + (task.duration.hours * 60) + task.duration.minutes;
        
        const completionResult = calculateCompletionTime(entryTimestamp, effectiveTotalDuration, totalDeductedMinutes);
        
        let completionHtml = completionResult.time;
        // 如果有扣除時間，則加上提示
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
                if (taskInput || totalDurationInMinutes > 0) {
                    task = { id: taskId, section: sectionId, worker: workerId, totalDeductedMinutes: 0 };
                    appData.accounts[accountName].tasks.push(task);
                } else {
                    return; // 如果是空任務，直接返回
                }
            }

            task.task = taskInput;
            // 【核心變動】只有在手動輸入時才更新原始 duration
            if (document.activeElement === row.querySelector('.duration-combined')) {
                task.duration = { days: durationDays, hours: durationHours, minutes: durationMinutes };
            }
            task.entryTimestamp = entryTimestamp;
            task.completion = completionResult.rawTime; // 儲存原始的完成時間，用於總排程排序
            
            // 如果任務名稱和時間都被清空，則從資料中移除
            if (!task.task && totalDurationInMinutes <= 0) {
                appData.accounts[accountName].tasks = appData.accounts[accountName].tasks.filter(t => t.id !== taskId);
            }

            saveData(appData);
            
            updateTaskTargetSelect(accountName, 'workerApprenticeTarget', 'home-village');
            updateTaskTargetSelect(accountName, 'labAssistantTarget', 'laboratory');
        }
    }

/**
 * 【MAJOR UPDATE】重寫時間計算邏輯，以滿足新的顯示格式需求
 */
function calculateCompletionTime(entryTimestamp, totalDurationInMinutes, totalDeductedMinutes = 0) {
    if (!entryTimestamp || totalDurationInMinutes <= 0) {
        return { time: 'N/A', deductions: 0, rawTime: 'N/A' };
    }

    const now = Date.now();
    const elapsedMinutes = (now - entryTimestamp) / (1000 * 60);
    const remainingMinutes = Math.max(0, totalDurationInMinutes - totalDeductedMinutes - elapsedMinutes);
    const effectiveDeductions = totalDeductedMinutes + elapsedMinutes;

    if (remainingMinutes <= 0) {
        return { time: '已完成', deductions: Math.round(totalDeductedMinutes), rawTime: '已完成' };
    }

    const completionDate = new Date(now + remainingMinutes * 60 * 1000);
    const today = new Date();

    const year = completionDate.getFullYear();
    const month = (completionDate.getMonth() + 1).toString().padStart(2, '0');
    const day = completionDate.getDate().toString().padStart(2, '0');
    const hours = completionDate.getHours().toString().padStart(2, '0');
    const minutes = completionDate.getMinutes().toString().padStart(2, '0');

    const rawTime = `${year}/${month}/${day} ${hours}:${minutes}`;
    let displayTime;

    // 判斷完成日期是否為今天
    const isToday = today.getFullYear() === year &&
                    today.getMonth() === completionDate.getMonth() &&
                    today.getDate() === day;

    if (isToday) {
        displayTime = `${hours}:${minutes}`; // 當天完成，只顯示時間
    } else {
        displayTime = `${month}/${day} ${hours}:${minutes}`; // 未來完成，顯示月/日 時間
    }

    return {
        time: displayTime,
        deductions: Math.round(totalDeductedMinutes),
        rawTime: rawTime // 提供給排程頁面排序用的完整時間
    };
}
    
    function updateSlider() {
        accountSlider.scrollLeft = currentAccountIndex * accountSlider.clientWidth;
        // 【移除】舊的底部帳號指示器更新
        // document.getElementById('account-indicator').textContent = `${currentAccountIndex + 1} / ${ACCOUNTS_CONFIG.length}`;
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

    // 【修改】使用事件委派監聽滑動容器中的新箭頭按鈕
    accountSlider.addEventListener('click', (e) => {
        const nextButton = e.target.closest('.next-account-arrow');
        const prevButton = e.target.closest('.prev-account-arrow');

        if (nextButton) {
            if (currentAccountIndex < ACCOUNTS_CONFIG.length - 1) {
                currentAccountIndex++;
                updateSlider();
            }
        } else if (prevButton) {
            if (currentAccountIndex > 0) {
                currentAccountIndex--;
                updateSlider();
            }
        }
    });
    
    // 【MAJOR UPDATE】更換為新的鍵盤問題解決方案
    let scrollTopBeforeFocus;

    accountsPage.addEventListener('focusin', (e) => {
        const target = e.target;
        // 當使用者點擊輸入框時
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
            const slide = target.closest('.account-page-slide');
            if (slide) {
                // 記錄下當前內容的滾動位置
                scrollTopBeforeFocus = slide.scrollTop;
            }
        }
    });

    accountsPage.addEventListener('focusout', (e) => {
        const target = e.target;
        // 當使用者結束輸入，點擊其他地方時
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
            const slide = target.closest('.account-page-slide');
            // 檢查是否有記錄過位置
            if (slide && typeof scrollTopBeforeFocus !== 'undefined') {
                // 稍微延遲後，將內容滾動回原來的位置
                setTimeout(() => {
                    slide.scrollTop = scrollTopBeforeFocus;
                    scrollTopBeforeFocus = undefined; // 清除記錄
                }, 100); 
            }
        }
    });

if (window.visualViewport) {
    let prevHeight = window.visualViewport.height;
    // 【修改】不再只選取一個 header，因為我們需要控制所有 header
    // const header = document.querySelector('.account-header'); -> 移除

    window.visualViewport.addEventListener('resize', () => {
        const vv = window.visualViewport;

        // ⬆️ 鍵盤收合後：恢復原本 scrollTop
        if (vv.height > prevHeight) {
            // 【修改】確保選擇當前活動的 slide
            const activeSlide = document.querySelector(`.account-page-slide[data-index="${currentAccountIndex}"]`);
            if (activeSlide && typeof scrollTopBeforeFocus === 'number') {
                activeSlide.scrollTop = scrollTopBeforeFocus;
            }
        }

        // 【核心修正】選取所有的 headers 並應用 transform
        const headers = document.querySelectorAll('.account-header');
        if (headers.length > 0) {
            const transformValue = `translateY(${window.visualViewport.offsetTop}px)`;
            headers.forEach(header => {
                header.style.transform = transformValue;
            });
        }

        prevHeight = vv.height;
    });
}


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

                if (!specialTask || !special.level || !specialTask.targetTaskId || !specialTask.startTime) return;

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


