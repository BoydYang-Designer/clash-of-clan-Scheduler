const app = {
    data: [],
    currentCategoryIndex: null,
    editingItemIndex: null,

    init: async function() {
        // 1. 嘗試從 localStorage 讀取
        const storedData = localStorage.getItem('shopData');
        
        if (storedData) {
            this.data = JSON.parse(storedData);
        } else {
            // 2. 如果沒有，讀取 data.json
            try {
                const response = await fetch('data.json');
                this.data = await response.json();
                this.save();
            } catch (e) {
                console.error("無法讀取 data.json", e);
                this.data = [];
            }
        }
        
        this.renderHome();
        this.setupEventListeners();
    },

    save: function() {
        localStorage.setItem('shopData', JSON.stringify(this.data));
    },

    setupEventListeners: function() {
        document.getElementById('back-btn').addEventListener('click', () => {
            if (this.editingItemIndex !== null) {
                // 如果在編輯模式，返回列表
                this.renderCategoryList(this.currentCategoryIndex);
            } else if (this.currentCategoryIndex !== null) {
                // 如果在列表模式，返回首頁
                this.renderHome();
            }
        });

        document.getElementById('action-btn').addEventListener('click', () => {
             this.toggleSettings();
        });

        document.getElementById('add-item-btn').addEventListener('click', () => {
            this.renderEditForm(null); // Create new item
        });
    },

    // --- 視圖渲染 ---

    renderHome: function() {
        this.currentCategoryIndex = null;
        this.editingItemIndex = null;
        
        const container = document.getElementById('app-container');
        document.getElementById('page-title').innerText = "我的賣場";
        document.getElementById('back-btn').classList.add('hidden');
        document.getElementById('floating-action').classList.add('hidden');

        let html = '<div class="category-grid">';
        this.data.forEach((cat, index) => {
            html += `
                <div class="cat-card" style="--theme-color: ${cat.color}" onclick="app.renderCategoryList(${index})">
                    <div class="cat-name" style="color:${cat.color}">${cat.name}</div>
                    <div class="cat-count">${cat.items.length} 筆紀錄</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    renderCategoryList: function(index) {
        this.currentCategoryIndex = index;
        this.editingItemIndex = null;
        const category = this.data[index];

        const container = document.getElementById('app-container');
        document.getElementById('page-title').innerText = category.name;
        document.getElementById('back-btn').classList.remove('hidden');
        document.getElementById('floating-action').classList.remove('hidden');

        // 識別此分類的主要顯示欄位 (通常是品名和價格)
        // 簡單邏輯：找包含 "品名" 或 "品項" 的欄位，與包含 "金額" 或 "價格" 的欄位
        const titleField = category.fields.find(f => f.includes('品名') || f.includes('品項')) || category.fields[0];
        const priceField = category.fields.find(f => f.includes('金額') || f.includes('價格') || f.includes('費用'));
        
        if (category.items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">尚無紀錄<br>點擊右下角新增</div>';
            return;
        }

        let html = '<div class="item-list">';
        // 反轉陣列讓最新的顯示在上面
        category.items.slice().reverse().forEach((item, rIndex) => {
            // 計算原始 index
            const originalIndex = category.items.length - 1 - rIndex; 
            
            const imgSrc = item['圖片檔名'] ? `./images/${item['圖片檔名']}` : '';
            const imgClass = imgSrc ? 'has-img' : '';
            const priceDisplay = priceField && item[priceField] ? `$${item[priceField]}` : '';
            const titleDisplay = item[titleField] || '未命名商品';

            // 抓取其他資訊 (排除已顯示的標題、價格、圖片)
            let details = [];
            category.fields.forEach(key => {
                if(key !== titleField && key !== priceField && key !== '圖片檔名' && item[key] && item[key] !== 'x') {
                    details.push(`${key}: ${item[key]}`);
                }
            });

            html += `
                <div class="item-card" onclick="app.renderEditForm(${originalIndex})">
                    <img src="${imgSrc}" class="item-img ${imgClass}" onerror="this.style.display='none'">
                    <div class="item-content">
                        <div class="item-title">${titleDisplay}</div>
                        <div class="item-details">${details.slice(0, 3).join(' | ')}...</div>
                        <div class="item-price">${priceDisplay}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        // 在列表底部加入「編輯欄位結構」按鈕
        html += `
            <div style="padding: 20px; text-align: center;">
                <button onclick="app.renderSchemaEditor()" style="background:none; border:1px solid #ccc; padding:8px 16px; border-radius:20px; color:#666;">編輯此分類欄位</button>
            </div>
        `;

        container.innerHTML = html;
    },

    renderEditForm: function(itemIndex) {
        this.editingItemIndex = itemIndex;
        const category = this.data[this.currentCategoryIndex];
        const isNew = itemIndex === null;
        const item = isNew ? {} : category.items[itemIndex];

        const container = document.getElementById('app-container');
        document.getElementById('page-title').innerText = isNew ? "新增紀錄" : "編輯紀錄";
        document.getElementById('floating-action').classList.add('hidden');

        let html = '<div class="form-container"><form id="item-form">';
        
        category.fields.forEach(field => {
            let value = item[field] || '';
            let type = 'text';
            if (field.includes('日期')) type = 'date';
            if (field.includes('金額') || field.includes('價格')) type = 'number';

            html += `
                <div class="form-group">
                    <label>${field}</label>
                    <input type="${type}" name="${field}" value="${value}" placeholder="輸入${field}...">
                </div>
            `;
        });

        html += `<button type="button" class="btn-primary" onclick="app.saveItem()">${isNew ? '新增' : '儲存'}</button>`;
        
        if (!isNew) {
            html += `<button type="button" class="btn-primary btn-delete" onclick="app.deleteItem(${itemIndex})">刪除此紀錄</button>`;
        }
        
        html += '</form></div>';
        container.innerHTML = html;
    },

    renderSchemaEditor: function() {
        const category = this.data[this.currentCategoryIndex];
        const container = document.getElementById('app-container');
        document.getElementById('page-title').innerText = `編輯欄位 (${category.name})`;
        document.getElementById('floating-action').classList.add('hidden');

        let html = `<div class="form-container">
            <p>管理此分類的資料欄位。新增後，所有舊資料也會擁有此欄位。</p>
            <div id="field-list">`;
        
        category.fields.forEach((field, idx) => {
            html += `<span class="tag">${field} <a href="#" onclick="app.removeField(${idx})" style="color:red; text-decoration:none;">×</a></span>`;
        });

        html += `</div>
            <div class="schema-editor">
                <div class="form-group">
                    <label>新增欄位名稱</label>
                    <input type="text" id="new-field-name" placeholder="例如：回購率">
                </div>
                <button class="btn-primary btn-field" onclick="app.addField()">新增欄位</button>
            </div>
        </div>`;
        container.innerHTML = html;
    },

    // --- 資料操作 (Logic) ---

    saveItem: function() {
        const form = document.getElementById('item-form');
        const formData = new FormData(form);
        const newItem = {};
        
        this.data[this.currentCategoryIndex].fields.forEach(field => {
            newItem[field] = formData.get(field);
        });

        if (this.editingItemIndex === null) {
            this.data[this.currentCategoryIndex].items.push(newItem);
        } else {
            this.data[this.currentCategoryIndex].items[this.editingItemIndex] = newItem;
        }

        this.save();
        this.renderCategoryList(this.currentCategoryIndex);
    },

    deleteItem: function(index) {
        if(confirm("確定要刪除這筆紀錄嗎？")) {
            this.data[this.currentCategoryIndex].items.splice(index, 1);
            this.save();
            this.renderCategoryList(this.currentCategoryIndex);
        }
    },

    // --- Schema 操作 ---
    
    addField: function() {
        const name = document.getElementById('new-field-name').value.trim();
        if(name && !this.data[this.currentCategoryIndex].fields.includes(name)) {
            this.data[this.currentCategoryIndex].fields.push(name);
            this.save();
            this.renderSchemaEditor();
        }
    },

    removeField: function(index) {
        if(confirm("確定移除此欄位？這不會刪除資料中的值，但之後輸入會看不到此欄位。")) {
            this.data[this.currentCategoryIndex].fields.splice(index, 1);
            this.save();
            this.renderSchemaEditor();
        }
    },

    addNewCategory: function() {
        const name = document.getElementById('new-cat-name').value;
        const color = document.getElementById('new-cat-color').value;
        if(name) {
            this.data.push({
                id: Date.now().toString(),
                name: name,
                color: color,
                fields: ["品名", "價格", "購買日期", "圖片檔名"], // 預設欄位
                items: []
            });
            this.save();
            this.toggleSettings();
            this.renderHome();
        }
    },

    // --- 系統設定 ---

    toggleSettings: function() {
        document.getElementById('settings-modal').classList.toggle('hidden');
    },

    exportData: function() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "shopping_backup_" + new Date().toISOString().slice(0,10) + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    importData: function(input) {
        const file = input.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if(confirm("這將會覆蓋目前的資料，確定嗎？")) {
                    this.data = json;
                    this.save();
                    this.toggleSettings();
                    this.renderHome();
                }
            } catch (err) {
                alert("檔案格式錯誤");
            }
        };
        reader.readAsText(file);
    },
    
    resetData: function() {
        if(confirm("警告：這將清空所有資料！")) {
            localStorage.removeItem('shopData');
            location.reload();
        }
    }
};

// 啟動 App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});