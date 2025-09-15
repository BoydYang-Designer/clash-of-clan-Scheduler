/**
 * 渲染排程頁面
 * @param {Object} data - 所有帳號的資料
 * @param {Array} sectionsConfig - 區塊設定，用於查找標題
 */
function renderScheduler(data, sectionsConfig) {
    const taskListContainer = document.getElementById('task-list');
    taskListContainer.innerHTML = ''; // 清空現有列表

    // 建立一個從 section ID 到 section title 的映射表，方便查找
    const sectionTitleMap = sectionsConfig.reduce((map, section) => {
        map[section.id] = section.title;
        return map;
    }, {});

    // 1. 收集所有有效的任務並扁平化，同時帶上所需資訊
    let allTasks = [];
    Object.keys(data.accounts).forEach(accountName => {
        const account = data.accounts[accountName];
        account.tasks.forEach(task => {
            if (task.task && task.completion && task.completion !== 'N/A' && task.completion !== '已完成') {
                allTasks.push({
                    ...task,
                    accountName,
                    avatar: account.avatar, // 攜帶頭像資訊
                    sectionTitle: sectionTitleMap[task.section] || '未知區域' // 攜帶區域名稱
                });
            }
        });
    });

    // *** 新增：只顯示今天的任務 (已修正為 YYYY/MM/DD 格式) ***
    const today = new Date();
    const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    
    const todayTasks = allTasks.filter(task => {
        return task.completion.startsWith(todayStr);
    });

    // 2. *** 全新排序邏輯 ***
    // 步驟 2.1: 主要排序 - 嚴格按照完成時間由早到晚
    todayTasks.sort((a, b) => new Date(a.completion) - new Date(b.completion));

    // 步驟 2.2: 次要排序 - 處理群組邏輯
    const oneHour = 60 * 60 * 1000;
    let groupedTasks = [];
    let processedIndices = new Set();

    for (let i = 0; i < todayTasks.length; i++) {
        if (processedIndices.has(i)) {
            continue;
        }

        const currentTask = todayTasks[i];
        groupedTasks.push(currentTask);
        processedIndices.add(i);

        for (let j = i + 1; j < todayTasks.length; j++) {
            if (processedIndices.has(j)) {
                continue;
            }

            const nextTask = todayTasks[j];
            const timeDifference = new Date(nextTask.completion) - new Date(currentTask.completion);

            if (nextTask.accountName === currentTask.accountName && timeDifference <= oneHour) {
                groupedTasks.push(nextTask);
                processedIndices.add(j);
            }
        }
    }


    // 3. 顯示任務或提示訊息
    if (groupedTasks.length === 0) {
        taskListContainer.innerHTML = `<p id="no-tasks-message">今天沒有任何已排程的任務。</p>`;
        return;
    }

    groupedTasks.forEach(task => {
        const timePart = task.completion.split(' ')[1];

        const taskItem = document.createElement('div');
        taskItem.className = `task-item task-section-${task.section}`;
        taskItem.innerHTML = `
            <img src="${task.avatar}" alt="${task.accountName}" class="task-avatar">
            <div class="task-info">
                <span class="task-account-name">${task.accountName}</span>
                <span class="task-section-name">${task.sectionTitle}</span>
                <span class="task-name">${task.task}</span>
                <span class="task-completion">${timePart}</span>
            </div>
            <button class="btn-delete" data-account="${task.accountName}" data-task-id="${task.id}"></button>
        `;
        taskListContainer.appendChild(taskItem);
    });
}