#!/usr/bin/env python3
"""
Service Phân Tích Sản Xuất Gạch - IoT Log Analysis
Tính toán các chỉ tiêu khoán theo phương án khoán lương 2025
"""

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict
import json

@dataclass
class ProductionMetrics:
    """Chỉ tiêu sản xuất theo phương án khoán"""
    date: str
    production_line: str  # Dây chuyền
    product_type: str     # Loại sản phẩm
    
    # Sản lượng từng khâu
    sl_ep: int  # 100% - Sau máy ép (sau máy ép)
    sl_truoc_lo: int = 0   # Trước lò nung (truoc-ln)
    sl_sau_lo: int = 0     # Sau lò nung (sau-ln)
    sl_sau_mai: int = 0    # Sau mài (sau-mc)
    sl_truoc_dh: int = 0   # Trước đóng hộp (truoc-dh)
    
    # Hao phí các công đoạn (số lượng)
    hp_moc: int = 0        # Hao phí mộc (sau ép -> trước lò)
    hp_lo: int = 0         # Hao phí lò nung
    hp_tm: int = 0         # Hao phí trước mài
    hp_ht: int = 0         # Hao phí hoàn thiện (sau mài)
    
    # Dây chuyền 5 có thêm
    hp_lo_xuong: int = 0      # Hao phí lò xương
    hp_sau_xuong: int = 0     # Hao phí sau xương trước men
    hp_lo_men: int = 0        # Hao phí lò men
    
    # Sản phẩm nhập kho
    sl_a1: int = 0         # A1
    sl_a2: int = 0         # A2
    sl_cat_lo: int = 0     # Cắt lô
    sl_pe1: int = 0        # Phế loại 1
    sl_pe2: int = 0        # Phế loại 2
    
    # Tồn kho
    ton_chua_mai: int = 0
    
    def calculate_percentages(self) -> Dict[str, float]:
        """Tính tỷ lệ % theo công thức khoán"""
        if self.sl_ep == 0:
            return {}
        
        return {
            'ty_le_hp_moc': (self.hp_moc / self.sl_ep) * 100,
            'ty_le_hp_lo': (self.hp_lo / self.sl_ep) * 100,
            'ty_le_hp_tm': (self.hp_tm / self.sl_ep) * 100,
            'ty_le_hp_ht': (self.hp_ht / self.sl_ep) * 100,
            'ty_le_a1': (self.sl_a1 / self.sl_ep) * 100,
            'ty_le_a2': (self.sl_a2 / self.sl_ep) * 100,
            'ty_le_cat_lo': (self.sl_cat_lo / self.sl_ep) * 100,
            'ty_le_pe1': (self.sl_pe1 / self.sl_ep) * 100,
            'ty_le_pe2': (self.sl_pe2 / self.sl_ep) * 100,
            'ty_le_ton': (self.ton_chua_mai / self.sl_ep) * 100,
        }
    
    def validate_sum(self) -> Tuple[bool, float]:
        """Kiểm tra tổng = 100%"""
        percentages = self.calculate_percentages()
        total = sum(percentages.values())
        is_valid = abs(total - 100) < 0.1  # Cho phép sai số 0.1%
        return is_valid, total


class LogParser:
    """Parse log files từ cảm biến IoT"""
    
    @staticmethod
    def parse_log_file(filepath: str) -> List[Tuple[datetime, int]]:
        """
        Parse 1 file log
        Returns: List của (timestamp, count)
        """
        data = []
        pattern = r'\[(.+?)\] Count: (\d+)'
        
        try:
            with open(filepath, 'r') as f:
                for line in f:
                    match = re.search(pattern, line)
                    if match:
                        timestamp_str = match.group(1)
                        count = int(match.group(2))
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        data.append((timestamp, count))
        except Exception as e:
            print(f"Error parsing {filepath}: {e}")
        
        return data
    
    @staticmethod
    def get_batch_total(data: List[Tuple[datetime, int]]) -> int:
        """
        Tính tổng số viên gạch trong 1 batch (1 file)
        = Count cuối - Count đầu
        Vì count là giá trị tích lũy từ thiết bị
        """
        if not data:
            return 0
        if len(data) < 2:
            return 0
        return data[-1][1] - data[0][1]
    
    @staticmethod
    def get_all_batches_total(folder_path: str) -> int:
        """Tổng tất cả các batch trong folder"""
        total = 0
        txt_files = sorted(Path(folder_path).glob('*.txt'))
        
        print(f"        📄 Found {len(txt_files)} log files")
        
        for file in txt_files:
            data = LogParser.parse_log_file(str(file))
            if data:
                batch_count = LogParser.get_batch_total(data)
                total += batch_count
                first_count = data[0][1] if data else 0
                last_count = data[-1][1] if data else 0
                print(f"           {file.name}: {last_count} - {first_count} = {batch_count} viên")
        
        return total


