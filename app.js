const app = {
    // ============================================================
    // 1. 核心資料結構與初始化 (Core Data & Init)
    // ============================================================
    collections: [],          // 所有記帳本
    currentCollection: null,  // 目前選中的記帳本索引 (null 為頂層)
    data: [],                 // 指向目前記帳本的 content.data (相容舊邏輯)
    
    currentCategoryIndex: null,
    editingItemIndex: null,
    
    sortField: null,
    sortDirection: -1,
    lastUpdated: null,
    
    collectionName: '',
    collectionColor: '#007AFF',

    init: function() {
        const stored = localStorage.getItem('collections');
        
        // 嘗試遷移舊資料的邏輯 (如果沒有 collections 但有舊的 shopData)
        if (!stored) {
            const oldShopData = localStorage.getItem('shopData');
            const oldTime = localStorage.getItem('shopLastUpdated');
            
            if (oldShopData) {
                // 將舊資料遷移到第一個記帳本
                try {
                    const parsedData = JSON.parse(oldShopData);
                    this.collections = [{
                        id: Date.now().toString(),
                        name: "我的賣場 (舊資料)",
                        color: "#007AFF",
                        content: { 
                            timestamp: oldTime ? parseInt(oldTime) : Date.now(), 
                            data: parsedData 
                        }
                    }];
                    alert("已自動將您原有的賣場資料轉換為新版記帳本！");
                } catch(e) {
                    this.createDefaultCollection();
                }
            } else {
                this.createDefaultCollection();
            }
        } else {
            this.collections = JSON.parse(stored);
        }

        this.saveCollections(); // 確保結構同步
        this.renderTopLevel();
        this.setupEventListeners();
    },

    createDefaultCollection: function() {
        this.collections = [{
            id: Date.now().toString(),
            name: "我的賣場",
            color: "#007AFF",
            content: { timestamp: Date.now(), data: [] }
        }];
    },

    saveCollections: function() {
        localStorage.setItem('collections', JSON.stringify(this.collections));
    },

    // 儲存當前操作 (相容舊函式呼叫)
    save: function(updateTimestamp = true) {
        if (this.currentCollection === null) return;
        
        if (updateTimestamp) {
            this.collections[this.currentCollection].content.timestamp = Date.now();
            this.lastUpdated = this.collections[this.currentCollection].content.timestamp;
        }
        
        // 確保 data 寫回 collection 結構
        this.collections[this.currentCollection].content.data = this.data;
        
        this.saveCollections();
        this.updateTimeUI();
    },

    updateTimeUI: function() {
        const el = document.getElementById('last-updated-time');
        if (!el) return;

        if (this.currentCollection === null || !this.lastUpdated) {
            el.textContent = ""; 
            el.style.display = 'none'; 
            return;
        }

        el.style.display = 'block'; 
        const date = new Date(this.lastUpdated);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        
        el.textContent = `最後更新 ${year}/${month}/${day} ${hour}:${minute}`;
    },

    setupEventListeners: function() {
        // 返回按鈕邏輯
        document.getElementById('back-btn').addEventListener('click', () => this.goBack());

        // 設定按鈕
        document.getElementById('action-btn').addEventListener('click', () => this.toggleSettings());

        // 新增項目按鈕 (+ FAB)
        document.getElementById('add-item-btn').addEventListener('click', () => {
            if (this.currentCollection !== null) {
                this.renderEditForm(null); 
            }
        });

        // 搜尋監聽
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (this.currentCollection !== null) {
                    this.performSearch(query);
                }
            });

            searchInput.addEventListener('search', () => {
                if (this.currentCollection !== null) {
                    this.performSearch('');
                }
            });
        }
    },

    // 統一的返回邏輯
    goBack: function() {
        const searchInput = document.getElementById('global-search-input');
        const query = searchInput ? searchInput.value.trim() : '';
        
        // 1. 如果在搜尋模式，先清空搜尋
        if (query !== '') {
            searchInput.value = ''; 
            if (this.currentCollection !== null) {
                this.renderHome();
            }
            return;
        }

        // 2. 如果在編輯商品，回分類列表
        if (this.editingItemIndex !== null) {
            this.editingItemIndex = null;
            // 如果是在欄位編輯器開啟狀態，也需要關閉 (雖由 modal 處理，但確保邏輯)
            if (this.currentCategoryIndex !== null) {
                this.renderCategoryList(this.currentCategoryIndex);
            } else {
                this.renderHome();
            }
            return;
        } 
        
        // 3. 如果在分類列表，回記帳本首頁
        if (this.currentCategoryIndex !== null) {
            this.renderHome();
            return;
        }

        // 4. 如果在記帳本首頁，回最上層 (記帳本列表)
        if (this.currentCollection !== null) {
            this.currentCollection = null;
            this.renderTopLevel();
            return;
        }
    },

    // ============================================================
    // 2. 視圖層級 A：最上層 (記帳本列表)
    // ============================================================
    renderTopLevel: function() {
        const container = document.getElementById('app-container');
        container.innerHTML = ''; 
        
        document.getElementById('page-title').innerHTML = '記帳本';
        document.getElementById('back-btn').classList.add('hidden');
        document.getElementById('floating-action').classList.add('hidden');
        document.getElementById('search-bar-container').classList.add('hidden');
        document.getElementById('main-header').style.borderLeft = 'none'; 

        const grid = document.createElement('div');
        grid.className = 'category-grid';

        this.collections.forEach((col, idx) => {
            const totalCats = col.content.data.length;
            const totalItems = col.content.data.reduce((acc, cat) => acc + cat.items.length, 0);

            const card = document.createElement('div');
            card.className = 'cat-card';
            card.style.borderLeft = `5px solid ${col.color}`;
            card.innerHTML = `
                <div class="cat-name">${col.name}</div>
                <div class="cat-count">${totalCats} 個賣場・${totalItems} 筆紀錄</div>
            `;
            // 右鍵刪除記帳本
            card.oncontextmenu = (e) => {
                e.preventDefault();
                if(confirm(`確定要刪除記帳本「${col.name}」嗎？所有資料將永久遺失！`)) {
                    this.collections.splice(idx, 1);
                    this.saveCollections();
                    this.renderTopLevel();
                }
            };
            card.onclick = () => this.enterCollection(idx);
            grid.appendChild(card);
        });

        const addCard = document.createElement('div');
        addCard.className = 'cat-card add-new-card';
        addCard.innerHTML = `<div class="cat-name" style="font-size: 2rem; color: #888;">+</div><div class="cat-count">新增記帳本</div>`;
        addCard.onclick = () => {
            this.openAddCollectionModal();
        };
        
        grid.appendChild(addCard);
        container.appendChild(grid);
    },

    enterCollection: function(idx) {
        this.currentCollection = idx;
        const col = this.collections[idx];
        
        // 核心：將 app.data 指向選中記帳本的資料，讓後續函式無痛接軌
        this.data = col.content.data;
        this.lastUpdated = col.content.timestamp;
        this.collectionName = col.name;
        this.collectionColor = col.color;

        this.currentCategoryIndex = null;
        this.editingItemIndex = null;
        this.sortField = null;

        this.renderHome();
    },

    // ============================================================
    // 3. 視圖層級 B：記帳本首頁 (賣場分類列表)
    // ============================================================
    renderHome: function() {
        const container = document.getElementById('app-container');
        const headerTitle = document.getElementById('page-title');
        const backBtn = document.getElementById('back-btn');
        const fab = document.getElementById('floating-action');
        const searchBar = document.getElementById('search-bar-container');
        const header = document.getElementById('main-header');

        // 設定樣式
        header.style.borderLeft = `5px solid ${this.collectionColor}`; 
        headerTitle.innerHTML = `${this.collectionName}<span id="last-updated-time"></span>`;
        this.updateTimeUI(); 

        backBtn.classList.remove('hidden'); // 顯示返回 (回上一層)
        fab.classList.add('hidden');
        if (searchBar) searchBar.classList.remove('hidden'); 
        
        this.currentCategoryIndex = null;
        this.editingItemIndex = null;
        this.sortField = null;

        container.innerHTML = ''; 

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
            this.openAddCategoryModal();
        };
        
        grid.appendChild(addCard);
        container.appendChild(grid);
    },

    // ============================================================
    // 4. 視圖層級 C：商品列表與操作 (保留原 app.js 強大功能)
    // ============================================================
    
    // 識別欄位 (保留原邏輯)
    identifyFields: function(category) {
        const f = category.fields;
        return {
            title: f.find(k => ['品名', '品項', '產品名稱', '博物館', '名稱'].some(t => k.includes(t))) || f[0],
            price: f.find(k => ['金額', '價格', '費用'].some(t => k.includes(t))),
            date: f.find(k => ['日期', '時間'].some(t => k.includes(t)))
        };
    },

    // 搜尋功能 (已適配多記帳本)
    performSearch: function(keyword) {
        const container = document.getElementById('app-container');
        const pageTitle = document.getElementById('page-title');
        const backBtn = document.getElementById('back-btn');
        const fab = document.getElementById('floating-action');

        keyword = keyword.trim();
        
        if (!keyword) {
            this.renderHome();
            return;
        }

        document.getElementById('main-header').style.borderLeft = `5px solid ${this.collectionColor}`;
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

        // 搜尋結果排序 (新到舊)
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

    // 排序與列表顯示 (保留原功能)
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

        const header = document.getElementById('main-header');
        header.style.borderLeft = `5px solid ${category.color}`;

        document.getElementById('page-title').innerText = category.name;
        document.getElementById('back-btn').classList.remove('hidden');
        document.getElementById('floating-action').classList.remove('hidden');
        if (searchBar) searchBar.classList.add('hidden'); 

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

        // 分組邏輯
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

        // 排序邏輯
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
            let imgHtml = '';
            if (group.name && group.name !== '未命名') {
                const imgSrc = `./images/${encodeURIComponent(group.name)}.jpg`;
                imgHtml = `<img src="${imgSrc}" class="item-img" onerror="this.style.display='none'" onclick="app.showImage(event, this.src)">`;
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
                    <div id="group-list-${gIndex}" class="group-list" style="display: none;">
                        ${subItemsHtml}
                    </div>
                </div>`;
            }
        }).join('');

        container.innerHTML = sortHtml + '<div class="item-list">' + listHtml + '</div>';
    },

    // ============================================================
    // 5. 編輯與表單功能 (保留原功能)
    // ============================================================
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
             // 若找不到 jpg，嘗試 png，還是沒有則隱藏
             const imgErrorScript = `if(this.src.endsWith('.jpg')){ this.src='./images/${encodeURIComponent(itemTitle)}.png'; } else { this.style.display='none'; }`;

             html += `
                <div style="text-align:center; margin-bottom: 20px;">
                    <img src="${imgPath}" onerror="${imgErrorScript}" onclick="app.showImage(event, this.src)"
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

        // 按鈕區域
        html += `
            <div style="margin-top: 30px;">
                <button type="button" class="btn-field-editor" onclick="app.openFieldEditor()">
                    <span>✏️ 管理商品欄位</span>
                </button>
            </div>`;

        html += `<div class="action-group">`;
        html += `<button type="button" class="btn-primary" onclick="app.saveItem()">
                    ${isNew ? '確認新增' : '儲存變更'}
                 </button>`;

        if (!isNew) {
            html += `
            <button type="button" class="btn-primary btn-success" onclick="app.saveAsNew()">
                ＋ 再次購買 <span style="font-size:0.85em; opacity:0.9; font-weight:400;">(另存新紀錄)</span>
            </button>`;
        }
        
        html += `</div>`; 

        if (!isNew) {
            html += `
            <div style="margin-top: 10px; text-align: center;">
                <button type="button" class="btn-delete" onclick="app.deleteItem(${itemIndex})">
                    刪除此商品
                </button>
            </div>`;
        }
        
        html += '</form></div>';
        container.innerHTML = html;
    },

    // 欄位編輯器邏輯 (Drag and Drop)
    openFieldEditor: function() {
        const catIndex = this.currentCategoryIndex;
        if (catIndex === null) return;
        const category = this.data[catIndex];
        const fieldsList = document.getElementById('fields-list');
        fieldsList.innerHTML = '';

        let draggedItem = null;
        let draggedIndex = null;

        category.fields.forEach((field, index) => {
            const item = document.createElement('div');
            item.className = 'draggable-item';
            item.style.cssText = `display: flex; align-items: center; padding: 14px; background: #fff; margin-bottom: 8px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: grab; user-select: none; touch-action: none;`;
            item.dataset.index = index;
            
            item.innerHTML = `
                <span style="color:#ccc; margin-right:12px; font-size:1.2rem;">≡</span>
                <span style="flex:1; font-weight:500;">${field}</span>
                <span style="color:#ff3b30; cursor:pointer; font-size:1.1rem; padding:8px;" onclick="event.stopPropagation(); app.deleteFieldFromEditor(${index})">✕</span>
            `;
            
            // 電腦版 Drag Events
            item.draggable = true;
            item.addEventListener('dragstart', (e) => { 
                e.dataTransfer.setData('text/plain', index); 
                item.style.opacity = '0.5'; 
            });
            item.addEventListener('dragend', () => { item.style.opacity = '1'; });
            item.addEventListener('dragover', (e) => { e.preventDefault(); });
            item.addEventListener('drop', (e) => {
                e.preventDefault(); e.stopPropagation();
                const fromIndex = parseInt(e.dataTransfer.getData('text'));
                this.swapFields(fromIndex, index);
            });

            // 手機版 Touch Events
            item.addEventListener('touchstart', (e) => {
                draggedItem = item;
                draggedIndex = index;
                item.style.opacity = '0.6';
                item.style.background = '#f9f9f9';
                item.style.transform = 'scale(1.02)';
                item.style.zIndex = '1000';
            }, {passive: false});

            item.addEventListener('touchmove', (e) => {
                if (draggedItem) {
                    e.preventDefault(); 
                }
            }, {passive: false});

            item.addEventListener('touchend', (e) => {
                if (!draggedItem) return;
                item.style.opacity = '1';
                item.style.background = '#fff';
                item.style.transform = 'none';
                item.style.zIndex = '';

                const touch = e.changedTouches[0];
                const elementUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetItem = elementUnderFinger ? elementUnderFinger.closest('.draggable-item') : null;

                if (targetItem && targetItem.dataset.index !== undefined) {
                    const toIndex = parseInt(targetItem.dataset.index);
                    if (draggedIndex !== null && draggedIndex !== toIndex) {
                        this.swapFields(draggedIndex, toIndex);
                    }
                }
                draggedItem = null;
                draggedIndex = null;
            });

            fieldsList.appendChild(item);
        });
        document.getElementById('field-editor-modal').classList.remove('hidden');
        setTimeout(() => document.getElementById('new-field-input').focus(), 100);
    },

    swapFields: function(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        const category = this.data[this.currentCategoryIndex];
        const fields = [...category.fields];
        const [moved] = fields.splice(fromIndex, 1);
        fields.splice(toIndex, 0, moved);
        category.fields = fields;
        this.save();
        this.openFieldEditor();
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

    // 圖片燈箱
    showImage: function(event, src) {
        event.stopPropagation();
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('expanded-img');
        if(src.includes('cdn-icons-png') || src.includes('opacity')) { return; }
        modal.classList.remove('hidden');
        modalImg.src = src;
    },

    closeImage: function() { document.getElementById('image-modal').classList.add('hidden'); },

    // 儲存項目 (操作 this.data 後呼叫 this.save())
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

    // ============================================================
    // 6. 設定功能 (整合記帳本管理與賣場管理)
    // ============================================================
    toggleSettings: function() {
        const modal = document.getElementById('settings-modal');
        if (modal.classList.contains('hidden')) {
            // 根據當前是否在記帳本內，顯示不同的設定選單
            if (this.currentCollection === null) {
                this.renderTopLevelSettings();
            } else {
                this.renderCollectionSettings();
            }
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    },

    // 記帳本管理設定 (最上層)
    renderTopLevelSettings: function() {
        const content = document.getElementById('settings-content');
        let catsHtml = this.collections.map((col, index) => `
            <div class="cat-edit-item">
                <div class="color-picker-wrapper">
                    <input type="color" value="${col.color}" onchange="app.updateCollectionColor(${index}, this.value)">
                </div>
                <input type="text" class="cat-name-input" value="${col.name}" onchange="app.updateCollectionName(${index}, this.value)">
                <button class="cat-delete-btn" onclick="app.deleteCollection(${index})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `).join('');

        content.innerHTML = `
            <div class="modal-header">
                <h2>記帳本管理</h2>
                <button class="close-modal-btn" onclick="app.toggleSettings()">×</button>
            </div>
            <div class="modal-body">
                <div class="setting-section-title">所有記帳本</div>
                <div class="setting-list">${catsHtml}</div>
                
                <div style="margin-top:20px; text-align:center; color:#999; font-size:0.8rem;">
                    提示：在主畫面右下角 + 可新增記帳本
                </div>
            </div>
        `;
    },

    // 賣場分類設定 (記帳本內)
    renderCollectionSettings: function() {
        const content = document.getElementById('settings-content');

        let catsHtml = this.data.map((cat, index) => `
            <div class="cat-edit-item">
                <div class="color-picker-wrapper" title="點擊修改顏色">
                    <input type="color" value="${cat.color}" onchange="app.updateCategoryColor(${index}, this.value)">
                </div>
                <input type="text" class="cat-name-input" value="${cat.name}" onchange="app.updateCategoryName(${index}, this.value)">
                <button class="cat-delete-btn" onclick="app.deleteCategory(${index})">刪除</button>
            </div>
        `).join('');

        content.innerHTML = `
            <div class="modal-header">
                <h2>${this.collectionName} 設定</h2>
                <button class="close-modal-btn" onclick="app.toggleSettings()">×</button>
            </div>

            <div class="modal-body">
                <div class="form-group" style="margin-bottom:20px;">
                    <label>記帳本名稱</label>
                    <input type="text" class="cat-name-input" value="${this.collectionName}" onchange="app.updateCurrentCollectionName(this.value)">
                </div>
                <div class="form-group" style="margin-bottom:30px;">
                    <label>顏色</label>
                    <input type="color" value="${this.collectionColor}" onchange="app.updateCurrentCollectionColor(this.value)">
                </div>

                <div class="setting-section-title">賣場分類</div>
                <div class="setting-list">${catsHtml}</div>

                <div class="quick-add-container">
                    <input type="text" id="quick-new-cat" class="quick-add-input" placeholder="輸入新賣場名稱...">
                    <button onclick="app.quickAddCategory()" class="quick-add-btn">新增</button>
                </div>

                <hr style="border:0; border-top:1px solid #f0f0f0; margin:30px 0;">

                <div class="setting-section-title">目前記帳本備份</div>
                <div class="action-grid">
                    <button onclick="app.exportCurrentCollection()" class="action-btn">📤 匯出 ${this.collectionName}.json</button>
                    <label class="action-btn primary" style="display:flex; align-items:center; justify-content:center; margin:0;">
                        📥 匯入替換
                        <input type="file" accept=".json" onchange="app.importCurrentCollection(this)" style="display:none;">
                    </label>
                </div>
            </div>
        `;
    },

    // === 設定與操作函式 ===

    updateCurrentCollectionName: function(newName) {
        if (!newName.trim()) { alert("名稱不能為空"); return; }
        this.collections[this.currentCollection].name = newName.trim();
        this.collectionName = newName.trim();
        this.saveCollections();
        this.renderHome();
    },

    updateCurrentCollectionColor: function(newColor) {
        this.collections[this.currentCollection].color = newColor;
        this.collectionColor = newColor;
        this.saveCollections();
        this.renderHome();
    },

    updateCollectionName: function(index, newName) {
        if (!newName.trim()) { alert("名稱不能為空"); return; }
        this.collections[index].name = newName.trim();
        this.saveCollections();
        this.renderTopLevel();
    },

    updateCollectionColor: function(index, newColor) {
        this.collections[index].color = newColor;
        this.saveCollections();
        this.renderTopLevel();
    },

    deleteCollection: function(index) {
        if (confirm(`確定刪除記帳本「${this.collections[index].name}」？`)) {
            this.collections.splice(index, 1);
            this.saveCollections();
            this.renderTopLevel();
        }
    },

    exportCurrentCollection: function() {
        const exportObj = {
            timestamp: this.lastUpdated || Date.now(),
            data: this.data
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `${this.collectionName}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    },

    importCurrentCollection: function(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (confirm("這將覆蓋目前記帳本的所有資料，確定嗎？")) {
                    let newData = [];
                    let newTimestamp = Date.now();
                    if (json.data && Array.isArray(json.data)) {
                        newData = json.data;
                        newTimestamp = json.timestamp || Date.now();
                    } else if (Array.isArray(json)) {
                        newData = json;
                    }
                    // 更新當前資料與 collection 結構
                    this.data = newData;
                    this.lastUpdated = newTimestamp;
                    this.collections[this.currentCollection].content = { timestamp: newTimestamp, data: newData };
                    
                    this.save(false);
                    this.toggleSettings();
                    this.renderHome();
                }
            } catch (err) {
                alert("檔案格式錯誤");
            }
        };
        reader.readAsText(file);
    },

    quickAddCategory: function() {
        const input = document.getElementById('quick-new-cat');
        const name = input.value.trim();
        if (!name) return;
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        this.data.push({
            id: Date.now().toString(),
            name: name,
            color: randomColor,
            fields: ['品名', '價格', '購買日期', '備註'],
            items: []
        });
        this.save();
        input.value = '';
        this.renderCollectionSettings();
        this.renderHome();
    },

    updateCategoryName: function(index, newName) {
        if (!newName.trim()) { alert("名稱不能為空"); return; }
        this.data[index].name = newName.trim();
        this.save();
        this.renderHome();
    },

    updateCategoryColor: function(index, newColor) {
        this.data[index].color = newColor;
        this.save();
        this.renderHome();
    },

    deleteCategory: function(index) {
        const catName = this.data[index].name;
        if (confirm(`確定要刪除整個「${catName}」賣場嗎？\n此動作無法復原！`)) {
            this.data.splice(index, 1);
            this.save();
            this.renderHome();
        }
    },

    // ============================================================
    // 7. 新增記帳本 Modal
    // ============================================================
    openAddCollectionModal: function() {
        const content = document.getElementById('settings-content');
        const modal = document.getElementById('settings-modal');
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        content.innerHTML = `
            <div class="modal-header">
                <h2>新增記帳本</h2>
                <button class="close-modal-btn" onclick="document.getElementById('settings-modal').classList.add('hidden')">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>記帳本名稱</label>
                    <input type="text" id="new-collection-name" placeholder="例如: 我的餐廳, 旅行花費..." autocomplete="off">
                </div>
                <div class="form-group" style="margin-bottom: 30px;">
                    <label>選擇顏色</label>
                    <div style="display:flex; align-items:center; gap:15px; background:#f9f9f9; padding:10px; border-radius:12px;">
                        <input type="color" id="new-collection-color" value="${randomColor}" style="width:50px; height:50px; padding:0; border:none; border-radius:8px; cursor:pointer;">
                        <span style="color:#666; font-size:0.9rem;">點擊色塊更換</span>
                    </div>
                </div>
                <div class="action-group">
                    <button class="btn-primary" onclick="app.confirmAddCollection()">確認新增</button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        setTimeout(() => document.getElementById('new-collection-name').focus(), 100);
    },

    confirmAddCollection: function() {
        const nameInput = document.getElementById('new-collection-name');
        const colorInput = document.getElementById('new-collection-color');
        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) {
            alert("請輸入記帳本名稱");
            return;
        }

        this.collections.push({
            id: Date.now().toString(),
            name: name,
            color: color,
            content: { timestamp: Date.now(), data: [] }
        });

        this.saveCollections();
        document.getElementById('settings-modal').classList.add('hidden');
        this.renderTopLevel();
    },

    // ============================================================
    // 8. 新增賣場 Modal (維持原有 UI 風格)
    // ============================================================
    openAddCategoryModal: function() {
        const content = document.getElementById('settings-content');
        const modal = document.getElementById('settings-modal');
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        content.innerHTML = `
            <div class="modal-header">
                <h2>新增賣場</h2>
                <button class="close-modal-btn" onclick="document.getElementById('settings-modal').classList.add('hidden')">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>賣場名稱</label>
                    <input type="text" id="new-cat-name-input" placeholder="例如: 全聯, 7-11..." autocomplete="off">
                </div>
                <div class="form-group" style="margin-bottom: 30px;">
                    <label>選擇顏色</label>
                    <div style="display:flex; align-items:center; gap:15px; background:#f9f9f9; padding:10px; border-radius:12px;">
                        <input type="color" id="new-cat-color-input" value="${randomColor}" style="width:50px; height:50px; padding:0; border:none; border-radius:8px; cursor:pointer;">
                        <span style="color:#666; font-size:0.9rem;">點擊色塊可更換顏色</span>
                    </div>
                </div>
                <div class="action-group">
                    <button class="btn-primary" onclick="app.confirmAddCategory()">確認新增</button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        setTimeout(() => {
            const input = document.getElementById('new-cat-name-input');
            if (input) input.focus();
        }, 100);
    },

    confirmAddCategory: function() {
        const nameInput = document.getElementById('new-cat-name-input');
        const colorInput = document.getElementById('new-cat-color-input');
        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) {
            alert("請輸入賣場名稱");
            return;
        }

        this.data.push({
            id: Date.now().toString(),
            name: name,
            color: color,
            fields: ['品名', '價格', '購買日期', '備註'],
            items: []
        });

        this.save();
        document.getElementById('settings-modal').classList.add('hidden');
        this.renderHome();
    }
};

app.init();