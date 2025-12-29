import pandas as pd
import json
import tkinter as tk
from tkinter import filedialog, messagebox

def run_conversion():
    root = tk.Tk()
    root.withdraw()

    file_path = filedialog.askopenfilename(
        title="請選擇整合過的 Excel 檔案",
        filetypes=[("Excel files", "*.xlsx *.xls")]
    )

    if not file_path: return

    try:
        config = {
            "POYA": {"id": "poya", "name": "POYA 寶雅", "color": "#d00278"},
            "Costco": {"id": "costco", "name": "Costco 好市多", "color": "#e31837"},
            "Carrefour家樂福": {"id": "carrefour", "name": "Carrefour 家樂福", "color": "#004899"},
            "DAISO": {"id": "daiso", "name": "DAISO 大創", "color": "#ff66cc"},
            "DECATHLON迪卡儂": {"id": "decathlon", "name": "迪卡儂", "color": "#0082c3"},
            "博物館": {"id": "museum", "name": "博物館紀錄", "color": "#808080"}
        }

        final_data = []
        excel_file = pd.ExcelFile(file_path)
        
        for sheet_name in excel_file.sheet_names:
            if sheet_name in config:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                
                # --- 關鍵修正：處理整合格式 ---
                # 1. 先移除完全空白的列
                df = df.dropna(how='all', axis=0)

                # 2. 找到品名欄位
                name_col = next((c for c in df.columns if any(k in str(c) for k in ['品項', '品名', '博物館'])), None)
                
                if name_col:
                    # 使用 ffill (forward fill) 向上填補：如果品名是空的，就用上一行的名字
                    df[name_col] = df[name_col].ffill()
                    
                    # 填補完後，再移除掉那些連日期/價格都沒有的真正廢棄列
                    df = df.dropna(subset=[df.columns[4]]) # 假設第 5 欄是日期，日期不能空
                
                # --- 結束修正 ---

                df = df.fillna("")
                items = df.to_dict(orient='records')
                
                final_data.append({
                    "id": config[sheet_name]["id"],
                    "name": config[sheet_name]["name"],
                    "color": config[sheet_name]["color"],
                    "fields": list(df.columns),
                    "items": items
                })

        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        
        messagebox.showinfo("成功", "轉換完成！整合格式已處理。")

    except Exception as e:
        messagebox.showerror("錯誤", f"出錯了：{str(e)}")

if __name__ == "__main__":
    run_conversion()