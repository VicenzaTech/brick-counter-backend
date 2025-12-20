import pandas as pd
import openpyxl
import json
from datetime import datetime

# Open Excel file
file_path = r"c:\Users\edenk\Desktop\csv\Tiêu chuẩn - Gạch.xlsx"
workbook = openpyxl.load_workbook(file_path)
sheet = workbook.active

print("="*100)
print("PHÂN TÍCH VÀ TRÍCH XUẤT DỮ LIỆU TỪ CÁC TABLE FORMATS")
print("="*100)

# Get all rows
all_rows = list(sheet.iter_rows(values_only=True))

# Manual analysis shows different table structures:
# Table 1: Row 1-15 (Header at row 1)
# Table 2: Row 26-44 (Header at rows 26-27, has merged headers with container info)
# Table 3: Row 54-73 (Standard format with Vietnamese names)
# Note: Rows 80-97 are ignored (not relevant)

# Let's extract each table separately

all_brick_types = []

# ============================================================================
# TABLE 1: Standard format (Rows 1-15)
# ============================================================================
print("\n" + "="*100)
print("TABLE 1: Định dạng tiêu chuẩn (English names)")
print("="*100)

table1_header = all_rows[0]  # Row 1
table1_data = all_rows[1:15]  # Rows 2-15

print(f"Header: {[h for h in table1_header if h]}")
print(f"Số dòng dữ liệu: {len(table1_data)}")

for row_data in table1_data:
    if row_data[0] is None:  # Skip if STT is empty
        continue
    
    entry = {
        "STT": int(row_data[0]) if row_data[0] else None,
        "Tên sản phẩm (Tiếng Anh)": str(row_data[1]) if row_data[1] else None,
        "Kích thước (mm)": str(row_data[2]) if row_data[2] else None,
        "Độ dày (mm)": float(row_data[3].day) if isinstance(row_data[3], datetime) else (float(row_data[3]) if row_data[3] else None),
        "Loại gạch": str(row_data[4]) if row_data[4] else None,
        "Trọng lượng (kg/m2)": float(row_data[5]) if isinstance(row_data[5], (int, float)) else (float(row_data[5].day) if isinstance(row_data[5], datetime) else None),
        "Số lượng viên/thùng": int(row_data[6]) if row_data[6] else None,
        "m2/thùng": float(row_data[7]) if isinstance(row_data[7], (int, float)) else (float(row_data[7].day) if isinstance(row_data[7], datetime) else None),
        "Trọng lượng/thùng (kg)": float(row_data[8]) if isinstance(row_data[8], (int, float)) else None,
        "Số lượng thùng/pallet": int(row_data[9]) if row_data[9] else None,
        "Tiêu chuẩn chất lượng": str(row_data[10]) if row_data[10] else None,
        "Ghi chú": str(row_data[11]) if row_data[11] else None,
        "Table": "Table1_Standard"
    }
    all_brick_types.append(entry)
    print(f"  ✓ {entry['STT']}. {entry['Tên sản phẩm (Tiếng Anh)']} - {entry['Kích thước (mm)']}")

# ============================================================================
# TABLE 2: Format với container info (Rows 26-44)
# ============================================================================
print("\n" + "="*100)
print("TABLE 2: Định dạng với thông tin container (Vietnamese names)")
print("="*100)

# Headers are at rows 26-27
table2_main_header = all_rows[25]  # Row 26
table2_sub_header = all_rows[26]   # Row 27
table2_data = all_rows[27:44]      # Rows 28-44

print(f"Main Header: {[h for h in table2_main_header if h]}")
print(f"Sub Header: {[h for h in table2_sub_header if h]}")

