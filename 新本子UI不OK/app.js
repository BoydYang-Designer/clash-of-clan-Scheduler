const app = {
    // === 系統層級狀態 (System State) ===
    modules: [],               // 存放本子列表 [{id, name, created}]
    currentModuleId: null,     // 當前進入的本子 ID
    targetModuleId: null,      // 正在操作(編輯/刪除)的本子 ID

    // === 當前本子內的資料 (Module Data) ===
    data: [],                  // 當前本子的分類與商品 (相當於原本的 shopData)
    lastUpdated: null,

    // === 初始化 ===
    init: async function() {
        console.log("App Initializing...");
        
        // 1. 讀取模組列表
        const storedModules = localStorage.getItem('app_modules');
        
        if (storedModules) {
            this.modules = JSON.parse(storedModules);
        } else {
            // --- 資料遷移邏輯 (Migration) ---
            // 如果沒有模組系統，但有舊的 shopData，將其轉移
            const oldData = localStorage.getItem('shopData');
            if (oldData) {
                console.log("發現舊資料，正在遷移...");
                const newId = 'module_' + Date.now();
                
                // 建立第一個本子
                this.modules = [{
                    id: newId,
                    name: '我的賣場 (舊資料)',
                    created: Date.now()
                }];
                
                // 儲存模組列表
                localStorage.setItem('app_modules', JSON.stringify(this.modules));
                
                // 將舊資料搬移到新 Key
                localStorage.setItem(`data_${newId}`, oldData);
                
                const oldTime = localStorage.getItem('shopLastUpdated');
                if (oldTime) localStorage.setItem(`time_${newId}`, oldTime);
                
                // 可選擇刪除舊 shopData，這邊先保留以防萬一
            } else {
                this.modules = [];
            }
        }

        // 2. 初始畫面渲染：儀表板
        this.renderDashboard();
        
        // 3. 設定監聽器
        this.setupEventListeners();
    },

    setupEventListeners: function() {
        // 點擊 Action Sheet 灰色背景關閉
        const sheet = document.getElementById('module-action-sheet');
        if(sheet) {
            sheet.addEventListener('click', (e) => {
                if(e.target === sheet) this.closeModuleActionSheet();
            });
        }
        
        // 模組內搜尋
        const searchInput = document.getElementById('global-search-input');
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                // 這裡可以實作簡單的過濾邏輯
                // 簡單範例：這裡不實作完整搜尋，僅保留擴充空間
                // 如果需要搜尋，可過濾 this.data 並重新 renderHome
            });
        }
    },

    // ==========================================
    // Level 1: 儀表板邏輯 (Dashboard)
    // ==========================================

    renderDashboard: function() {
        const dashboardView = document.getElementById('dashboard-view');
        const moduleView = document.getElementById('module-view');
        const listContainer = document.getElementById('modules-list');
        const emptyState = document.getElementById('dashboard-empty-state');
        
        // 切換 UI
        dashboardView.classList.remove('hidden');
        moduleView.classList.add('hidden');
        
        // 設定 Header
        document.getElementById('page-title').innerText = "我的本子";
        document.getElementById('back-btn').classList.add('hidden');   // 儀表板沒有返回
        document.getElementById('action-btn').classList.add('hidden'); // 儀表板暫無全域設定
        
        listContainer.innerHTML = '';

        if (this.modules.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            
            // 渲染每一個本子卡片
            this.modules.forEach(mod => {
                // 偷看該本子有多少分類 (只讀取字串長度概算，或是 parse 讀取)
                const count = this.getModuleCategoryCount(mod.id);

                const card = document.createElement('div');
                card.className = 'module-card';
                
                // 點擊卡片進入 (避開右上角選單按鈕)
                card.onclick = (e) => {
                    if(!e.target.closest('.module-menu-btn')) {
                        this.enterModule(mod.id);
                    }
                };

                card.innerHTML = `
                    <div class="module-card-icon">📒</div>
                    <div class="module-info">
                        <h3>${mod.name}</h3>
                        <p>${count} 個分類</p>
                    </div>
                    <button class="module-menu-btn" onclick="app.showModuleActionSheet('${mod.id}', event)">
                        ●●●
                    </button>
                `;
                listContainer.appendChild(card);
            });
        }
    },

    // 輔助：計算本子內的分類數量
    getModuleCategoryCount: function(moduleId) {
        try {
            const raw = localStorage.getItem(`data_${moduleId}`);
            if(!raw) return 0;
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.length : 0;
        } catch(e) { return 0; }
    },

    // ==========================================
    // Level 1 -> Level 2: 進入本子
    // ==========================================

    enterModule: function(moduleId) {
        const targetModule = this.modules.find(m => m.id === moduleId);
        if (!targetModule) return;

        this.currentModuleId = moduleId;
        
        // 讀取該本子的專屬資料
        const modData = localStorage.getItem(`data_${moduleId}`);
        const modTime = localStorage.getItem(`time_${moduleId}`);
        
        this.data = modData ? JSON.parse(modData) : [];
        this.lastUpdated = modTime ? parseInt(modTime) : null;

        // 切換 UI
        document.getElementById('dashboard-view').classList.add('hidden');
        document.getElementById('module-view').classList.remove('hidden');
        
        // 設定 Header
        document.getElementById('page-title').innerText = targetModule.name;
        
        // 顯示返回鈕與設定鈕
        const backBtn = document.getElementById('back-btn');
        backBtn.classList.remove('hidden');
        backBtn.onclick = () => this.backToDashboard();
        
        const actionBtn = document.getElementById('action-btn');
        actionBtn.classList.remove('hidden');
        // actionBtn 可以綁定匯出/匯入選單，此處省略

        // 渲染本子內容
        this.renderHome();
    },

    backToDashboard: function() {
        // 清空當前資料以防混淆
        this.currentModuleId = null;
        this.data = [];
        this.renderDashboard();
    },

    // ==========================================
    // 本子管理 (CRUD)
    // ==========================================

    // 1. 顯示新增視窗
    showAddModuleModal: function() {
        document.getElementById('module-modal').classList.remove('hidden');
        document.getElementById('module-modal-title').innerText = "建立新本子";
        const input = document.getElementById('module-name-input');
        input.value = "";
        input.focus();
        this.targetModuleId = null; // null 代表新增模式
    },

    closeModuleModal: function() {
        document.getElementById('module-modal').classList.add('hidden');
    },

    // 2. 確認新增或重新命名
    confirmModule: function() {
        const nameInput = document.getElementById('module-name-input');
        const name = nameInput.value.trim();
        
        if (!name) return alert('請輸入本子名稱');

        if (this.targetModuleId) {
            // 編輯模式
            const mod = this.modules.find(m => m.id === this.targetModuleId);
            if(mod) {
                mod.name = name;
                this.saveModules();
            }
        } else {
            // 新增模式
            const newId = 'module_' + Date.now();
            this.modules.push({
                id: newId,
                name: name,
                created: Date.now()
            });
            // 初始化該本子的空資料
            localStorage.setItem(`data_${newId}`, '[]');
            this.saveModules();
        }

        this.closeModuleModal();
        this.renderDashboard();
    },

    // 3. 顯示操作選單
    showModuleActionSheet: function(id, event) {
        if(event) event.stopPropagation();
        this.targetModuleId = id;
        document.getElementById('module-action-sheet').classList.remove('hidden');
    },

    closeModuleActionSheet: function() {
        document.getElementById('module-action-sheet').classList.add('hidden');
    },

    renameCurrentTargetModule: function() {
        this.closeModuleActionSheet();
        const mod = this.modules.find(m => m.id === this.targetModuleId);
        if(!mod) return;
        
        document.getElementById('module-modal').classList.remove('hidden');
        document.getElementById('module-modal-title').innerText = "重新命名";
        document.getElementById('module-name-input').value = mod.name;
    },

    deleteCurrentTargetModule: function() {
        const mod = this.modules.find(m => m.id === this.targetModuleId);
        if(!mod) return;
        
        if(confirm(`確定要刪除「${mod.name}」嗎？\n資料將無法復原！`)) {
            // 刪除列表中的紀錄
            this.modules = this.modules.filter(m => m.id !== this.targetModuleId);
            this.saveModules();
            
            // 刪除實際資料
            localStorage.removeItem(`data_${this.targetModuleId}`);
            localStorage.removeItem(`time_${this.targetModuleId}`);
            
            this.closeModuleActionSheet();
            this.renderDashboard();
        }
    },

    saveModules: function() {
        localStorage.setItem('app_modules', JSON.stringify(this.modules));
    },

    // ==========================================
    // 核心資料儲存 (適配多本子)
    // ==========================================
    
    save: function(updateTimestamp = true) {
        if (!this.currentModuleId) return; // 安全檢查

        if (updateTimestamp) {
            this.lastUpdated = Date.now();
        }
        
        // 儲存到對應的 Key，而不是全域 shopData
        localStorage.setItem(`data_${this.currentModuleId}`, JSON.stringify(this.data));
        
        if (this.lastUpdated) {
            localStorage.setItem(`time_${this.currentModuleId}`, this.lastUpdated.toString());
        }
    },

    // ==========================================
    // Level 2: 內容渲染 (Render Home)
    // ==========================================

    renderHome: function() {
        const container = document.getElementById('category-container');
        if(!container) return;
        
        container.innerHTML = '';
        
        if (this.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size:3rem">📝</div>
                    <p>這裡空空的<br>點擊右下角按鈕新增分類</p>
                </div>
            `;
            return;
        }

        // 遍歷分類並顯示
        this.data.forEach((cat, index) => {
            const catDiv = document.createElement('div');
            catDiv.className = 'category-card';
            
            // 分類標題區塊
            const header = document.createElement('div');
            header.className = 'category-header';
            header.style.backgroundColor = cat.color || '#333';
            header.innerHTML = `
                <span>${cat.name}</span>
                <span style="font-size:0.8rem; opacity:0.8">${cat.items ? cat.items.length : 0} 筆</span>
            `;
            
            // 點擊標題可以編輯分類或收合 (依您需求，這裡設為進入分類編輯)
            header.onclick = () => {
                // 如果您有 editCategory 功能可放在這
                // app.editCategory(index); 
            };

            catDiv.appendChild(header);

            // 商品列表區塊
            const listDiv = document.createElement('div');
            
            // 簡單顯示前 5 筆或全部
            if (cat.items && cat.items.length > 0) {
                cat.items.forEach((item, itemIndex) => {
                    const row = document.createElement('div');
                    row.className = 'item-row';
                    // 顯示品名與價格
                    const price = item['價格'] ? `$${item['價格']}` : '';
                    row.innerHTML = `
                        <div style="font-weight:500">${item['品名'] || '未命名'}</div>
                        <div style="color:#666">${price}</div>
                    `;
                    // 點擊編輯商品 (需搭配原有的 editItem 邏輯)
                    row.onclick = () => {
                        if(typeof app.openEditor === 'function') {
                            app.openEditor(index, itemIndex);
                        } else {
                            alert("編輯功能請搭配原有的 modal 邏輯");
                        }
                    };
                    listDiv.appendChild(row);
                });
            } else {
                listDiv.innerHTML = `<div style="padding:16px; text-align:center; color:#ddd;">無商品</div>`;
            }

            catDiv.appendChild(listDiv);
            container.appendChild(catDiv);
        });
    },

    // ==========================================
    // 匯出功能 (修正為依本子命名)
    // ==========================================
    
    exportData: function() {
        if (!this.currentModuleId) return alert("請先進入本子");
        
        const currentModule = this.modules.find(m => m.id === this.currentModuleId);
        const fileName = `${currentModule.name}.json`; 

        const exportObj = {
            timestamp: this.lastUpdated || Date.now(),
            data: this.data
        };

        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    },

    // 匯入功能 (略，與原本邏輯相似，但記得更新 this.data 並 save())
    openAddCategoryModal: function() {
        // 呼叫原本的新增分類 Modal 邏輯
        // 需確保 Modal HTML 存在於 index.html
        const modal = document.getElementById('add-category-modal');
        if(modal) modal.classList.remove('hidden');
    }
    
    // 注意：您原有的 openEditor, deleteItem, saveItem 等詳細操作函式
    // 請保留在物件中，確保它們操作的是 `this.data` 即可。
};

// 啟動 App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});