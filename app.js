const app = {
    data: [],
    currentCategoryIndex: null,
    editingItemIndex: null,
    
    // --- 新增：排序狀態設定 ---
    sortField: null,      // 目前選擇的排序欄位
    sortDirection: -1,    // 1 為升冪, -1 為降冪

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
        // 返回按鈕
        document.getElementById('back-btn').addEventListener('click', () => {
            if (this.editingItemIndex !== null) {
                this.renderCategoryList(this.currentCategoryIndex);
            } else if (this.currentCategoryIndex !== null) {
                this.renderHome();
            }
        });

        // 動作按鈕（設定）
        document.getElementById('action-btn').addEventListener('click', () => {
            this.toggleSettings();
        });

        // 新增項目按鈕
        document.getElementById('add-item-btn').addEventListener('click', () => {
            this.renderEditForm(null); 
        });

        // --- 全域搜尋監聽 ---
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                this.performSearch(query);
            });

            searchInput.addEventListener('search', () => {
                this.performSearch('');
            });
        }
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
        const container = document.getElementById('app-container');
        const headerTitle = document.getElementById('page-title');
        const backBtn = document.getElementById('back-btn');
        const fab = document.getElementById('floating-action');
        const searchBar = document.getElementById('search-bar-container');

        container.innerHTML = ''; 
        headerTitle.innerText = '我的賣場';
        backBtn.classList.add('hidden');
        fab.classList.add('hidden');
        if (searchBar) searchBar.classList.remove('hidden'); // 顯示搜尋欄
        
        this.currentCategoryIndex = null;
        this.editingItemIndex = null;
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

    // --- 搜尋功能 ---
    performSearch: function(keyword) {
        const container = document.getElementById('app-container');
        const searchBar = document.getElementById('search-bar-container');
        const pageTitle = document.getElementById('page-title');
        const backBtn = document.getElementById('back-btn');
        const fab = document.getElementById('floating-action');

        keyword = keyword.trim();
        
        if (!keyword) {
            // 清空搜尋 → 回到首頁
            this.renderHome();
            return;
        }

        // 進入搜尋模式
        if (searchBar) searchBar.classList.remove('hidden');
        pageTitle.innerText = `搜尋：${keyword}`;
        backBtn.classList.remove('hidden');
        fab.classList.add('hidden');

        const lowerKeyword = keyword.toLowerCase();
        const results = [];

        this.data.forEach((cat, catIdx) => {
            const keys = this.identifyFields(cat);
            cat.items.forEach((item, itemIdx) => {
                const title = String(item[keys.title] || '').toLowerCase();
                if (title.includes(lowerKeyword)) {
                    results.push({
                        ...item,
                        _catName: cat.name,
                        _catColor: cat.color,
                        _catIndex: catIdx,
                        _originalIndex: itemIdx,
                        _keys: keys
                    });
                }
            });
        });

        if (results.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:50px; color:#999;">找不到與「${keyword}」相關的商品</div>`;
            return;
        }

        // 依日期新→舊排序
        results.sort((a, b) => {
            const dateA = a[a._keys.date] || '';
            const dateB = b[b._keys.date] || '';
            return dateB.localeCompare(dateA);
        });

        const html = results.map(res => {
            const title = res[res._keys.title] || '未命名';
            const date = res[res._keys.date] || '';
            const price = res[res._keys.price] || '';
            
            return `
                <div class="search-result-item" style="border-left: 5px solid ${res._catColor};"
                     onclick="app.currentCategoryIndex = ${res._catIndex}; app.editingItemIndex = ${res._originalIndex}; app.renderEditForm(${res._originalIndex})">
                    <div style="flex:1;">
                        <span class="search-cat-name" style="background:${res._catColor}; color:white; padding:2px 8px; border-radius:4px; font-size:0.8rem;">${res._catName}</span>
                        <div class="item-title" style="margin-top:8px; font-weight:500;">${title}</div>
                        <div class="item-details" style="color:#666; font-size:0.9rem;">${date}</div>
                    </div>
                    ${price ? `<div class="item-price">NT$${price}</div>` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div style="padding:10px;">
                <div style="color:#666; font-size:0.9rem; margin-bottom:15px;">
                    找到 ${results.length} 筆符合「${keyword}」的商品
                </div>
                ${html}
            </div>`;
    },

    changeSortField: function(field) {
        this.sortField = field;
        this.renderCategoryList(this.currentCategoryIndex);
    },

    toggleSortDirection: function() {
        this.sortDirection *= -1;
        this.renderCategoryList(this.currentCategoryIndex);
    },

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

    renderCategoryList: function(index) {
        this.currentCategoryIndex = index;
        this.editingItemIndex = null;
        const category = this.data[index];
        const container = document.getElementById('app-container');
        const searchBar = document.getElementById('search-bar-container');

        document.getElementById('page-title').innerText = category.name;
        document.getElementById('back-btn').classList.remove('hidden');
        document.getElementById('floating-action').classList.remove('hidden');
        if (searchBar) searchBar.classList.add('hidden'); // 進入類別時隱藏搜尋欄

        const keys = this.identifyFields(category);

        if (!this.sortField || !category.fields.includes(this.sortField)) {
            this.sortField = keys.date || category.fields[0];
        }

        if (category.items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">尚無紀錄<br><small>點擊右下角 + 新增第一筆</small></div>';
            return;
        }

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

        let itemsWithIndex = category.items.map((item, idx) => ({ ...item, _originalIndex: idx }));

        const groups = {};
        itemsWithIndex.forEach(item => {
            const name = item[keys.title] || '未命名';
            if (!groups[name]) groups[name] = [];
            groups[name].push(item);
        });

        let groupArray = Object.keys(groups).map(name => {
            const items = groups[name];
            const prices = items.map(i => {
                const p = String(i[keys.price] || 0).replace(/[^0-9.-]+/g,"");
                return parseFloat(p) || 0;
            });
            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);
            
            items.sort((a, b) => {
                const dA = a[keys.date] || '';
                const dB = b[keys.date] || '';
                return dB.localeCompare(dA);
            });

            return {
                name: name,
                items: items,
                count: items.length,
                maxPrice: maxPrice,
                minPrice: minPrice,
                latestDate: items[0][keys.date] || '',
                latestItem: items[0]
            };
        });

        groupArray.sort((groupA, groupB) => {
            let itemA = groupA.latestItem;
            let itemB = groupB.latestItem;
            
            if (this.sortField.includes('金額') || this.sortField.includes('價格')) {
                if (this.sortDirection === -1) {
                    return groupA.maxPrice - groupB.maxPrice; 
                } else {
                    return groupA.minPrice - groupB.minPrice;
                }
            }

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

        const listHtml = groupArray.map((group, gIndex) => {
            const firstItem = group.items[0];
            let imgHtml = '';
            if (group.name && group.name !== '未命名') {
                const imgSrc = `./images/${encodeURIComponent(group.name)}.jpg`;
                imgHtml = `<img src="${imgSrc}" class="item-img" onerror="this.style.display='none'">`;
            }

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
            } else {
                let priceDisplay = '';
                if (group.minPrice !== group.maxPrice) {
                    priceDisplay = `NT$${group.minPrice} ~ ${group.maxPrice}`;
                } else {
                    priceDisplay = `NT$${group.minPrice}`;
                }

                const subItemsHtml = group.items.map(subItem => {
                    const sPrice = keys.price ? subItem[keys.price] : '';
                    const sDate = keys.date ? subItem[keys.date] : '';
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

    renderEditForm: function(itemIndex) {
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
             const imgPath = `./images/${encodeURIComponent(itemTitle)}.jpg`;
             const imgErrorScript = `if(this.src.endsWith('.jpg')){ this.src='./images/${encodeURIComponent(itemTitle)}.png'; } else { this.style.display='none'; }`;

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
            html += `
            <button type="button" class="btn-primary" onclick="app.saveAsNew()" style="width:100%; margin-top:10px; background-color: #28a745;">
                ＋ 再次購買 (另存為新紀錄)
            </button>`;
        }

        if (!isNew) {
            html += `<button type="button" class="btn-delete" onclick="app.deleteItem(${itemIndex})" style="width:100%; margin-top:10px;">刪除商品</button>`;
        }
        
        html += '</form></div>';
        container.innerHTML = html;
    },

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

    saveAsNew: function() {
        const form = document.getElementById('item-form');
        const formData = new FormData(form);
        const newItem = {};
        formData.forEach((value, key) => { newItem[key] = value; });

        const category = this.data[this.currentCategoryIndex];
        category.items.push(newItem);

        this.save();
        alert('已新增一筆購買紀錄！');
        this.renderCategoryList(this.currentCategoryIndex);
    },

    deleteItem: function(index) {
        if (confirm('確定要刪除這筆紀錄嗎？')) {
            this.data[this.currentCategoryIndex].items.splice(index, 1);
            this.save();
            this.renderCategoryList(this.currentCategoryIndex);
        }
    },

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