class ProductionAnalyzer:
    """Phân tích sản xuất theo phương án khoán"""
    
    def __init__(self, log_root_dir: str):
        self.log_root = Path(log_root_dir)
        
    def analyze_daily_production(self, date: str, production_line: str) -> ProductionMetrics:
        """
        Phân tích sản xuất 1 ngày cho 1 dây chuyền
        
        Args:
            date: "2025-11-19"
            production_line: "Dây chuyền 1", "Dây chuyền 2", ...
        """
        
        # Đường dẫn log theo cấu trúc
        date_folder = self.log_root / "logs" / date / production_line
        
        if not date_folder.exists():
            raise ValueError(f"Không tìm thấy log tại {date_folder}")
        
        # Tìm brick-type folder (cấu trúc mới)
        # Structure: logs/{date}/{production-line}/{brick-type}/{device-position}/
        brick_type_folders = [d for d in date_folder.iterdir() if d.is_dir() and d.name != 'no-brick-type']
        
        if brick_type_folders:
            print(f"  📦 Found {len(brick_type_folders)} brick type(s): {[f.name for f in brick_type_folders]}")
            
            # MERGE DATA từ TẤT CẢ các dòng gạch
            total_metrics = None
            product_types = []
            
            for brick_folder in brick_type_folders:
                product_types.append(brick_folder.name)
                print(f"     Processing: {brick_folder.name}")
                
                # Đọc số liệu từ các vị trí cảm biến cho brick type này
                sl_ep = self._get_count(brick_folder / "sau-ep")
                
                # Tính hao phí các công đoạn
                if "Dây chuyền 5" in production_line:
                    metrics = self._analyze_dc5(brick_folder, sl_ep)
                else:
                    metrics = self._analyze_dc_standard(brick_folder, sl_ep)
                
                # Merge vào tổng
                if total_metrics is None:
                    total_metrics = metrics
                else:
                    # Cộng dồn các metrics
                    total_metrics.sl_ep += metrics.sl_ep
                    total_metrics.hp_moc += metrics.hp_moc
                    total_metrics.hp_lo += metrics.hp_lo
                    total_metrics.hp_tm += metrics.hp_tm
                    total_metrics.hp_ht += metrics.hp_ht
                    total_metrics.hp_lo_xuong += metrics.hp_lo_xuong
                    total_metrics.hp_sau_xuong += metrics.hp_sau_xuong
                    total_metrics.hp_lo_men += metrics.hp_lo_men
                    total_metrics.sl_a1 += metrics.sl_a1
                    total_metrics.sl_a2 += metrics.sl_a2
                    total_metrics.sl_cat_lo += metrics.sl_cat_lo
                    total_metrics.sl_pe1 += metrics.sl_pe1
                    total_metrics.sl_pe2 += metrics.sl_pe2
                    total_metrics.ton_chua_mai += metrics.ton_chua_mai
            
            metrics = total_metrics
            product_type = ", ".join(product_types)  # "300x600mm, 400x800mm"
        else:
            # Fallback: Cấu trúc cũ (không có brick-type level)
            working_folder = date_folder
            product_type = ""
            
            sl_ep = self._get_count(working_folder / "sau-ep")
            
            if "Dây chuyền 5" in production_line:
                metrics = self._analyze_dc5(working_folder, sl_ep)
            else:
                metrics = self._analyze_dc_standard(working_folder, sl_ep)
        
        metrics.date = date
        metrics.production_line = production_line
        metrics.product_type = product_type
        
        return metrics
    
    def _analyze_dc_standard(self, folder: Path, sl_ep: int) -> ProductionMetrics:
        """Phân tích dây chuyền tiêu chuẩn (DC1, DC2, DC6)"""
        
        # Map tên thiết bị thực tế:
        # sau-mc: Sau máy cắt (100% - điểm bắt đầu)
        # truoc-ln: Trước lò nung
        # sau-ln: Sau lò nung  
        # sau-me: Sau mài
        # truoc-dh: Trước đóng hộp
        
        truoc_lo = self._get_count(folder / "truoc-ln")  # Trước lò nung
        sau_lo = self._get_count(folder / "sau-ln")      # Sau lò nung
        truoc_mai = 0  # Chưa có cảm biến này
        sau_mai = self._get_count(folder / "sau-mc")     # Sau mài
        truoc_dh = self._get_count(folder / "truoc-dh")  # Trước đóng hộp
        
        # Tính hao phí
        hp_moc = sl_ep - truoc_lo
        hp_lo = truoc_lo - sau_lo
        
        # Gạch ra lò = sau_lo
        # Gạch rải mài = sau_mai (đã bắt đầu qua mài)
        # HP trước mài = Gạch ra lò - Tồn chưa mài - Gạch rải mài
        ton_chua_mai = self._get_count(folder / "ton-chua-mai") if (folder / "ton-chua-mai").exists() else 0
        hp_tm = sau_lo - ton_chua_mai - sau_mai
        
        # Sản phẩm hoàn thiện (nhập kho theo từng loại)
        # Cần có cảm biến phân loại hoặc nhập thủ công
        nhap_kho = self._get_nhap_kho_data(folder / "nhap-kho")
        
        # HP hoàn thiện = Gạch rải mài - Tổng nhập kho
        total_nhap_kho = sum(nhap_kho.values())
        hp_ht = sau_mai - total_nhap_kho
        
        return ProductionMetrics(
            date="",
            production_line="",
            product_type="",
            sl_ep=sl_ep,
            sl_truoc_lo=truoc_lo,
            sl_sau_lo=sau_lo,
            sl_sau_mai=sau_mai,
            sl_truoc_dh=truoc_dh,
            hp_moc=hp_moc,
            hp_lo=hp_lo,
            hp_tm=hp_tm,
            hp_ht=hp_ht,
            sl_a1=nhap_kho.get('A1', 0),
            sl_a2=nhap_kho.get('A2', 0),
            sl_cat_lo=nhap_kho.get('CL', 0),
            sl_pe1=nhap_kho.get('PL1', 0),
            sl_pe2=nhap_kho.get('PL2', 0),
            ton_chua_mai=ton_chua_mai
        )
    
    def _analyze_dc5(self, folder: Path, sl_ep: int) -> ProductionMetrics:
        """Phân tích dây chuyền 5 (2 lần nung)"""
        
        truoc_lo_xuong = self._get_count(folder / "truoc-lo-xuong")
        sau_lo_xuong = self._get_count(folder / "sau-lo-xuong")
        truoc_lo_men = self._get_count(folder / "truoc-lo-men")
        sau_lo_men = self._get_count(folder / "sau-lo-men")
        truoc_mai = self._get_count(folder / "truoc-mai")
        sau_mai = self._get_count(folder / "sau-mai")
        truoc_dh = self._get_count(folder / "truoc-dh")
        
        hp_moc = sl_ep - truoc_lo_xuong
        hp_lo_xuong = truoc_lo_xuong - sau_lo_xuong
        hp_sau_xuong = sau_lo_xuong - truoc_lo_men
        hp_lo_men = truoc_lo_men - sau_lo_men
        
        ton_chua_mai = self._get_count(folder / "ton-chua-mai") if (folder / "ton-chua-mai").exists() else 0
        hp_tm = sau_lo_men - ton_chua_mai - sau_mai
        
        nhap_kho = self._get_nhap_kho_data(folder / "nhap-kho")
        total_nhap_kho = sum(nhap_kho.values())
        hp_ht = sau_mai - total_nhap_kho
        
        return ProductionMetrics(
            date="",
            production_line="",
            product_type="",
            sl_ep=sl_ep,
            sl_truoc_lo=truoc_lo_xuong,
            sl_sau_lo=sau_lo_men,  # Sau lò men là điểm cuối của nung
            sl_sau_mai=sau_mai,
            sl_truoc_dh=truoc_dh,
            hp_moc=hp_moc,
            hp_lo=0,
            hp_tm=hp_tm,
            hp_ht=hp_ht,
            hp_lo_xuong=hp_lo_xuong,
            hp_sau_xuong=hp_sau_xuong,
            hp_lo_men=hp_lo_men,
            sl_a1=nhap_kho.get('A1', 0),
            sl_a2=nhap_kho.get('A2', 0),
            sl_cat_lo=nhap_kho.get('CL', 0),
            sl_pe1=nhap_kho.get('PL1', 0),
            sl_pe2=nhap_kho.get('PL2', 0),
            ton_chua_mai=ton_chua_mai
        )
    
    def _analyze_brick_type(self, brick_folder: Path, production_line: str, date: str, brick_type: str) -> ProductionMetrics:
        """Phân tích 1 dòng gạch cụ thể"""
        
        print(f"     🔍 Analyzing folder: {brick_folder}")
        
        # Map tên thiết bị thực tế
        # sau-mc: Sau mài cạnh
        # truoc-ln: Trước lò nung
        # sau-ln: Sau lò nung
        # sau-me: Sau máy ep
        # truoc-dh: Trước đóng hộp (hoàn thiện)
        
        sl_ep = self._get_count(brick_folder / "sau-me")  # Sau máy cắt = 100%
        
        # Tính hao phí các công đoạn
        if "Dây chuyền 5" in production_line:
            metrics = self._analyze_dc5(brick_folder, sl_ep)
        else:
            metrics = self._analyze_dc_standard(brick_folder, sl_ep)
        
        metrics.date = date
        metrics.production_line = production_line
        metrics.product_type = brick_type
        
        return metrics
    
    def _get_count(self, folder: Path) -> int:
        """Lấy tổng count từ 1 folder (tất cả các batch)"""
        if not folder.exists():
            print(f"        ⚠️  Folder not found: {folder}")
            return 0
        
        count = LogParser.get_all_batches_total(str(folder))
        print(f"        📂 {folder.name}: {count} viên")
        return count
    
    def _get_nhap_kho_data(self, folder: Path) -> Dict[str, int]:
        """
        Đọc dữ liệu nhập kho theo loại
        
        Format JSON mong muốn:
        {
            "A1": 1000,
            "A2": 100,
            "CL": 50,
            "PL1": 20,
            "PL2": 10
        }
        """
        if not folder.exists():
            return {}
        
        json_file = folder / "classification.json"
        if json_file.exists():
            with open(json_file, 'r') as f:
                return json.load(f)
        
        # Fallback: Đọc từ log files nếu có cảm biến riêng
        result = {}
        for grade in ['A1', 'A2', 'CL', 'PL1', 'PL2']:
            grade_folder = folder / grade.lower()
            if grade_folder.exists():
                result[grade] = self._get_count(grade_folder)
        
        return result


