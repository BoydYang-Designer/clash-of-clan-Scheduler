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

        const keys = this.identifyFields(category);
        
        if (category.items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">尚無紀錄<br>點擊右下角新增</div>';
            return;
        }

        // --- 排序邏輯 (保持原本設定) ---
        let sortedItems = [...category.items];
        sortedItems = sortedItems.map((item, originalIdx) => ({...item, _originalIdx: originalIdx}));
        // (這裡省略您的排序 switch case 程式碼，請保留原本的 switch) 
        // 為了完整性，若您直接複製貼上，請把原本 switch 區塊貼回這裡
        // ... (您的 switch 排序代碼) ...
        switch(this.sortOrder) {
            case 'date_desc': if(keys.date) sortedItems.sort((a, b) => new Date(b[keys.date]) - new Date(a[keys.date])); break;
            case 'date_asc': if(keys.date) sortedItems.sort((a, b) => new Date(a[keys.date]) - new Date(b[keys.date])); break;
            case 'price_desc': if(keys.price) sortedItems.sort((a, b) => (b[keys.price] || 0) - (a[keys.price] || 0)); break;
            case 'price_asc': if(keys.price) sortedItems.sort((a, b) => (a[keys.price] || 0) - (b[keys.price] || 0)); break;
            case 'name_asc': sortedItems.sort((a, b) => (a[keys.title] || '').localeCompare(b[keys.title] || '', 'zh-Hant')); break;
            default: sortedItems.sort((a, b) => b._originalIdx - a._originalIdx);
        }
        // -----------------------------

        // 排序選單 HTML (保持不變)
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

        sortedItems.forEach((item) => {
            const originalIndex = item._originalIdx;
            const itemTitle = item[keys.title] || '未命名商品';
            const priceDisplay = keys.price && item[keys.price] ? `$${item[keys.price]}` : '';
            
            // --- 圖片邏輯優化 ---
            // 1. 預設先找 jpg
            // 2. 失敗找 png (onerror)
            // 3. 再失敗顯示預設圖 (placeholder)
            const imgPath = `./images/${itemTitle}.jpg`;
            // 使用一個透明的 1x1 像素圖片或是購物籃圖示作為最終 fallback
            const fallbackImg = 'https://cdn-icons-png.flaticon.com/512/263/263142.png'; // 或是您本地的 icon
            
            const imgErrorScript = `
                if(this.src.endsWith('.jpg')){ 
                    this.src='./images/${itemTitle}.png'; 
                } else { 
                    this.src='${fallbackImg}'; 
                    this.style.opacity='0.3'; // 預設圖稍微淡一點
                }
            `;

            let details = [];
            category.fields.forEach(key => {
                if(key !== keys.title && key !== keys.price && key !== '圖片檔名' && item[key] && item[key] !== 'x') {
                    details.push(`${key}: ${item[key]}`);
                }
            });

            html += `
                <div class="item-card" onclick="app.renderEditForm(${originalIndex})">
                    <img src="${imgPath}" class="item-img" 
                         onerror="${imgErrorScript}" 
                         onclick="app.showImage(event, this.src)">
                    
                    <div class="item-content">
                        <div class="item-title">${itemTitle}</div>
                        <div class="item-details">${details.slice(0, 3).join(' | ')}</div>
                        <div class="item-price">${priceDisplay}</div>
                    </div>
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    renderEditForm: function(itemIndex) {
        this.editingItemIndex = itemIndex;
        const category = this.data[this.currentCategoryIndex];
        const isNew = itemIndex === null;
        const item = isNew ? {} : category.items[itemIndex];
        const container = document.getElementById('app-container');
        
        // 抓取品名以顯示圖片
        const keys = this.identifyFields(category);
        const itemTitle = item[keys.title] || '';
        
        document.getElementById('page-title').innerText = isNew ? "新增商品" : "編輯商品";
        document.getElementById('floating-action').classList.add('hidden');

        let html = '<div class="form-container" style="padding:15px;"><form id="item-form">';
        
        // --- 在編輯頁面頂端加入圖片預覽 ---
        if (!isNew && itemTitle) {
             const imgPath = `./images/${itemTitle}.jpg`;
             const fallbackImg = 'https://cdn-icons-png.flaticon.com/512/263/263142.png';
             const imgErrorScript = `if(this.src.endsWith('.jpg')){ this.src='./images/${itemTitle}.png'; } else { this.style.display='none'; }`;

             html += `
                <div style="text-align:center; margin-bottom: 20px;">
                    <img src="${imgPath}" onerror="${imgErrorScript}" 
                         style="max-height: 200px; max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                </div>
             `;
        }
        // --------------------------------

        category.fields.forEach(field => {
            if(field === '圖片檔名') return;
            let value = item[field] || '';
            let type = (field.includes('日期')) ? 'date' : (field.includes('金額') || field.includes('價格')) ? 'number' : 'text';
            html += `
                <div class="form-group" style="margin-bottom:12px;">
                    <label style="display:block; font-size:0.9rem; color:#666;">${field}</label>
                    <input type="${type}" name="${field}" value="${value}" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                </div>`;
        });

        // 提示與按鈕 (保持不變)
        html += `<p style="font-size:0.8rem; color:#999; margin-top:-5px; margin-bottom:20px;">
            ℹ️ 圖片系統：請將圖檔命名為 <b>${keys.title}.jpg</b> 並放入 images 資料夾
        </p>`;

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

    // --- 新增：圖片放大功能 ---
    showImage: function(event, src) {
        event.stopPropagation(); // 阻止事件冒泡，避免觸發 item-card 的 onclick
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('expanded-img');
        
        // 如果是預設圖 (icon)，就不放大顯示了，感覺怪怪的
        if(src.includes('cdn-icons-png') || src.includes('opacity')) {
            return; 
        }

        modal.classList.remove('hidden');
        modalImg.src = src;
    },

    closeImage: function() {
        document.getElementById('image-modal').classList.add('hidden');
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