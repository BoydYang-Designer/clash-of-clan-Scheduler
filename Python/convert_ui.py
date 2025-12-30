import pandas as pd
import json
import tkinter as tk
from tkinter import filedialog, messagebox
import numpy as np

def run_conversion():
    # 建立隱藏的 Tkinter 視窗
    root = tk.Tk()
    root.withdraw()

    # 1. 彈出選單讓使用者選取 Excel 檔案
    file_path = filedialog.askopenfilename(
        title="請挑選要轉換的購物紀錄 Excel (.xlsx)",
        filetypes=[("Excel files", "*.xlsx *.xls")]
    )

    if not file_path:
        print("使用者取消選擇")
        return

    try:
        # 定義賣場配置與主題色 (對應您的 App 設定)
        config = {
            "POYA": {"id": "poya", "name": "POYA 寶雅", "color": "#d00278"},
            "Costco": {"id": "costco", "name": "Costco 好市多", "color": "#e31837"},
            "Carrefour家樂福": {"id": "carrefour", "name": "Carrefour 家樂福", "color": "#004899"},
            "DAISO": {"id": "daiso", "name": "DAISO 大創", "color": "#ff66cc"},
            "DECATHLON迪卡儂": {"id": "decathlon", "name": "迪卡儂", "color": "#0082c3"},
            "博物館": {"id": "museum", "name": "博物館紀錄", "color": "#8d6e63"}
        }

        # 讀取 Excel 所有分頁
        xls = pd.read_excel(file_path, sheet_name=None)
        
        final_data = []

        for sheet_name, df in xls.items():
            # 只有在 config 有定義的分頁才處理
            if sheet_name in config:
                print(f"正在處理: {sheet_name}...")

                # --- 關鍵修正 A: 處理日期格式 (這是造成 JSON 錯誤的主因) ---
                # 自動搜尋所有欄位，如果是時間格式，轉成字串
                for col in df.columns:
                    if pd.api.types.is_datetime64_any_dtype(df[col]):
                        df[col] = df[col].dt.strftime('%Y-%m-%d')
                    # 或是欄位名稱包含 "日期" 字眼，強制轉字串
                    elif "日期" in str(col):
                         df[col] = df[col].astype(str).replace('NaT', '')

                # --- 關鍵修正 B: 處理數字欄位 ---
                # 定義哪些欄位應該要是數字
                numeric_keywords = ['金額', '價格', '費用', '特價金額', '折價', '單價']
                
                for col in df.columns:
                    # 如果欄位名稱包含上述關鍵字 (例如 "購買金額")
                    if any(keyword in str(col) for keyword in numeric_keywords):
                        # 1. 強制轉為數字，無法轉的變成 NaN
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        # 2. 將 NaN 填補為 0
                        df[col] = df[col].fillna(0)
                        # 3. 轉為整數 (去除小數點)
                        df[col] = df[col].astype(int)

                # --- 關鍵修正 C: 處理空值 (NaN) ---
                # JSON 不支援 NaN，必須轉成空字串 ""
                df = df.fillna("")

                # --- 補上圖片欄位 (如果沒有的話) ---
                if '圖片檔名' not in df.columns:
                    df['圖片檔名'] = ""

                # 轉換為字典列表
                items = df.to_dict(orient='records')
                
                # 組合該賣場的資料結構
                final_data.append({
                    "id": config[sheet_name]["id"],
                    "name": config[sheet_name]["name"],
                    "color": config[sheet_name]["color"],
                    "fields": list(df.columns), # 自動抓取 Excel 裡的所有欄位
                    "items": items
                })

        # 2. 儲存為 data.json
        if final_data:
            output_file = 'data.json'
            # 使用 default=str 來防止漏網之魚的時間格式導致崩潰
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(final_data, f, ensure_ascii=False, indent=2, default=str)
            
            messagebox.showinfo("轉換成功", f"恭喜！已完成 {len(final_data)} 個賣場的資料轉換。\n檔案已儲存為 data.json")
        else:
            messagebox.showwarning("警告", "沒有找到符合設定的賣場分頁，請檢查 Excel 分頁名稱。")

    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(error_msg) # 在終端機印出詳細錯誤
        messagebox.showerror("轉換失敗", f"發生錯誤：\n{e}\n\n請截圖此畫面")

if __name__ == "__main__":
    run_conversion()