for row_data in table2_data:
    # Skip empty, summary rows, or header-like rows
    if row_data[0] is None or str(row_data[0]).upper() in ['TỔNG', 'TONG'] or 'BẢNG' in str(row_data[0]).upper() or 'TIÊU CHUẨN' in str(row_data[0]).upper():
        continue
    
    # Skip if STT is not a number
    try:
        stt_val = int(row_data[0])
    except (ValueError, TypeError):
        continue
    
    entry = {
        "STT": stt_val,
        "Kích thước (mm)": str(row_data[1]) if row_data[1] else None,
        "Dòng sản phẩm": str(row_data[2]) if row_data[2] else None,
        "Độ dày (mm)": float(row_data[3].day) if isinstance(row_data[3], datetime) else (float(row_data[3]) if row_data[3] else None),
        "Loại gạch": str(row_data[4]) if row_data[4] else None,
        "Số lượng viên/thùng": int(row_data[5]) if row_data[5] else None,
        "Trọng lượng (kg/m2)": float(row_data[6]) if isinstance(row_data[6], (int, float)) else None,
        "m2/thùng": float(row_data[7]) if isinstance(row_data[7], (int, float)) else None,
        "Số lượng thùng/pallet": int(row_data[8]) if row_data[8] else None,
        "Tiêu chuẩn chất lượng": str(row_data[9]) if row_data[9] else None,
        "Container_Pallets": int(row_data[10]) if row_data[10] and isinstance(row_data[10], (int, float)) else None,
        "Container_Boxes": int(row_data[11]) if row_data[11] and isinstance(row_data[11], (int, float)) else None,
        "Container_Kg": float(row_data[12]) if row_data[12] and isinstance(row_data[12], (int, float)) else None,
        "Container_m2": float(row_data[13]) if row_data[13] and isinstance(row_data[13], (int, float)) else None,
        "Table": "Table2_Container_Info"
    }
    
    # Only add if has meaningful data
    if entry["Dòng sản phẩm"] or entry["Kích thước (mm)"]:
        all_brick_types.append(entry)
        print(f"  ✓ {entry['STT']}. {entry['Dòng sản phẩm']} - {entry['Kích thước (mm)']}")

# ============================================================================
# TABLE 3: Standard format Vietnamese (Rows 54-73)
# ============================================================================
print("\n" + "="*100)
print("TABLE 3: Định dạng chuẩn với tên tiếng Việt")
print("="*100)

# Header at row 54
table3_header = all_rows[53]  # Row 54
table3_data = all_rows[54:73]  # Rows 55-73

print(f"Header: {[h for h in table3_header if h]}")
print(f"Số dòng dữ liệu: {len(table3_data)}")

for row_data in table3_data:
    # Skip empty or summary rows
    if row_data[0] is None or str(row_data[0]).upper() in ['TỔNG', 'TONG']:
        continue
    
    # Skip if STT is not a number
    try:
        stt_val = int(row_data[0])
    except (ValueError, TypeError):
        continue
    
    # Helper function to safely convert to int
    def safe_int(val):
        if val is None:
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None
    
    # Helper function to safely convert to float
    def safe_float(val):
        if val is None:
            return None
        if isinstance(val, datetime):
            return float(val.day)
        try:
            return float(val)
        except (ValueError, TypeError):
            return None
    
    entry = {
        "STT": stt_val,
        "Tên sản phẩm": str(row_data[1]) if row_data[1] else None,
        "Kích thước (mm)": str(row_data[2]) if row_data[2] else None,
        "Độ dày (mm)": safe_float(row_data[3]),
        "Loại gạch": str(row_data[4]) if row_data[4] else None,
        "Trọng lượng (kg/m2)": safe_float(row_data[5]),
        "Số lượng viên/thùng": safe_int(row_data[6]),
        "m2/thùng": safe_float(row_data[7]),
        "Trọng lượng/thùng (kg)": safe_float(row_data[8]),
        "Số lượng thùng/pallet": safe_int(row_data[9]),
        "Tiêu chuẩn chất lượng": str(row_data[10]) if row_data[10] else None,
        "Ghi chú": str(row_data[11]) if row_data[11] else None,
        "Table": "Table3_Vietnamese_Names"
    }
    
    all_brick_types.append(entry)
    print(f"  ✓ {entry['STT']}. {entry['Tên sản phẩm']} - {entry['Kích thước (mm)']}")

# Save comprehensive JSON
print("\n" + "="*100)
print("LƯU DỮ LIỆU JSON")
print("="*100)

output_file = r"c:\Users\edenk\Desktop\csv\brickTypes_complete.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_brick_types, f, ensure_ascii=False, indent=2)

print(f"\n✓ Đã lưu {len(all_brick_types)} entries vào {output_file}")

# Create separate JSON for each table
table1_data_only = [entry for entry in all_brick_types if entry.get("Table") == "Table1_Standard"]
table2_data_only = [entry for entry in all_brick_types if entry.get("Table") == "Table2_Container_Info"]
table3_data_only = [entry for entry in all_brick_types if entry.get("Table") == "Table3_Vietnamese_Names"]

