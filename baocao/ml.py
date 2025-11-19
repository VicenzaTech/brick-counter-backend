#!/usr/bin/env python3
"""
Hệ Thống ML/AI Tối Ưu Sản Xuất Gạch
Tích hợp Machine Learning và AI vào quy trình sản xuất
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow import keras
from typing import Dict, List, Tuple
import json
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')


class DefectPredictionModel:
    """
    ML Model 1: DỰ ĐOÁN TỶ LỆ HỎA PHÍ
    Dự đoán tỷ lệ hỏng ở các công đoạn dựa trên:
    - Thông số lò (nhiệt độ, áp suất, chu kỳ)
    - Độ ẩm nguyên liệu
    - Tốc độ dây chuyền
    - Lịch sử hao phí
    """
    
    def __init__(self):
        self.model_moc = RandomForestRegressor(n_estimators=100, random_state=42)
        self.model_lo = RandomForestRegressor(n_estimators=100, random_state=42)
        self.model_ht = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def prepare_features(self, data: pd.DataFrame) -> np.ndarray:
        """
        Chuẩn bị features từ dữ liệu sản xuất
        
        Features:
        - chu_ky_lo: Thời gian nung (phút)
        - nhiet_do_lo: Nhiệt độ lò (°C)
        - ap_suat_lo: Áp suất (bar)
        - do_am_nguyen_lieu: % độ ẩm
        - toc_do_day_chuyen: m/phút
        - san_luong_gio_truoc: Sản lượng giờ trước
        - ty_le_loi_gio_truoc: Tỷ lệ lỗi giờ trước
        - gio_trong_ngay: 0-23
        - ngay_trong_tuan: 0-6
        - thoi_gian_tu_bao_duong: ngày
        """
        features = data[[
            'chu_ky_lo', 'nhiet_do_lo', 'ap_suat_lo', 
            'do_am_nguyen_lieu', 'toc_do_day_chuyen',
            'san_luong_gio_truoc', 'ty_le_loi_gio_truoc',
            'gio_trong_ngay', 'ngay_trong_tuan', 'thoi_gian_tu_bao_duong'
        ]].values
        
        return self.scaler.fit_transform(features)
    
    def train(self, historical_data: pd.DataFrame):
        """Train model với dữ liệu lịch sử"""
        X = self.prepare_features(historical_data)
        
        # Target: Tỷ lệ hao phí từng công đoạn
        y_moc = historical_data['ty_le_hp_moc'].values
        y_lo = historical_data['ty_le_hp_lo'].values
        y_ht = historical_data['ty_le_hp_ht'].values
        
        # Train 3 models
        self.model_moc.fit(X, y_moc)
        self.model_lo.fit(X, y_lo)
        self.model_ht.fit(X, y_ht)
        
        self.is_trained = True
        print("✓ Defect Prediction Model trained successfully")
    
    def predict(self, current_conditions: Dict) -> Dict[str, float]:
        """
        Dự đoán tỷ lệ hao phí với điều kiện hiện tại
        
        Returns:
            {
                'hp_moc_predicted': 2.5,  # %
                'hp_lo_predicted': 1.8,
                'hp_ht_predicted': 1.2,
                'total_defect_rate': 5.5
            }
        """
        if not self.is_trained:
            raise ValueError("Model chưa được train!")
        
        # Convert dict to DataFrame
        df = pd.DataFrame([current_conditions])
        X = self.scaler.transform(self.prepare_features(df))
        
        predictions = {
            'hp_moc_predicted': float(self.model_moc.predict(X)[0]),
            'hp_lo_predicted': float(self.model_lo.predict(X)[0]),
            'hp_ht_predicted': float(self.model_ht.predict(X)[0])
        }
        predictions['total_defect_rate'] = sum(predictions.values())
        
        return predictions
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Xem feature nào ảnh hưởng nhiều nhất đến hao phí"""
        feature_names = [
            'chu_ky_lo', 'nhiet_do_lo', 'ap_suat_lo', 
            'do_am_nguyen_lieu', 'toc_do_day_chuyen',
            'san_luong_gio_truoc', 'ty_le_loi_gio_truoc',
            'gio_trong_ngay', 'ngay_trong_tuan', 'thoi_gian_tu_bao_duong'
        ]
        
        importance = {}
        for name, score in zip(feature_names, self.model_lo.feature_importances_):
            importance[name] = float(score)
        
        return dict(sorted(importance.items(), key=lambda x: x[-1], reverse=True))


