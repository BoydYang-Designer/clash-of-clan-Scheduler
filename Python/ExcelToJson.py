import pandas as pd
import json
import random
import time
import os
import tkinter as tk
from tkinter import filedialog, messagebox
from datetime import datetime

def generate_random_color():
    """產生隨機的 Hex 顏色代碼"""
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))

def convert_excel_to_app_json():
    # 1. 初始化 Tkinter 隱藏主視窗
    root = tk.Tk()
    root.withdraw()

    # 2. 跳出檔案選擇視窗
    file_path = filedialog.askopenfilename(
        title="請選擇您的 Excel 記帳檔 (.xlsx)",
        filetypes=[("Excel files", "*.xlsx"), ("All files", "*.*")]
    )

    if not file_path:
        print("未選擇檔案，程式結束。")
        return

    try:
        print(f"正在讀取檔案：{file_path} ...")
        
        # 3. 讀取 Excel 所有工作表 (sheet_name=None 表示讀取全部)
        # engine='openpyxl' 支援讀取 .xlsx
        xls_data = pd.read_excel(file_path, sheet_name=None, engine='openpyxl')
        
        app_data_list = []

        # 4. 遍歷每一個工作表 (Sheet)
        for sheet_name, df in xls_data.items():
            print(f"正在處理工作表：{sheet_name} ...")
            
            # --- 資料清理 ---
            
            # (A) 處理空值：將 NaN 轉為空字串，避免 JSON 錯誤
            df = df.fillna("")
            
            # (B) 處理日期格式：將所有 datetime 類型的欄位轉為字串 (YYYY-MM-DD)
            # 這是為了配合網頁的顯示格式
            for col in df.columns:
                if pd.api.types.is_datetime64_any_dtype(df[col]):
                    df[col] = df[col].dt.strftime('%Y-%m-%d')
                # 強制將所有內容轉為字串或數字，避免特殊物件報錯
                # 如果您希望保留數字格式運算，這行可以斟酌，但通常 JSON 數字是安全的
                
            # (C) 取得欄位名稱 (Header)
            fields = list(df.columns)
            
            # (D) 將資料列轉換為字典列表
            items = df.to_dict(orient='records')

            # 5. 建構單個賣場的資料結構
            category_obj = {
                "id": str(int(time.time() * 1000)) + str(random.randint(100, 999)), # 模擬唯一 ID
                "name": sheet_name,           # Excel 工作表名稱 = 賣場名稱
                "color": generate_random_color(), #隨機配色
                "fields": fields,             # Excel 的第一列 = 欄位設定
                "items": items                # Excel 的內容
            }
            
            app_data_list.append(category_obj)

        # 6. 建構最終輸出的完整 JSON 結構
        final_export = {
            "timestamp": int(time.time() * 1000), # 記錄當前匯出時間
            "data": app_data_list
        }

        # 7. 存檔
        # 檔名會是 原檔名.json (例如: store.xlsx -> store.json)
        base_name = os.path.splitext(file_path)[0]
        output_path = f"{base_name}.json"

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_export, f, ensure_ascii=False, indent=4)

        messagebox.showinfo("轉換成功", f"JSON 檔案已產生！\n位置：{output_path}\n\n請打開您的記帳網頁，點選「設定」->「匯入替換」即可。")

    except Exception as e:
        messagebox.showerror("轉換失敗", f"發生錯誤：\n{str(e)}")

if __name__ == "__main__":
    convert_excel_to_app_json()