class KhoanCalculator:
    """Tính toán khoán lương"""
    
    # Đơn giá thưởng/phạt (vnđ/m2)
    REWARD_PRICES = {
        'A1': 5000,
        'A2': 3000,
        'CL': 1000,
        'PL1': -100,
        'PL2': -300,
        'HP_HUY': -500
    }
    
    # Đơn giá hao phí mộc
    HP_MOC_REWARD = 5000
    HP_MOC_PENALTY = 2500
    
    # Đơn giá hao phí lò
    HP_LO_REWARD = 10000
    HP_LO_PENALTY = 5000
    
    @staticmethod
    def calculate_reward(metrics: ProductionMetrics, target_metrics: Dict) -> Dict:
        """
        Tính thưởng/phạt dựa trên metrics thực tế vs target
        
        Args:
            metrics: Chỉ tiêu thực tế
            target_metrics: Chỉ tiêu khoán (từ phụ lục)
        """
        result = {
            'san_luong_vuot': 0,
            'chat_luong_vuot': {},
            'hao_phi_thuong_phat': {},
            'tong_thuong': 0,
            'tong_phat': 0
        }
        
        actual = metrics.calculate_percentages()
        
        # So sánh với target
        for key, target_pct in target_metrics.items():
            if key in actual:
                diff = actual[key] - target_pct
                # Implement logic thưởng/phạt
                pass
        
        return result


