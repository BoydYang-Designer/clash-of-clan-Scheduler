/**
 * 渲染排程頁面
 * @param {Object} data - 所有帳號的資料
 */
function renderScheduler(data) {
    const taskListContainer = document.getElementById('task-list');
    taskListContainer.innerHTML = ''; // 清空現有列表

    // 1. 收集所有有效的任務並扁平化
    let allTasks = [];
    Object.keys(data.accounts).forEach(accountName => {
        data.accounts[accountName].tasks.forEach(task => {
            if (task.task && task.completion) {
                allTasks.push({
                    ...task,
                    accountName
                });
            }
        });
    });

    // 2. *** 全新排序邏輯 ***
    // 步驟 2.1: 主要排序 - 嚴格按照完成時間由早到晚
    allTasks.sort((a, b) => new Date(a.completion) - new Date(b.completion));

    // 步驟 2.2: 次要排序 - 處理群組邏輯
    // 如果同帳號的任務時間差在1小時內，則將其相鄰排列
    const oneHour = 60 * 60 * 1000; // 1小時的毫秒數
    let groupedTasks = [];
    let processedIndices = new Set(); // 追蹤已被處理過的任務索引

    for (let i = 0; i < allTasks.length; i++) {
        // 如果這個任務已經被前面的群組處理過，就跳過
        if (processedIndices.has(i)) {
            continue;
        }

        // 將當前任務作為一個新群組的開始
        const currentTask = allTasks[i];
        groupedTasks.push(currentTask);
        processedIndices.add(i);

        // 向後查找符合條件的同帳號任務
        for (let j = i + 1; j < allTasks.length; j++) {
            if (processedIndices.has(j)) {
                continue;
            }

            const nextTask = allTasks[j];
            const timeDifference = new Date(nextTask.completion) - new Date(currentTask.completion);

            // 條件：是同一個帳號 && 時間差在1小時以內
            if (nextTask.accountName === currentTask.accountName && timeDifference <= oneHour) {
                groupedTasks.push(nextTask); // 加入到群組中
                processedIndices.add(j); // 標記為已處理
            }
        }
    }


    // 3. 顯示任務或提示訊息
    if (groupedTasks.length === 0) {
        taskListContainer.innerHTML = `<p id="no-tasks-message">目前沒有任何已排程的任務。</p>`;
        return;
    }

    groupedTasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.innerHTML = `
            <div class="task-info">
                <span class="task-account-name">${task.accountName}</span>
                <span class="task-name">${task.task}</span>
                <span class="task-completion">完成於: ${task.completion}</span>
            </div>
            <button class="btn-delete" data-account="${task.accountName}" data-task-id="${task.id}">&times;</button>
        `;
        taskListContainer.appendChild(taskItem);
    });
}


/**
 * 處理刪除任務的點擊事件
 * @param {Event} e - 點擊事件
 * @param {Object} data - 全局資料
 * @param {Array} accountsConfig - 帳號設定
 */
function handleDeleteTask(e, data, accountsConfig) {
    const deleteButton = e.target.closest('.btn-delete');
    if (deleteButton) {
        const accountName = deleteButton.dataset.account;
        const taskId = deleteButton.dataset.taskId;

        const account = data.accounts[accountName];
        if (account) {
            // 找到對應任務並移除
            account.tasks = account.tasks.filter(task => task.id !== taskId);

            // 儲存並重新渲染
            saveData(data);
            renderScheduler(data);

            // 同時更新帳號頁面的視圖
            const sliderContainer = document.querySelector('.account-slider-container');
            const currentScroll = sliderContainer.scrollLeft; // 記錄當前滾動位置
            renderAccountPages(accountsConfig, data);
            sliderContainer.scrollLeft = currentScroll; // 恢復滾動位置
        }
    }
}