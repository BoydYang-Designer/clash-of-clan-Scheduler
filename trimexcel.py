import pandas as pd
import tkinter as tk
from tkinter import filedialog, messagebox

def clean_my_shopping_excel():
    # 1. 選擇檔案
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(title="選擇要整理的 Excel", filetypes=[("Excel", "*.xlsx")])
    
    if not file_path: return

    try:
        # 讀取所有分頁
        all_sheets = pd.read_excel(file_path, sheet_name=None)
        cleaned_sheets = {}

        for name, df in all_sheets.items():
            print(f"正在整理: {name}")
            
            # A. 移除全空的欄與列
            df = df.dropna(how='all', axis=0).dropna(how='all', axis=1)

            # B. 找到品名欄位 (自動偵測包含 '品' 或 '博物館' 的欄位)
            name_col = next((c for c in df.columns if any(k in str(c) for k in ['品項', '品名', '博物館'])), None)
            
            if name_col:
                # 關鍵操作：向下填補 (ffill)
                # 這樣原本空白的品名，會自動抓上一行的名字來補
                df[name_col] = df[name_col].ffill()
                
                # C. 移除「日期」或「金額」是空的列 (代表那是真正沒資料的雜行)
                # 這裡假設第 2 或 3 欄以後是數據，我們只保留有數據的行
                df = df.dropna(thresh=3) 

            cleaned_sheets[name] = df

        # 2. 儲存成新檔案
        output_path = file_path.replace(".xlsx", "_整理完成.xlsx")
        with pd.ExcelWriter(output_path) as writer:
            for name, df in cleaned_sheets.items():
                df.to_excel(writer, sheet_name=name, index=False)

        messagebox.showinfo("完成", f"Excel 整理好了！\n新檔名：{output_path}\n你可以用這個新檔去跑 data.json 轉換了。")

    except Exception as e:
        messagebox.showerror("錯誤", f"整理失敗：{str(e)}")

if __name__ == "__main__":
    clean_my_shopping_excel()