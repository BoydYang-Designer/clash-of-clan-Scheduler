/**
 * 【MAJOR UPDATE】渲染總排程頁面
 * - 只顯示未來 24 小時內的任務
 * - 時間格式統一為 MM/DD HH:mm
 * @param {Object} data - 所有帳號的資料
 * @param {Array} sectionsConfig - 區塊設定，用於查找標題
 */
function renderScheduler(data, sectionsConfig) {
    const taskListContainer = document.getElementById('task-list');
    taskListContainer.innerHTML = ''; 

    const sectionTitleMap = sectionsConfig.reduce((map, section) => {
        map[section.id] = section.title;
        return map;
    }, {});

    // 1. 設定時間範圍：從現在起算的 24 小時內
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let upcomingTasks = [];
    Object.keys(data.accounts).forEach(accountName => {
        const account = data.accounts[accountName];
        account.tasks.forEach(task => {
            // 確保任務是有效的
            if (task.task && task.duration && task.entryTimestamp) {
                const originalTotalMinutes = (task.duration.days * 24 * 60) + (task.duration.hours * 60) + task.duration.minutes;
                const totalDeductedMinutes = task.totalDeductedMinutes || 0;
                
                // 使用共用的 calculateCompletionTime 函數獲取最新的完成時間 Date 物件
                const completionResult = calculateCompletionTime(task.entryTimestamp, originalTotalMinutes, totalDeductedMinutes);

                // 檢查計算出的時間是否有效，且落在我們的時間範圍內
                if (completionResult.rawTime && completionResult.rawTime !== '已完成' && completionResult.rawTime > now && completionResult.rawTime <= twentyFourHoursLater) {
                    upcomingTasks.push({
                        ...task,
                        accountName,
                        avatar: account.avatar,
                        sectionTitle: sectionTitleMap[task.section] || '未知區域',
                        completionDate: completionResult.rawTime // 儲存Date物件以供排序
                    });
                }
            }
        });
    });

    // 2. 根據完成時間由早到晚排序
    upcomingTasks.sort((a, b) => a.completionDate - b.completionDate);

    // 3. 顯示任務或提示訊息
    if (upcomingTasks.length === 0) {
        taskListContainer.innerHTML = `<p id="no-tasks-message">未來24小時內沒有任何已排程的任務。</p>`;
        return;
    }

    upcomingTasks.forEach(task => {
        // 格式化時間為 MM/DD HH:mm
        const d = task.completionDate;
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const formattedTime = `${month}/${day} ${hours}:${minutes}`;

        const taskItem = document.createElement('div');
        taskItem.className = `task-item task-section-${task.section}`;
        taskItem.innerHTML = `
            <img src="${task.avatar}" alt="${task.accountName}" class="task-avatar">
            <div class="task-info">
                <span class="task-account-name">${task.accountName}</span>
                <span class="task-section-name">${task.sectionTitle}</span>
                <span class="task-name">${task.task}</span>
                <span class="task-completion">${formattedTime}</span>
            </div>
            <button class="btn-delete" data-account="${task.accountName}" data-task-id="${task.id}"></button>
        `;
        taskListContainer.appendChild(taskItem);
    });
}