const app = {
    data: [],
    currentCategoryIndex: null,
    editingItemIndex: null,
    sortOrder: 'date_desc', // 預設排序：日期新到舊

    init: async function() {
        const storedData = localStorage.getItem('shopData');
        if (storedData) {
            this.data = JSON.parse(storedData);
        } else {
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
                this.renderCategoryList(this.currentCategoryIndex);
            } else if (this.currentCategoryIndex !== null) {
                this.renderHome();
            }
        });
        document.getElementById('action-btn').addEventListener('click', () => {
             this.toggleSettings();
        });
        document.getElementById('add-item-btn').addEventListener('click', () => {
            this.renderEditForm(null); 
        });
    },

    // --- 欄位管理功能 ---

    addNewField: function() {
        const catIndex = this.currentCategoryIndex;
        if (catIndex === null) return;

        const newFieldName = prompt("請輸入新欄位的名稱 (例如: 保存期限, 數量, 評分):");
        if (newFieldName) {
            if (this.data[catIndex].fields.includes(newFieldName)) {
                alert("這個欄位已經存在囉！");
                return;
            }
            // 為了美觀，將新欄位加在最後面
            this.data[catIndex].fields.push(newFieldName);
            this.save();
            this.renderEditForm(this.editingItemIndex);
        }
    },

    // 修改：刪除指定欄位
    removeSpecificField: function() {
        const catIndex = this.currentCategoryIndex;
        if (catIndex === null) return;
        const fields = this.data[catIndex].fields;

        // 產生列表供使用者選擇
        let msg = "請輸入要刪除的欄位「編號」：\n";
        fields.forEach((f, i) => {
            msg += `${i + 1}. ${f}\n`;
        });

        const input = prompt(msg);
        const indexToDelete = parseInt(input) - 1;

        if (!isNaN(indexToDelete) && indexToDelete >= 0 && indexToDelete < fields.length) {
            const fieldName = fields[indexToDelete];
            
            // 防呆：避免刪除核心識別欄位
            if (fieldName.includes('品') || fieldName.includes('名') || fieldName.includes('金額') || fieldName.includes('價格')) {
                if(!confirm(`「${fieldName}」看起來是很重要的欄位，刪除後既有資料會消失，確定要刪除嗎？`)) {
                    return;
                }
            } else {
                if (!confirm(`確定要刪除「${fieldName}」欄位嗎？`)) {
                    return;
                }
            }

            // 執行刪除
            fields.splice(indexToDelete, 1);
            
            // 選擇性：清理所有商品中該欄位的資料 (雖不清理也不會報錯，但清理比較乾淨)
            this.data[catIndex].items.forEach(item => {
                delete item[fieldName];
            });

            this.save();
            this.renderEditForm(this.editingItemIndex);
        } else if (input !== null) {
            alert("輸入的編號無效");
        }
    },

    // --- 輔助功能：找出關鍵欄位 ---
    identifyFields: function(category) {
        const f = category.fields;
        return {
            title: f.find(k => ['品名', '品項', '產品名稱', '博物館', '名稱'].some(t => k.includes(t))) || f[0],
            price: f.find(k => ['金額', '價格', '費用'].some(t => k.includes(t))),
            date: f.find(k => ['日期', '時間'].some(t => k.includes(t)))
        };
    },

    // --- 視圖渲染 ---

    renderHome: function() {
        const container = document.getElementById('app-container');
        const headerTitle = document.getElementById('page-title');
        const backBtn = document.getElementById('back-btn');
        const fab = document.getElementById('floating-action');

        container.innerHTML = ''; 
        headerTitle.innerText = '我的賣場';
        backBtn.classList.add('hidden');
        fab.classList.add('hidden');
        
        this.currentCategoryIndex = null;
        this.editingItemIndex = null;

        const grid = document.createElement('div');
        grid.className = 'category-grid';

        this.data.forEach((cat, index) => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.style.borderTop = `5px solid ${cat.color}`;
            card.innerHTML = `
                <div class="cat-name">${cat.name}</div>
                <div class="cat-count">${cat.items.length} 筆紀錄</div>
            `;
            card.oncontextmenu = (e) => {
                e.preventDefault();
                if(confirm(`確定要刪除整個「${cat.name}」賣場嗎？`)) {
                    this.deleteCategory(index);
                }
            };
            card.onclick = () => this.renderCategoryList(index);
            grid.appendChild(card);
        });

        // 新增賣場按鈕
        const addCard = document.createElement('div');
        addCard.className = 'category-card add-new-card';
        addCard.innerHTML = `<div class="cat-name" style="font-size: 2rem; color: #888;">+</div><div class="cat-count">新增賣場</div>`;
        addCard.onclick = () => {
            document.getElementById('settings-modal').classList.remove('hidden');
            setTimeout(() => document.getElementById('new-cat-name').focus(), 100);
        };
        grid.appendChild(addCard);
        container.appendChild(grid);
    },

    renderCategoryList: function(index) {
        this.currentCategoryIndex = index;
        this.editingItemIndex = null;
        const category = this.data[index];
        const container = document.getElementById('app-container');
        document.getElementById('page-title').innerText = category.name;
        document.getElementById('back-btn').classList.remove('hidden');
        document.getElementById('floating-action').classList.remove('hidden');

        // 1. 識別欄位
        const keys = this.identifyFields(category);
        
        if (category.items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">尚無紀錄<br>點擊右下角新增</div>';
            return;
        }

        // 2. 處理排序邏輯
        let sortedItems = [...category.items]; // 複製一份陣列以免改動原始順序
        // 為了顯示正確索引，我們需要保留原始 index，這裡將物件包裝一下
        sortedItems = sortedItems.map((item, originalIdx) => ({...item, _originalIdx: originalIdx}));

        switch(this.sortOrder) {
            case 'date_desc': // 日期 新 -> 舊
                if(keys.date) sortedItems.sort((a, b) => new Date(b[keys.date]) - new Date(a[keys.date]));
                break;
            case 'date_asc': // 日期 舊 -> 新
                if(keys.date) sortedItems.sort((a, b) => new Date(a[keys.date]) - new Date(b[keys.date]));
                break;
            case 'price_desc': // 價格 高 -> 低
                if(keys.price) sortedItems.sort((a, b) => (b[keys.price] || 0) - (a[keys.price] || 0));
                break;
            case 'price_asc': // 價格 低 -> 高
                if(keys.price) sortedItems.sort((a, b) => (a[keys.price] || 0) - (b[keys.price] || 0));
                break;
            case 'name_asc': // 品名 筆畫
                 sortedItems.sort((a, b) => (a[keys.title] || '').localeCompare(b[keys.title] || '', 'zh-Hant'));
                break;
            default: // 預設 (依照建立順序反向，即最新的在最上面)
                sortedItems.sort((a, b) => b._originalIdx - a._originalIdx);
        }

        // 3. 建立控制列 (排序選單)
        let html = `
            <div style="padding: 10px 16px; display:flex; justify-content: flex-end; align-items: center; background: #fff; margin-bottom: 10px; border-bottom: 1px solid #eee;">
                <label style="font-size: 0.9rem; margin-right: 8px; color: #666;">排序：</label>
                <select id="sort-select" onchange="app.changeSort(this.value)" style="padding: 5px; border-radius: 5px; border: 1px solid #ccc;">
                    <option value="date_desc" ${this.sortOrder === 'date_desc' ? 'selected' : ''}>日期 (新→舊)</option>
                    <option value="date_asc" ${this.sortOrder === 'date_asc' ? 'selected' : ''}>日期 (舊→新)</option>
                    <option value="price_desc" ${this.sortOrder === 'price_desc' ? 'selected' : ''}>金額 (高→低)</option>
                    <option value="price_asc" ${this.sortOrder === 'price_asc' ? 'selected' : ''}>金額 (低→高)</option>
                    <option value="name_asc" ${this.sortOrder === 'name_asc' ? 'selected' : ''}>品名 (A→Z)</option>
                </select>
            </div>
            <div class="item-list">`;

        // 4. 渲染列表
        sortedItems.forEach((item) => {
            const originalIndex = item._originalIdx;
            
            // 自動抓圖邏輯：使用 品名.jpg，失敗則嘗試 png，再失敗則隱藏
            const itemTitle = item[keys.title] || '未命名商品';
            const imgPath = `./images/${itemTitle}.jpg`; 
            // 這裡使用了 onerror 小技巧：如果 jpg 載入失敗，嘗試載入 png。如果 png 也失敗，隱藏圖片。
            const imgErrorScript = `if(this.src.endsWith('.jpg')){ this.src='./images/${itemTitle}.png'; } else { this.style.display='none'; }`;

            const priceDisplay = keys.price && item[keys.price] ? `$${item[keys.price]}` : '';

            let details = [];
            category.fields.forEach(key => {
                // 排除標題、價格、和已廢棄的圖片欄位顯示在副標題中
                if(key !== keys.title && key !== keys.price && key !== '圖片檔名' && item[key] && item[key] !== 'x') {
                    details.push(`${key}: ${item[key]}`);
                }
            });

            html += `
                <div class="item-card" onclick="app.renderEditForm(${originalIndex})">
                    <img src="${imgPath}" class="item-img has-img" onerror="${imgErrorScript}" style="display:block; min-height: 0;">
                    <div class="item-content">
                        <div class="item-title">${itemTitle}</div>
                        <div class="item-details">${details.slice(0, 3).join(' | ')}</div>
                        <div class="item-price">${priceDisplay}</div>
                    </div>
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
        
        // 修正：如果圖片真的因為 onerror 被隱藏，要確保 layout 不會怪怪的
        // (上面的 onerror 已經處理了 display:none)
    },

    changeSort: function(val) {
        this.sortOrder = val;
        this.renderCategoryList(this.currentCategoryIndex);
    },

    renderEditForm: function(itemIndex) {
        this.editingItemIndex = itemIndex;
        const category = this.data[this.currentCategoryIndex];
        const isNew = itemIndex === null;
        const item = isNew ? {} : category.items[itemIndex];
        const container = document.getElementById('app-container');
        
        document.getElementById('page-title').innerText = isNew ? "新增商品" : "編輯商品";
        document.getElementById('floating-action').classList.add('hidden');

        let html = '<div class="form-container" style="padding:15px;"><form id="item-form">';
        
        // 自動產生欄位輸入框
        category.fields.forEach(field => {
            // 跳過舊的「圖片檔名」欄位，因為現在自動抓取
            if(field === '圖片檔名') return;

            let value = item[field] || '';
            let type = (field.includes('日期')) ? 'date' : (field.includes('金額') || field.includes('價格')) ? 'number' : 'text';
            html += `
                <div class="form-group" style="margin-bottom:12px;">
                    <label style="display:block; font-size:0.9rem; color:#666;">${field}</label>
                    <input type="${type}" name="${field}" value="${value}" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                </div>`;
        });

        // 提示圖片說明
        html += `<p style="font-size:0.8rem; color:#999; margin-top:-5px; margin-bottom:20px;">
            ℹ️ 圖片將自動讀取 <code>images/${category.fields.find(f=>f.includes('品名')||f.includes('品項')) || '品名'}.jpg</code>
        </p>`;

        // 管理欄位按鈕區塊
        html += `
            <div style="display:flex; gap:15px; margin:10px 0 20px 0; padding:10px 0; border-top:1px dashed #eee;">
                <span onclick="app.addNewField()" style="color:#007aff; cursor:pointer; font-size:0.9rem;">➕ 新增欄位</span>
                <span onclick="app.removeSpecificField()" style="color:#ff3b30; cursor:pointer; font-size:0.9rem;">➖ 刪除指定欄位</span>
            </div>`;

        html += `<button type="button" class="btn-field" onclick="app.saveItem()" style="width:100%; border:none; color:white; padding:12px; border-radius:8px;">${isNew ? '確認新增' : '更新資料'}</button>`;
        
        if (!isNew) {
            html += `<button type="button" class="btn-delete" onclick="app.deleteItem(${itemIndex})" style="width:100%; margin-top:10px; border:none; color:white; padding:12px; border-radius:8px;">刪除商品</button>`;
        }
        
        html += '</form></div>';
        container.innerHTML = html;
    },

    saveItem: function() {
        const form = document.getElementById('item-form');
        const formData = new FormData(form);
        const newItem = {};
        
        formData.forEach((value, key) => {
            newItem[key] = value;
        });

        const category = this.data[this.currentCategoryIndex];
        if (this.editingItemIndex !== null) {
            // 保留原本物件的其他屬性 (例如可能存在的隱藏欄位)
            category.items[this.editingItemIndex] = { ...category.items[this.editingItemIndex], ...newItem };
        } else {
            category.items.push(newItem);
        }

        this.save();
        this.renderCategoryList(this.currentCategoryIndex);
    },

    deleteItem: function(index) {
        if (confirm('確定要刪除這筆紀錄嗎？')) {
            this.data[this.currentCategoryIndex].items.splice(index, 1);
            this.save();
            this.renderCategoryList(this.currentCategoryIndex);
        }
    },

    // --- 其他管理功能 ---
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
            } catch (err) { alert("檔案格式錯誤"); }
        };
        reader.readAsText(file);
    },
    
    resetData: function() {
        if(confirm("警告：這將清空所有資料！")) {
            localStorage.removeItem('shopData');
            location.reload();
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
                fields: ['品名', '價格', '購買日期', '備註'],
                items: []
            });
            this.save();
            this.toggleSettings();
            this.renderHome();
        }
    },

    deleteCategory: function(index) {
        this.data.splice(index, 1);
        this.save();
        this.renderHome();
    }
};

app.init();