class AnomalyDetectionSystem:
    """
    ML Model 2: PHÁT HIỆN BẤT THƯỜNG
    Phát hiện anomaly trong quy trình sản xuất:
    - Hao phí đột ngột tăng cao
    - Sản lượng giảm bất thường
    - Sensor readings bất thường
    """
    
    def __init__(self):
        self.model = IsolationForest(
            contamination=0.05,  # 5% dữ liệu là anomaly
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def train(self, normal_data: pd.DataFrame):
        """Train với dữ liệu hoạt động bình thường"""
        features = normal_data[[
            'sl_ep', 'ty_le_hp_moc', 'ty_le_hp_lo', 'ty_le_hp_ht',
            'nhiet_do_lo', 'ap_suat_lo', 'toc_do_day_chuyen'
        ]].values
        
        X = self.scaler.fit_transform(features)
        self.model.fit(X)
        self.is_trained = True
        print("✓ Anomaly Detection trained successfully")
    
    def detect_anomaly(self, current_data: Dict) -> Dict:
        """
        Kiểm tra dữ liệu hiện tại có bất thường không
        
        Returns:
            {
                'is_anomaly': True/False,
                'anomaly_score': -0.15,  # < 0 = anomaly
                'severity': 'high/medium/low',
                'possible_causes': [...]
            }
        """
        if not self.is_trained:
            raise ValueError("Model chưa được train!")
        
        df = pd.DataFrame([current_data])
        X = self.scaler.transform(df.values)
        
        prediction = self.model.predict(X)[0]  # 1 = normal, -1 = anomaly
        score = self.model.score_samples(X)[0]
        
        is_anomaly = prediction == -1
        
        # Phân loại mức độ nghiêm trọng
        if score < -0.3:
            severity = 'high'
        elif score < -0.1:
            severity = 'medium'
        else:
            severity = 'low'
        
        # Phân tích nguyên nhân
        possible_causes = self._analyze_causes(current_data)
        
        return {
            'is_anomaly': bool(is_anomaly),
            'anomaly_score': float(score),
            'severity': severity,
            'possible_causes': possible_causes,
            'timestamp': datetime.now().isoformat()
        }
    
    def _analyze_causes(self, data: Dict) -> List[str]:
        """Phân tích nguyên nhân có thể của anomaly"""
        causes = []
        
        if data.get('ty_le_hp_moc', 0) > 5:
            causes.append("Hao phí mộc cao bất thường - Kiểm tra máy ép và nguyên liệu")
        
        if data.get('ty_le_hp_lo', 0) > 3:
            causes.append("Hao phí lò cao - Kiểm tra nhiệt độ và chu kỳ nung")
        
        if data.get('nhiet_do_lo', 0) > 1250 or data.get('nhiet_do_lo', 0) < 1150:
            causes.append("Nhiệt độ lò ngoài phạm vi tối ưu")
        
        if data.get('sl_ep', 0) < 5000:
            causes.append("Sản lượng thấp - Có thể có sự cố dây chuyền")
        
        return causes if causes else ["Không xác định được nguyên nhân rõ ràng"]


class QualityPredictionLSTM:
    """
    Deep Learning Model 3: DỰ ĐOÁN CHẤT LƯỢNG SẢN PHẨM
    Sử dụng LSTM để dự đoán tỷ lệ A1/A2/Phế dựa trên time series
    """
    
    def __init__(self, sequence_length=24):  # 24 giờ
        self.sequence_length = sequence_length
        self.model = None
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()
        self.is_trained = False
    
    def build_model(self, n_features):
        """Xây dựng LSTM model"""
        model = keras.Sequential([
            keras.layers.LSTM(64, return_sequences=True, input_shape=(self.sequence_length, n_features)),
            keras.layers.Dropout(0.2),
            keras.layers.LSTM(32, return_sequences=False),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(16, activation='relu'),
            keras.layers.Dense(3)  # Output: [ty_le_a1, ty_le_a2, ty_le_pe]
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def prepare_sequences(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Chuẩn bị sequences cho LSTM"""
        features = data[[
            'chu_ky_lo', 'nhiet_do_lo', 'do_am_nguyen_lieu',
            'toc_do_day_chuyen', 'ty_le_hp_moc', 'ty_le_hp_lo'
        ]].values
        
        targets = data[['ty_le_a1', 'ty_le_a2', 'ty_le_pe1']].values
        
        X, y = [], []
        for i in range(len(features) - self.sequence_length):
            X.append(features[i:i+self.sequence_length])
            y.append(targets[i+self.sequence_length])
        
        return np.array(X), np.array(y)
    
    def train(self, historical_data: pd.DataFrame, epochs=50):
        """Train LSTM model"""
        X, y = self.prepare_sequences(historical_data)
        
        # Normalize
        X = X.reshape(-1, X.shape[-1])
        X = self.scaler_X.fit_transform(X)
        X = X.reshape(-1, self.sequence_length, X.shape[-1])
        
        y = self.scaler_y.fit_transform(y)
        
        # Build and train
        self.model = self.build_model(X.shape[-1])
        
        self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=32,
            validation_split=0.2,
            verbose=0
        )
        
        self.is_trained = True
        print("✓ Quality Prediction LSTM trained successfully")
    
    def predict(self, recent_data: pd.DataFrame) -> Dict[str, float]:
        """
        Dự đoán chất lượng sản phẩm dựa trên dữ liệu gần đây
        
        Args:
            recent_data: DataFrame chứa 24 giờ gần nhất
        
        Returns:
            {
                'ty_le_a1_predicted': 86.5,
                'ty_le_a2_predicted': 7.2,
                'ty_le_pe_predicted': 2.3,
                'confidence': 0.85
            }
        """
        if not self.is_trained:
            raise ValueError("Model chưa được train!")
        
        X, _ = self.prepare_sequences(recent_data)
        X = X[-1:].reshape(-1, X.shape[-1])
        X = self.scaler_X.transform(X)
        X = X.reshape(1, self.sequence_length, -1)
        
        prediction = self.model.predict(X, verbose=0)[0]
        prediction = self.scaler_y.inverse_transform([prediction])[0]
        
        return {
            'ty_le_a1_predicted': float(prediction[0]),
            'ty_le_a2_predicted': float(prediction[1]),
            'ty_le_pe_predicted': float(prediction[2]),
            'confidence': 0.85  # TODO: Calculate actual confidence
        }


class OptimalParameterRecommender:
    """
    ML Model 4: TỐI ƯU HÓA THAM SỐ SẢN XUẤT
    Gợi ý tham số tối ưu để đạt:
    - Tỷ lệ A1 cao nhất
    - Hao phí thấp nhất
    - Sản lượng cao nhất
    """
    
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=200, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def train(self, data: pd.DataFrame):
        """
        Train với dữ liệu lịch sử
        Target: Composite score = ty_le_a1 - (ty_le_hp_total * 2)
        """
        features = data[[
            'chu_ky_lo', 'nhiet_do_lo', 'ap_suat_lo',
            'do_am_nguyen_lieu', 'toc_do_day_chuyen'
        ]].values
        
        # Tạo composite score: ưu tiên A1 cao, hao phí thấp
        target = (
            data['ty_le_a1'] - 
            (data['ty_le_hp_moc'] + data['ty_le_hp_lo'] + data['ty_le_hp_ht']) * 2
        ).values
        
        X = self.scaler.fit_transform(features)
        self.model.fit(X, target)
        self.is_trained = True
        print("✓ Parameter Optimizer trained successfully")
    
    def recommend_parameters(self, product_type: str, constraints: Dict = None) -> Dict:
        """
        Gợi ý tham số tối ưu
        
        Args:
            product_type: "600x600mm Porcelain", ...
            constraints: {'chu_ky_lo': (40, 50), 'nhiet_do_lo': (1180, 1220)}
        
        Returns:
            {
                'chu_ky_lo': 45,
                'nhiet_do_lo': 1200,
                'ap_suat_lo': 2.5,
                'do_am_nguyen_lieu': 6.5,
                'toc_do_day_chuyen': 12.5,
                'expected_a1_rate': 87.5,
                'expected_defect_rate': 4.2
            }
        """
        if not self.is_trained:
            raise ValueError("Model chưa được train!")
        
        # Grid search trong phạm vi constraints
        if constraints is None:
            constraints = {
                'chu_ky_lo': (40, 55),
                'nhiet_do_lo': (1150, 1230),
                'ap_suat_lo': (2.0, 3.0),
                'do_am_nguyen_lieu': (5.5, 7.5),
                'toc_do_day_chuyen': (10, 15)
            }
        
        # Tạo grid
        best_score = -float('inf')
        best_params = None
        
        for chu_ky in range(constraints['chu_ky_lo'][0], constraints['chu_ky_lo'][1], 1):
            for nhiet_do in range(constraints['nhiet_do_lo'][0], constraints['nhiet_do_lo'][1], 5):
                for ap_suat in np.arange(constraints['ap_suat_lo'][0], constraints['ap_suat_lo'][1], 0.1):
                    for do_am in np.arange(constraints['do_am_nguyen_lieu'][0], constraints['do_am_nguyen_lieu'][1], 0.5):
                        for toc_do in np.arange(constraints['toc_do_day_chuyen'][0], constraints['toc_do_day_chuyen'][1], 0.5):
                            
                            X = np.array([[chu_ky, nhiet_do, ap_suat, do_am, toc_do]])
                            X_scaled = self.scaler.transform(X)
                            score = self.model.predict(X_scaled)[0]
                            
                            if score > best_score:
                                best_score = score
                                best_params = {
                                    'chu_ky_lo': int(chu_ky),
                                    'nhiet_do_lo': int(nhiet_do),
                                    'ap_suat_lo': round(float(ap_suat), 2),
                                    'do_am_nguyen_lieu': round(float(do_am), 2),
                                    'toc_do_day_chuyen': round(float(toc_do), 2)
                                }
        
        # Dự đoán kết quả với params tối ưu
        best_params['expected_a1_rate'] = 86.5  # TODO: Calculate from DefectPredictionModel
        best_params['expected_defect_rate'] = 4.2
        
        return best_params


class MaintenancePredictorSystem:
    """
    ML Model 5: DỰ ĐOÁN BẢO DƯỠNG
    Predictive Maintenance - dự đoán khi nào cần bảo dưỡng
    """
    
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def train(self, maintenance_history: pd.DataFrame):
        """
        Train với lịch sử bảo dưỡng
        
        Features:
        - thoi_gian_hoat_dong: giờ
        - tong_san_luong: viên
        - so_lan_su_co: lần
        - ty_le_loi_trung_binh: %
        """
        X = maintenance_history[[
            'thoi_gian_hoat_dong', 'tong_san_luong',
            'so_lan_su_co', 'ty_le_loi_trung_binh'
        ]].values
        
        y = maintenance_history['ngay_den_bao_duong'].values
        
        X = self.scaler.fit_transform(X)
        self.model.fit(X, y)
        self.is_trained = True
        print("✓ Maintenance Predictor trained successfully")
    
    def predict_maintenance(self, equipment_data: Dict) -> Dict:
        """
        Dự đoán thời gian cần bảo dưỡng
        
        Returns:
            {
                'days_until_maintenance': 7,
                'confidence': 0.82,
                'urgency': 'medium',
                'recommended_actions': [...]
            }
        """
        df = pd.DataFrame([equipment_data])
        X = self.scaler.transform(df.values)
        days = self.model.predict(X)[0]
        
        if days < 3:
            urgency = 'high'
        elif days < 7:
            urgency = 'medium'
        else:
            urgency = 'low'
        
        return {
            'days_until_maintenance': int(days),
            'confidence': 0.82,
            'urgency': urgency,
            'recommended_actions': self._get_recommendations(urgency)
        }
    
    def _get_recommendations(self, urgency: str) -> List[str]:
        if urgency == 'high':
            return [
                "Lên lịch bảo dưỡng NGAY trong 1-2 ngày tới",
                "Kiểm tra chi tiết các bộ phận quan trọng",
                "Chuẩn bị phụ tùng thay thế"
            ]
        elif urgency == 'medium':
            return [
                "Lên kế hoạch bảo dưỡng trong tuần này",
                "Giám sát hoạt động chặt chẽ"
            ]
        else:
            return ["Theo dõi định kỳ"]


# ==================== INTEGRATION CLASS ====================

class AIProductionSystem:
    """Hệ thống tổng hợp tất cả ML/AI models"""
    
    def __init__(self):
        self.defect_predictor = DefectPredictionModel()
        self.anomaly_detector = AnomalyDetectionSystem()
        self.quality_predictor = QualityPredictionLSTM()
        self.parameter_optimizer = OptimalParameterRecommender()
        self.maintenance_predictor = MaintenancePredictorSystem()
        
    def full_analysis(self, current_data: Dict, historical_data: pd.DataFrame) -> Dict:
        """
        Phân tích toàn diện và đưa ra khuyến nghị
        """
        results = {
            'timestamp': datetime.now().isoformat(),
            'current_status': {},
            'predictions': {},
            'anomalies': {},
            'recommendations': {}
        }
        
        # 1. Dự đoán hao phí
        if self.defect_predictor.is_trained:
            results['predictions']['defects'] = self.defect_predictor.predict(current_data)
        
        # 2. Phát hiện anomaly
        if self.anomaly_detector.is_trained:
            results['anomalies'] = self.anomaly_detector.detect_anomaly(current_data)
        
        # 3. Dự đoán chất lượng
        if self.quality_predictor.is_trained:
            results['predictions']['quality'] = self.quality_predictor.predict(historical_data.tail(24))
        
        # 4. Tối ưu tham số
        if self.parameter_optimizer.is_trained:
            results['recommendations']['optimal_params'] = self.parameter_optimizer.recommend_parameters(
                current_data.get('product_type', '')
            )
        
        return results


# ==================== EXAMPLE USAGE ====================

if __name__ == "__main__":
    print("=== AI PRODUCTION SYSTEM DEMO ===\n")
    
    # Tạo dữ liệu mẫu
    np.random.seed(42)
    n_samples = 1000
    
    historical_data = pd.DataFrame({
        'chu_ky_lo': np.random.randint(40, 55, n_samples),
        'nhiet_do_lo': np.random.randint(1150, 1230, n_samples),
        'ap_suat_lo': np.random.uniform(2.0, 3.0, n_samples),
        'do_am_nguyen_lieu': np.random.uniform(5.5, 7.5, n_samples),
        'toc_do_day_chuyen': np.random.uniform(10, 15, n_samples),
        'san_luong_gio_truoc': np.random.randint(500, 1000, n_samples),
        'ty_le_loi_gio_truoc': np.random.uniform(0, 5, n_samples),
        'gio_trong_ngay': np.random.randint(0, 24, n_samples),
        'ngay_trong_tuan': np.random.randint(0, 7, n_samples),
        'thoi_gian_tu_bao_duong': np.random.randint(1, 30, n_samples),
        'ty_le_hp_moc': np.random.uniform(1, 4, n_samples),
        'ty_le_hp_lo': np.random.uniform(0.5, 3, n_samples),
        'ty_le_hp_ht': np.random.uniform(0.5, 2, n_samples),
        'ty_le_a1': np.random.uniform(82, 90, n_samples),
        'ty_le_a2': np.random.uniform(5, 10, n_samples),
        'ty_le_pe1': np.random.uniform(1, 3, n_samples),
        'sl_ep': np.random.randint(8000, 12000, n_samples),
    })
    
    # Khởi tạo hệ thống
    ai_system = AIProductionSystem()
    
    # Train models
    print("Training ML models...")
    ai_system.defect_predictor.train(historical_data)
    ai_system.anomaly_detector.train(historical_data)
    ai_system.parameter_optimizer.train(historical_data)
    
    print("\n=== TEST PREDICTIONS ===\n")
    
    # Test dự đoán
    test_conditions = {
        'chu_ky_lo': 48,
        'nhiet_do_lo': 1200,
        'ap_suat_lo': 2.5,
        'do_am_nguyen_lieu': 6.5,
        'toc_do_day_chuyen': 12.0,
        'san_luong_gio_truoc': 800,
        'ty_le_loi_gio_truoc': 2.0,
        'gio_trong_ngay': 14,
        'ngay_trong_tuan': 3,
        'thoi_gian_tu_bao_duong': 10
    }
    
    # 1. Dự đoán hao phí
    defects = ai_system.defect_predictor.predict(test_conditions)
    print("Dự đoán Hao Phí:")
    print(f"  - Hao phí mộc: {defects['hp_moc_predicted']:.2f}%")
    print(f"  - Hao phí lò: {defects['hp_lo_predicted']:.2f}%")
    print(f"  - Hao phí hoàn thiện: {defects['hp_ht_predicted']:.2f}%")
    print(f"  - Tổng: {defects['total_defect_rate']:.2f}%\n")
    
    # 2. Feature importance
    importance = ai_system.defect_predictor.get_feature_importance()
    print("Top 5 yếu tố ảnh hưởng đến hao phí:")
    for i, (feature, score) in enumerate(list(importance.items())[:5], 1):
        print(f"  {i}. {feature}: {score:.3f}")
    
    # 3. Phát hiện anomaly
    anomaly_test = {
        **test_conditions,
        'sl_ep': 10000,
        'ty_le_hp_moc': 2.0,
        'ty_le_hp_lo': 1.5,
        'ty_le_hp_ht': 1.0
    }
    
    anomaly_result = ai_system.anomaly_detector.detect_anomaly(anomaly_test)
    print(f"\nPhát hiện bất thường: {anomaly_result['is_anomaly']}")
    print(f"Mức độ: {anomaly_result['severity']}")
    print(f"Score: {anomaly_result['anomaly_score']:.3f}")
    
    # 4. Tối ưu tham số
    optimal = ai_system.parameter_optimizer.recommend_parameters("600x600mm Porcelain")
    print("\nTham số sản xuất tối ưu:")
    print(f"  - Chu kỳ lò: {optimal['chu_ky_lo']} phút")
    print(f"  - Nhiệt độ lò: {optimal['nhiet_do_lo']}°C")
    print(f"  - Áp suất lò: {optimal['ap_suat_lo']} bar")
    print(f"  - Độ ẩm nguyên liệu: {optimal['do_am_nguyen_lieu']}%")
    print(f"  - Tốc độ dây chuyền: {optimal['toc_do_day_chuyen']} m/phút")
    print(f"  => Tỷ lệ A1 dự kiến: {optimal['expected_a1_rate']:.1f}%")
    print(f"  => Hao phí dự kiến: {optimal['expected_defect_rate']:.1f}%")
    
    print("\n" + "="*50)
    print("✓ Demo completed successfully!")