def generate_daily_report(date: str, log_root: str, output_file: str):
    """
    Tạo báo cáo tổng hợp cuối ngày
    """
    analyzer = ProductionAnalyzer(log_root)
    
    report = {
        'date': date,
        'production_lines': {}
    }
    
    # Phân tích từng dây chuyền
    lines = ["Dây chuyền 1", "Dây chuyền 2", "Dây chuyền 5", "Dây chuyền 6"]
    
    for line in lines:
        try:
            print(f"\n📊 Analyzing {line}...")
            
            # Tìm tất cả brick type folders cho dây chuyền này
            date_folder = Path(log_root) / "logs" / date / line
            
            if not date_folder.exists():
                print(f"  ⚠️  No data found for {line}")
                continue
            
            brick_type_folders = [d for d in date_folder.iterdir() if d.is_dir() and d.name != 'no-brick-type']
            
            if brick_type_folders:
                # Tạo báo cáo riêng cho TỪNG dòng gạch
                report['production_lines'][line] = {}
                
                for brick_folder in brick_type_folders:
                    brick_type = brick_folder.name
                    print(f"  📦 Processing brick type: {brick_type}")
                    
                    # Phân tích metrics cho brick type này
                    metrics = analyzer._analyze_brick_type(brick_folder, line, date, brick_type)
                    percentages = metrics.calculate_percentages()
                    is_valid, total = metrics.validate_sum()
                    
                    report['production_lines'][line][brick_type] = {
                        'metrics': asdict(metrics),
                        'percentages': percentages,
                        'validation': {
                            'is_valid': is_valid,
                            'total_percentage': total
                        }
                    }
            else:
                # Cấu trúc cũ - không có brick type level
                print(f"  ℹ️  Old structure (no brick-type level)")
                metrics = analyzer.analyze_daily_production(date, line)
                percentages = metrics.calculate_percentages()
                is_valid, total = metrics.validate_sum()
                
                report['production_lines'][line] = {
                    'all': {
                        'metrics': asdict(metrics),
                        'percentages': percentages,
                        'validation': {
                            'is_valid': is_valid,
                            'total_percentage': total
                        }
                    }
                }
                
        except Exception as e:
            print(f"❌ Error analyzing {line}: {e}")
            import traceback
            traceback.print_exc()
    
    # Lưu báo cáo
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Báo cáo đã được lưu tại: {output_file}")
    return report


