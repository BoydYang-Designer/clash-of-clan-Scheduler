import json
import pandas as pd
import tkinter as tk
from tkinter import filedialog, messagebox
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font

def convert_json_to_excel():
    # 1. 建立隱藏的主視窗以彈出檔案選取框
    root = tk.Tk()
    root.withdraw()

    # 2. 選擇 JSON 檔案
    file_path = filedialog.askopenfilename(
        title="請選擇要轉換的 JSON 檔",
        filetypes=[("JSON files", "*.json")]
    )

    if not file_path:
        return

    try:
        # 3. 讀取 JSON 資料（修正：取 'data' 鍵下的陣列）
        with open(file_path, 'r', encoding='utf-8') as f:
            full_data = json.load(f)
            data = full_data['data']  # 新增這行，取出實際的商店陣列

        # 4. 準備寫入 Excel
        output_file = "Shop_Converted.xlsx"
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            for store in data:
                sheet_name = store['name']
                items = store['items']
                
                # 將資料轉換為 DataFrame
                df = pd.DataFrame(items)
                
                # 寫入工作表
                df.to_excel(writer, sheet_name=sheet_name, index=False)
                
                # 5. 美化格式 (自動換行、置中對齊)
                workbook = writer.book
                worksheet = writer.sheets[sheet_name]
                
                # 設定標題粗體
                for cell in worksheet[1]:
                    cell.font = Font(bold=True)
                    cell.alignment = Alignment(horizontal='center', vertical='center')

                # 設定所有格子自動換行、垂直居中
                for row in worksheet.iter_rows(min_row=2):
                    for cell in row:
                        cell.alignment = Alignment(wrap_text=True, vertical='center', horizontal='left')
                
                # 調整欄寬 (簡單固定寬度或根據內容微調)
                for column in worksheet.columns:
                    worksheet.column_dimensions[column[0].column_letter].width = 20

        messagebox.showinfo("成功", f"轉換完成！檔案已儲存為：\n{output_file}")

    except Exception as e:
        messagebox.showerror("錯誤", f"轉換過程中發生錯誤：\n{str(e)}")

if __name__ == "__main__":
    convert_json_to_excel()