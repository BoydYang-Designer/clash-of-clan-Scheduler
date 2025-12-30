const app = {
    data: [],
    currentCategoryIndex: null,
    editingItemIndex: null,
    
    // --- 新增：排序狀態設定 ---
    sortField: null,      // 目前選擇的排序欄位 (例如 "金額")
    sortDirection: -1,    // 1 為升冪 (小->大), -1 為降冪 (大->小)

    init: async function() {
        // ... (這部分保持原本的 init 程式碼不變) ...
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

    // ... (save, setupEventListeners, identifyFields 等函式保持不變) ...
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
    
    identifyFields: function(category) {
        const f = category.fields;
        return {
            title: f.find(k => ['品名', '品項', '產品名稱', '博物館', '名稱'].some(t => k.includes(t))) || f[0],
            price: f.find(k => ['金額', '價格', '費用'].some(t => k.includes(t))),
            date: f.find(k => ['日期', '時間'].some(t => k.includes(t)))
        };
    },
    renderHome: function() {
        // ... (renderHome 保持不變，略過以節省篇幅) ...
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
        // 重置排序設定
        this.sortField = null;

        const grid = document.createElement('div');
        grid.className = 'category-grid';

        this.data.forEach((cat, index) => {
            const card = document.createElement('div');
            card.className = 'cat-card';
            card.style.borderLeft = `5px solid ${cat.color}`;
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

        const addCard = document.createElement('div');
        addCard.className = 'cat-card add-new-card';
        addCard.innerHTML = `<div class="cat-name" style="font-size: 2rem; color: #888;">+</div><div class="cat-count">新增賣場</div>`;
        addCard.onclick = () => {
            document.getElementById('settings-modal').classList.remove('hidden');
            setTimeout(() => document.getElementById('new-cat-name').focus(), 100);
        };
        grid.appendChild(addCard);
        container.appendChild(grid);
    },

    // --- 新增功能：切換排序欄位 ---
    changeSortField: function(field) {
        this.sortField = field;
        this.renderCategoryList(this.currentCategoryIndex);
    },

    // --- 新增功能：切換排序方向 ---
    toggleSortDirection: function() {
        this.sortDirection *= -1; // 1 變 -1， -1 變 1
        this.renderCategoryList(this.currentCategoryIndex);
    },

    // --- 修改後的列表渲染 (核心修改) ---
// --- 新增：切換群組展開/收合 ---
    toggleGroup: function(id) {
        const list = document.getElementById(`group-list-${id}`);
        const arrow = document.getElementById(`group-arrow-${id}`);
        if (list.style.display === 'block') {
            list.style.display = 'none';
            arrow.classList.remove('open');
        } else {
            list.style.display = 'block';
            arrow.classList.add('open');
        }
    },

    // --- 修改後的列表渲染 (加入智慧分組功能) ---
    renderCategoryList: function(index) {
        this.currentCategoryIndex = index;
        this.editingItemIndex = null;
        const category = this.data[index];
        const container = document.getElementById('app-container');
        document.getElementById('page-title').innerText = category.name;
        document.getElementById('back-btn').classList.remove('hidden');
        document.getElementById('floating-action').classList.remove('hidden');

        const keys = this.identifyFields(category);

        // 預設排序
        if (!this.sortField || !category.fields.includes(this.sortField)) {
            this.sortField = keys.date || category.fields[0];
        }

        if (category.items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">尚無紀錄<br><small>點擊右下角 + 新增第一筆</small></div>';
            return;
        }

        // --- 1. 產生下拉選單 (保持不變) ---
        const sortableFields = category.fields.filter(f => f !== '圖片檔名');
        let optionsHtml = sortableFields.map(field => {
            const selected = (field === this.sortField) ? 'selected' : '';
            return `<option value="${field}" ${selected}>依 ${field} 排序</option>`;
        }).join('');
        const dirIcon = this.sortDirection === 1 ? '⬆️ 低→高 (舊→新)' : '⬇️ 高→低 (新→舊)';
        const sortHtml = `
            <div class="sort-container">
                <select class="sort-select" onchange="app.changeSortField(this.value)">${optionsHtml}</select>
                <button class="sort-dir-btn" onclick="app.toggleSortDirection()">${dirIcon}</button>
            </div>`;

        // --- 2. 智慧分組邏輯 (核心修改) ---
        
        // 先把原始資料加上索引，這樣分組後還能找到它是第幾筆
        let itemsWithIndex = category.items.map((item, idx) => ({ ...item, _originalIndex: idx }));

        // 依據「品名」進行分組
        const groups = {};
        itemsWithIndex.forEach(item => {
            const name = item[keys.title] || '未命名';
            if (!groups[name]) groups[name] = [];
            groups[name].push(item);
        });

        // 將分組物件轉為陣列，以便進行排序
        let groupArray = Object.keys(groups).map(name => {
            const items = groups[name];
            
            // 計算該組的統計數據 (用於排序和顯示)
            const prices = items.map(i => {
                const p = String(i[keys.price] || 0).replace(/[^0-9.-]+/g,"");
                return parseFloat(p) || 0;
            });
            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);
            
            // 找出該組中「最符合排序條件」的值 (例如：依日期排序時，拿該組最新的日期來代表整組)
            // 這裡我們先簡單處理：內部列表預設依日期(新->舊)排好
            items.sort((a, b) => {
                const dA = a[keys.date] || '';
                const dB = b[keys.date] || '';
                return dB.localeCompare(dA); // 內部強制日期降冪，讓最新的在上面
            });

            return {
                name: name,
                items: items, // 這是一個陣列，包含該商品的所有購買紀錄
                count: items.length,
                maxPrice: maxPrice,
                minPrice: minPrice,
                latestDate: items[0][keys.date] || '',
                latestItem: items[0] // 用最新的一筆資料來代表這一組進行排序
            };
        });

        // --- 3. 對「群組」進行排序 ---
        groupArray.sort((groupA, groupB) => {
            // 我們拿各組的「代表項目 (latestItem)」來跟原本的排序邏輯比較
            let itemA = groupA.latestItem;
            let itemB = groupB.latestItem;
            
            // 如果使用者是選「價格排序」，我們要特殊處理：
            // 價格高到低 -> 比最大價 (maxPrice)
            // 價格低到高 -> 比最小價 (minPrice)
            if (this.sortField.includes('金額') || this.sortField.includes('價格')) {
                if (this.sortDirection === -1) { // 降冪 (高->低)
                    return groupA.maxPrice - groupB.maxPrice; 
                } else { // 升冪 (低->高)
                    return groupA.minPrice - groupB.minPrice;
                }
            }

            // 其他欄位使用原本的排序邏輯
            let valA = itemA[this.sortField] || '';
            let valB = itemB[this.sortField] || '';
            
            const cleanNum = (val) => {
                if (typeof val === 'number') return val;
                const str = String(val).replace(/[^0-9.-]+/g, "");
                return parseFloat(str);
            };
            const numA = cleanNum(valA);
            const numB = cleanNum(valB);
            const isNumericField = !isNaN(numA) && !isNaN(numB) && !this.sortField.includes('日期') && valA !== '' && valB !== '';

            if (isNumericField) {
                return (numA - numB) * this.sortDirection;
            } else {
                return String(valA).localeCompare(String(valB), 'zh-Hant') * this.sortDirection;
            }
        });

        // --- 4. 渲染 HTML ---
        const listHtml = groupArray.map((group, gIndex) => {
            const firstItem = group.items[0]; // 代表圖片
            
            // 圖片處理
            let imgHtml = '';
            if (group.name && group.name !== '未命名') {
                const imgSrc = `./images/${encodeURIComponent(group.name)}.jpg`;
                imgHtml = `<img src="${imgSrc}" class="item-img" onerror="this.style.display='none'">`;
            }

            // 狀況 A: 該商品只有一筆紀錄 -> 維持原本卡片樣式
            if (group.count === 1) {
                const item = group.items[0];
                const price = keys.price ? item[keys.price] || '' : '';
                const date = keys.date ? item[keys.date] || '' : '';
                
                return `
                <div class="item-card" onclick="app.renderEditForm(${item._originalIndex})">
                    <div class="item-content" style="display:flex; align-items:center;">
                        ${imgHtml}
                        <div style="flex:1;">
                            <div class="item-title">${group.name}</div>
                            <div class="item-details">${date}</div>
                            ${price ? `<div class="item-price">NT$${price}</div>` : ''}
                        </div>
                    </div>
                </div>`;
            }

            // 狀況 B: 該商品有多筆紀錄 -> 顯示群組資料夾
            else {
                // 價格顯示邏輯：如果不一樣顯示範圍，一樣顯示單價
                let priceDisplay = '';
                if (group.minPrice !== group.maxPrice) {
                    priceDisplay = `NT$${group.minPrice} ~ ${group.maxPrice}`;
                } else {
                    priceDisplay = `NT$${group.minPrice}`;
                }

                // 產生子列表 HTML
                const subItemsHtml = group.items.map(subItem => {
                    const sPrice = keys.price ? subItem[keys.price] : '';
                    const sDate = keys.date ? subItem[keys.date] : '';
                    // 這裡可以加入更多你想在列表看到的資訊，例如「購買地點」
                    const sLoc = subItem['購買地點'] || ''; 

                    return `
                    <div class="sub-item" onclick="app.renderEditForm(${subItem._originalIndex})">
                        <div>
                            <div class="sub-date">${sDate} ${sLoc ? `(${sLoc})` : ''}</div>
                        </div>
                        <div class="sub-price">NT$${sPrice}</div>
                    </div>`;
                }).join('');

                return `
                <div class="group-card">
                    <div class="group-header" onclick="app.toggleGroup(${gIndex})">
                        ${imgHtml}
                        <div class="group-info">
                            <div class="group-title">${group.name}</div>
                            <div class="group-meta">
                                <span class="group-badge">買過 ${group.count} 次</span>
                                <span>${priceDisplay}</span>
                            </div>
                        </div>
                        <div id="group-arrow-${gIndex}" class="group-arrow">▼</div>
                    </div>
                    <div id="group-list-${gIndex}" class="group-list">
                        ${subItemsHtml}
                    </div>
                </div>`;
            }
        }).join('');

        container.innerHTML = sortHtml + '<div class="item-list">' + listHtml + '</div>';
    },

    // ... (renderEditForm, openFieldEditor 等後續函式保持不變) ...
    renderEditForm: function(itemIndex) {
        // ... 請保留原本 renderEditForm 的完整程式碼 ...
        this.editingItemIndex = itemIndex;
        const category = this.data[this.currentCategoryIndex];
        const isNew = itemIndex === null;
        const item = isNew ? {} : category.items[itemIndex];
        const container = document.getElementById('app-container');
        
        const keys = this.identifyFields(category);
        const itemTitle = item[keys.title] || '';
        
        document.getElementById('page-title').innerText = isNew ? "新增商品" : "編輯商品";
        document.getElementById('floating-action').classList.add('hidden');

        let html = '<div class="form-container" style="padding:15px;"><form id="item-form">';
        
        if (!isNew && itemTitle) {
             const imgPath = `./images/${itemTitle}.jpg`;
             const imgErrorScript = `if(this.src.endsWith('.jpg')){ this.src='./images/${itemTitle}.png'; } else { this.style.display='none'; }`;

             html += `
                <div style="text-align:center; margin-bottom: 20px;">
                    <img src="${imgPath}" onerror="${imgErrorScript}" 
                         style="max-height: 200px; max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                </div>
             `;
        }

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

        html += `<p style="font-size:0.8rem; color:#999; margin-top:-5px; margin-bottom:20px;">
            ℹ️ 圖片系統：請將圖檔命名為 <b>${keys.title || '品名'}.jpg</b> 並放入 images 資料夾
        </p>`;

        html += `
            <div style="margin:20px 0; padding:15px; background:#f9f9f9; border-radius:8px;">
                <div onclick="app.openFieldEditor()" style="color:#007aff; cursor:pointer; font-weight:500; text-align:center; padding:12px; background:#fff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                    ✏️ 編輯欄位（新增、刪除、調整順序）
                </div>
            </div>`;

        html += `<button type="button" class="btn-primary" onclick="app.saveItem()" style="width:100%;"> ${isNew ? '確認新增' : '更新資料'} </button>`;
        
        if (!isNew) {
            html += `<button type="button" class="btn-delete" onclick="app.deleteItem(${itemIndex})" style="width:100%; margin-top:10px;">刪除商品</button>`;
        }
        
        html += '</form></div>';
        container.innerHTML = html;
    },
    // ... 請確保後面的 openFieldEditor, showImage 等函式都有保留 ...
    openFieldEditor: function() { this.originalOpenFieldEditor(); }, // 這裡我簡寫了，請確保你沒有刪除原本的函式，如果原本的 code 沒動，只要替換 renderCategoryList 即可。
    
    // (為了方便，請確保從 openFieldEditor 開始往下的程式碼都存在。若您只需要替換修改的部分，請只複製上面的 renderCategoryList 覆蓋舊的即可)
    
    // --- 補齊原本的函式以防覆蓋錯誤 (請貼上你原本 app.js 後半段的所有程式碼) ---
    // 下面這些函式請維持原本的樣子，不需要修改，但我列出來提醒你不要刪掉：
    openFieldEditor: function() {
        const catIndex = this.currentCategoryIndex;
        if (catIndex === null) return;
        const category = this.data[catIndex];
        const fieldsList = document.getElementById('fields-list');
        fieldsList.innerHTML = '';
        category.fields.forEach((field, index) => {
            const item = document.createElement('div');
            item.style.cssText = `display: flex; align-items: center; padding: 12px; background: #fff; margin-bottom: 8px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); cursor: move; user-select: none;`;
            item.draggable = true;
            item.dataset.index = index;
            item.innerHTML = `<span style="flex:1; font-weight:500;">${field}</span><span style="color:#ff3b30; cursor:pointer; font-size:1.2rem; padding:8px;" onclick="event.stopPropagation(); app.deleteFieldFromEditor(${index})">✕</span>`;
            item.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', index); item.style.opacity = '0.5'; });
            item.addEventListener('dragend', () => { item.style.opacity = '1'; });
            item.addEventListener('dragover', (e) => { e.preventDefault(); });
            item.addEventListener('drop', (e) => {
                e.preventDefault(); e.stopPropagation();
                const fromIndex = parseInt(e.dataTransfer.getData('text'));
                const toIndex = index;
                if (fromIndex !== toIndex) {
                    const fields = [...category.fields];
                    const [moved] = fields.splice(fromIndex, 1);
                    fields.splice(toIndex, 0, moved);
                    category.fields = fields;
                    this.save();
                    this.openFieldEditor();
                }
            });
            fieldsList.appendChild(item);
        });
        document.getElementById('field-editor-modal').classList.remove('hidden');
        setTimeout(() => document.getElementById('new-field-input').focus(), 100);
    },
    closeFieldEditor: function() {
        document.getElementById('field-editor-modal').classList.add('hidden');
        this.renderEditForm(this.editingItemIndex);
    },
    addFieldFromEditor: function() {
        const input = document.getElementById('new-field-input');
        const newField = input.value.trim();
        if (!newField) { alert("請輸入欄位名稱"); return; }
        const category = this.data[this.currentCategoryIndex];
        if (category.fields.includes(newField)) { alert("這個欄位已經存在了！"); return; }
        category.fields.push(newField);
        this.save();
        input.value = '';
        this.openFieldEditor();
    },
    deleteFieldFromEditor: function(index) {
        const category = this.data[this.currentCategoryIndex];
        const fieldName = category.fields[index];
        if (fieldName.includes('品') || fieldName.includes('金額') || fieldName.includes('價格') || fieldName.includes('費用') || fieldName.includes('日期')) {
            if (!confirm(`「${fieldName}」是重要欄位，刪除後所有相關資料會遺失，確定要刪除嗎？`)) { return; }
        } else {
            if (!confirm(`確定要刪除欄位「${fieldName}」嗎？`)) { return; }
        }
        category.fields.splice(index, 1);
        category.items.forEach(item => { delete item[fieldName]; });
        this.save();
        this.openFieldEditor();
    },
    showImage: function(event, src) {
        event.stopPropagation();
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('expanded-img');
        if(src.includes('cdn-icons-png') || src.includes('opacity')) { return; }
        modal.classList.remove('hidden');
        modalImg.src = src;
    },
    closeImage: function() { document.getElementById('image-modal').classList.add('hidden'); },
    saveItem: function() {
        const form = document.getElementById('item-form');
        const formData = new FormData(form);
        const newItem = {};
        formData.forEach((value, key) => { newItem[key] = value; });
        const category = this.data[this.currentCategoryIndex];
        if (this.editingItemIndex !== null) {
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
    toggleSettings: function() { document.getElementById('settings-modal').classList.toggle('hidden'); },
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
        const name = document.getElementById('new-cat-name').value.trim();
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
        if(confirm(`確定要刪除整個「${this.data[index].name}」賣場嗎？所有資料將會遺失！`)) {
            this.data.splice(index, 1);
            this.save();
            this.renderHome();
        }
    }
};

app.init();