if __name__ == "__main__":
    # Example usage
    date = "2025-11-19"
    log_root = "./tile-production-management"
    output = f"report_{date}.json"
    
    report = generate_daily_report(date, log_root, output)
    
    # In tóm tắt
    print("\n" + "="*60)
    print("=== BÁO CÁO SẢN XUẤT ===")
    print(f"Ngày: {date}")
    print("="*60)
    
    for line, brick_types in report['production_lines'].items():
        print(f"\n🏭 {line}:")
        
        for brick_type, data in brick_types.items():
            metrics = data['metrics']
            percentages = data['percentages']
            
            print(f"\n  📦 {brick_type}:")
            print(f"     - Sản lượng sau ép (100%): {metrics['sl_ep']} viên")
            print(f"     - Sản lượng trước lò: {metrics['sl_truoc_lo']} viên")
            print(f"     - Sản lượng sau lò: {metrics['sl_sau_lo']} viên")
            print(f"     - Sản lượng sau mài: {metrics['sl_sau_mai']} viên")
            print(f"     - Sản lượng trước đóng hộp: {metrics['sl_truoc_dh']} viên")
            print(f"     ---")
            print(f"     - Hao phí mộc: {metrics['hp_moc']} viên")
            print(f"     - Hao phí lò: {metrics['hp_lo']} viên")
            print(f"     - Sản phẩm A1: {metrics['sl_a1']} viên")
            
            if percentages:
                print(f"     - Tỷ lệ A1: {percentages.get('ty_le_a1', 0):.2f}%")
            
            validation_icon = '✓' if data['validation']['is_valid'] else '✗'
            print(f"     - Validation: {validation_icon} (Tổng: {data['validation']['total_percentage']:.2f}%)")
    
    print("\n" + "="*60)