with open(r"c:\Users\edenk\Desktop\csv\brickTypes_table1_standard.json", 'w', encoding='utf-8') as f:
    json.dump(table1_data_only, f, ensure_ascii=False, indent=2)

with open(r"c:\Users\edenk\Desktop\csv\brickTypes_table2_container.json", 'w', encoding='utf-8') as f:
    json.dump(table2_data_only, f, ensure_ascii=False, indent=2)

with open(r"c:\Users\edenk\Desktop\csv\brickTypes_table3_summary.json", 'w', encoding='utf-8') as f:
    json.dump(table3_data_only, f, ensure_ascii=False, indent=2)

print(f"✓ Table 1: {len(table1_data_only)} entries")
print(f"✓ Table 2: {len(table2_data_only)} entries")
print(f"✓ Table 3: {len(table3_data_only)} entries")

# Create comprehensive schema
schema = {
    "title": "Brick Types Database - Multi-Table Format",
    "description": "Schema for brick/tile data extracted from Excel with multiple table formats",
    "tables": {
        "Table1_Standard": {
            "description": "Standard format with English product names",
            "row_range": "1-15",
            "fields": {
                "STT": {"type": "integer", "description": "Sequential number"},
                "Tên sản phẩm (Tiếng Anh)": {"type": "string", "description": "Product name in English"},
                "Kích thước (mm)": {"type": "string", "description": "Dimensions (WxH)"},
                "Độ dày (mm)": {"type": "number", "description": "Thickness in mm"},
                "Loại gạch": {"type": "string", "description": "Brick/Tile type"},
                "Trọng lượng (kg/m2)": {"type": "number", "description": "Weight per m²"},
                "Số lượng viên/thùng": {"type": "integer", "description": "Pieces per box"},
                "m2/thùng": {"type": "number", "description": "m² per box"},
                "Trọng lượng/thùng (kg)": {"type": "number", "description": "Weight per box"},
                "Số lượng thùng/pallet": {"type": "integer", "description": "Boxes per pallet"},
                "Tiêu chuẩn chất lượng": {"type": "string", "description": "Quality standard"},
                "Ghi chú": {"type": "string", "description": "Notes"}
            }
        },
        "Table2_Container_Info": {
            "description": "Format with container information and Vietnamese product names",
            "row_range": "26-74",
            "fields": {
                "STT": {"type": "integer", "description": "Sequential number"},
                "Kích thước (mm)": {"type": "string", "description": "Dimensions"},
                "Dòng sản phẩm": {"type": "string", "description": "Product line (Vietnamese)"},
                "Độ dày (mm)": {"type": "number", "description": "Thickness"},
                "Loại gạch": {"type": "string", "description": "Brick type"},
                "Số lượng viên/thùng": {"type": "integer", "description": "Pieces per box"},
                "Trọng lượng (kg/m2)": {"type": "number", "description": "Weight per m²"},
                "m2/thùng": {"type": "number", "description": "m² per box"},
                "Số lượng thùng/pallet": {"type": "integer", "description": "Boxes per pallet"},
                "Tiêu chuẩn chất lượng": {"type": "string", "description": "Quality standard"},
                "Container_Pallets": {"type": "integer", "description": "Pallets in 20ft container"},
                "Container_Boxes": {"type": "integer", "description": "Boxes in 20ft container"},
                "Container_Kg": {"type": "number", "description": "Total kg in 20ft container"},
                "Container_m2": {"type": "number", "description": "Total m² in 20ft container"}
            }
        },
        "Table3_Summary_With_Formulas": {
            "description": "Summary table with formula references",
            "row_range": "80-97",
            "fields": {
                "TT": {"type": "integer", "description": "Sequential number"},
                "Dòng sản phẩm": {"type": "string", "description": "Product line"},
                "Formula_Reference": {"type": "string", "description": "Excel formula reference"}
            }
        }
    }
}

schema_file = r"c:\Users\edenk\Desktop\csv\brickTypes_complete_schema.json"
with open(schema_file, 'w', encoding='utf-8') as f:
    json.dump(schema, f, ensure_ascii=False, indent=2)

print(f"✓ Schema: {schema_file}")

print("\n" + "="*100)
print("HOÀN TẤT!")
print("="*100)
