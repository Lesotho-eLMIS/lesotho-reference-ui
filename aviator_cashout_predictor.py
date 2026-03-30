import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score
import joblib
import json
import time
from datetime import datetime
from collections import deque
import requests
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

class AviatorCashoutPredictor:
    """
    AI system to predict optimal cashout timing in Aviator crash game
    Uses pattern recognition, risk analysis, and machine learning
    """
    
    def __init__(self):
        self.models = {
            'crash_point': RandomForestRegressor(n_estimators=100, random_state=42),
            'risk_classifier': GradientBoostingClassifier(n_estimators=100, random_state=42),
            'optimal_cashout': RandomForestRegressor(n_estimators=100, random_state=42)
        }
        self.scalers = {}
        self.feature_columns = []
        self.is_trained = False
        
        # Game history tracking
        self.game_history = deque(maxlen=1000)  # Last 1000 games
        self.recent_pattern = deque(maxlen=50)  # Last 50 games for pattern analysis
        self.multipliers_history = deque(maxlen=100)  # Recent multipliers
        
        # Risk parameters
        self.risk_threshold = 0.65  # Risk tolerance level
        self.min_profit_multiplier = 1.5  # Minimum safe cashout
        self.max_risk_games = 3  # Max consecutive high-risk games
        
    def generate_sample_game_data(self, n_games: int = 5000) -> pd.DataFrame:
        """
        Generate realistic Aviator game data for training
        """
        np.random.seed(42)
        games = []
        
        for i in range(n_games):
            # Simulate realistic crash patterns
            base_crash = np.random.exponential(2.0)  # Most crashes happen early
            crash_multiplier = max(1.0, min(100.0, base_crash))
            
            # Add some pattern-based variations
            if i > 0 and i % 7 == 0:  # Weekly pattern
                crash_multiplier *= np.random.uniform(0.8, 1.3)
            
            if i % 13 == 0:  # Special pattern
                crash_multiplier *= np.random.uniform(1.5, 3.0)
            
            # Game characteristics
            game_time = datetime.now().timestamp() - (n_games - i) * 60
            player_count = np.random.randint(50, 500)
            total_bets = player_count * np.random.uniform(10, 1000)
            
            # Previous game context
            if len(games) > 0:
                prev_crash = games[-1]['crash_multiplier']
                prev_avg_crash = np.mean([g['crash_multiplier'] for g in games[-5:]])
                trend = 'up' if crash_multiplier > prev_avg_crash else 'down'
            else:
                prev_crash = 1.0
                prev_avg_crash = 2.0
                trend = 'neutral'
            
            # Calculate optimal cashout points
            safe_cashout = min(crash_multiplier * 0.8, self.min_profit_multiplier)
            optimal_cashout = min(crash_multiplier * 0.9, 3.0)
            
            games.append({
                'game_id': f'AVI{i:06d}',
                'timestamp': game_time,
                'crash_multiplier': crash_multiplier,
                'safe_cashout_point': safe_cashout,
                'optimal_cashout_point': optimal_cashout,
                'player_count': player_count,
                'total_bets': total_bets,
                'previous_crash': prev_crash,
                'avg_previous_5': prev_avg_crash,
                'trend': trend,
                'time_of_day': i % 24,
                'day_of_week': i % 7,
                'consecutive_high_risk': np.random.randint(0, 5),
                'volatility_index': np.random.uniform(0.1, 1.0)
            })
        
        return pd.DataFrame(games)
    
    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract advanced features for prediction
        """
        features = df.copy()
        
        # Time-based features
        features['hour_sin'] = np.sin(2 * np.pi * features['time_of_day'] / 24)
        features['hour_cos'] = np.cos(2 * np.pi * features['time_of_day'] / 24)
        features['day_sin'] = np.sin(2 * np.pi * features['day_of_week'] / 7)
        features['day_cos'] = np.cos(2 * np.pi * features['day_of_week'] / 7)
        
        # Statistical features
        features['crash_ma_3'] = features['crash_multiplier'].rolling(3, min_periods=1).mean()
        features['crash_ma_5'] = features['crash_multiplier'].rolling(5, min_periods=1).mean()
        features['crash_std_5'] = features['crash_multiplier'].rolling(5, min_periods=1).std()
        features['crash_range_5'] = features['crash_ma_5'] - features['crash_ma_3']
        
        # Pattern features
        features['trend_up'] = (features['trend'] == 'up').astype(int)
        features['trend_down'] = (features['trend'] == 'down').astype(int)
        features['trend_neutral'] = (features['trend'] == 'neutral').astype(int)
        
        # Risk indicators
        features['high_risk'] = (features['crash_multiplier'] < 1.5).astype(int)
        features['medium_risk'] = ((features['crash_multiplier'] >= 1.5) & 
                                (features['crash_multiplier'] < 3.0)).astype(int)
        features['low_risk'] = (features['crash_multiplier'] >= 3.0).astype(int)
        
        # Market features
        features['bets_per_player'] = features['total_bets'] / features['player_count']
        features['player_density'] = features['player_count'] / 1000  # Normalized
        
        # Lag features
        features['prev_1_crash'] = features['crash_multiplier'].shift(1)
        features['prev_2_crash'] = features['crash_multiplier'].shift(2)
        features['prev_3_crash'] = features['crash_multiplier'].shift(3)
        
        # Fill NaN values
        features = features.fillna(method='bfill').fillna(0)
        
        return features
    
    def train_models(self, data: pd.DataFrame):
        """
        Train prediction models on historical game data
        """
        print("Extracting features for training...")
        df_features = self.extract_features(data)
        
        # Define feature columns (exclude target variables)
        exclude_columns = ['game_id', 'timestamp', 'crash_multiplier', 
                         'safe_cashout_point', 'optimal_cashout_point']
        self.feature_columns = [col for col in df_features.columns if col not in exclude_columns]
        
        X = df_features[self.feature_columns]
        
        # Train models for different predictions
        targets = {
            'crash_point': df_features['crash_multiplier'],
            'optimal_cashout': df_features['optimal_cashout_point'],
            'risk_classifier': df_features['high_risk']  # Binary classification
        }
        
        for model_name, model in self.models.items():
            print(f"Training {model_name} model...")
            y = targets[model_name]
            
            # Remove rows with NaN in target
            valid_idx = ~y.isna()
            X_train, y_train = X[valid_idx], y[valid_idx]
            
            # Split data
            X_train_split, X_test, y_train_split, y_test = train_test_split(
                X_train, y_train, test_size=0.2, random_state=42
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train_split)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model.fit(X_train_scaled, y_train_split)
            
            # Store scaler
            self.scalers[model_name] = scaler
            
            # Evaluate model
            y_pred = model.predict(X_test_scaled)
            
            if model_name == 'risk_classifier':
                accuracy = accuracy_score(y_test, y_pred.round())
                precision = precision_score(y_test, y_pred.round())
                recall = recall_score(y_test, y_pred.round())
                print(f"Risk Classifier - Accuracy: {accuracy:.3f}, Precision: {precision:.3f}, Recall: {recall:.3f}")
            else:
                mae = np.mean(np.abs(y_test - y_pred))
                mse = np.mean((y_test - y_pred) ** 2)
                print(f"{model_name.title()} Model - MAE: {mae:.3f}, MSE: {mse:.3f}")
        
        self.is_trained = True
        print("All models trained successfully!")
    
    def predict_cashout_point(self, current_game_data: Dict) -> Dict:
        """
        Predict optimal cashout point for current game
        """
        if not self.is_trained:
            raise ValueError("Models must be trained before making predictions")
        
        # Convert to DataFrame
        df_input = pd.DataFrame([current_game_data])
        
        # Extract features
        df_features = self.extract_features(df_input)
        
        # Ensure all required columns exist
        for col in self.feature_columns:
            if col not in df_features.columns:
                df_features[col] = 0
        
        X = df_features[self.feature_columns]
        
        predictions = {}
        
        # Make predictions
        for model_name, model in self.models.items():
            scaler = self.scalers[model_name]
            X_scaled = scaler.transform(X)
            
            pred = model.predict(X_scaled)[0]
            
            if model_name == 'crash_point':
                predictions['predicted_crash'] = max(1.0, pred)
            elif model_name == 'optimal_cashout':
                predictions['recommended_cashout'] = max(1.0, pred)
            elif model_name == 'risk_classifier':
                risk_prob = model.predict_proba(X_scaled)[0] if hasattr(model, 'predict_proba') else [0.5, 0.5]
                predictions['risk_level'] = 'HIGH' if risk_prob[1] > 0.6 else 'MEDIUM' if risk_prob[1] > 0.3 else 'LOW'
                predictions['risk_score'] = risk_prob[1]
        
        # Calculate safety recommendations
        predicted_crash = predictions['predicted_crash']
        recommended_cashout = predictions['recommended_cashout']
        
        # Safety margins
        conservative_cashout = min(predicted_crash * 0.7, 2.0)
        moderate_cashout = min(predicted_crash * 0.8, 3.0)
        aggressive_cashout = min(predicted_crash * 0.9, 5.0)
        
        predictions.update({
            'conservative_cashout': conservative_cashout,
            'moderate_cashout': moderate_cashout,
            'aggressive_cashout': aggressive_cashout,
            'confidence': self._calculate_confidence(predictions),
            'recommendation': self._get_recommendation(predictions, current_game_data)
        })
        
        return predictions
    
    def _calculate_confidence(self, predictions: Dict) -> float:
        """
        Calculate prediction confidence based on model consensus
        """
        crash_pred = predictions['predicted_crash']
        cashout_pred = predictions['recommended_cashout']
        
        # Consistency check
        consistency = 1.0 - abs(crash_pred - cashout_pred) / crash_pred
        
        # Risk adjustment
        risk_penalty = predictions['risk_score'] if predictions['risk_score'] > 0.7 else 0
        
        confidence = max(0.1, min(0.95, consistency - risk_penalty * 0.3))
        return confidence
    
    def _get_recommendation(self, predictions: Dict, game_data: Dict) -> str:
        """
        Generate cashout recommendation based on risk and predictions
        """
        risk_level = predictions['risk_level']
        confidence = predictions['confidence']
        
        if risk_level == 'HIGH' or confidence < 0.5:
            return f"CASHOUT NOW at {predictions['conservative_cashout']:.2f}x - HIGH RISK!"
        elif risk_level == 'MEDIUM' or confidence < 0.7:
            return f"Cashout at {predictions['moderate_cashout']:.2f}x - Moderate risk"
        else:
            return f"Consider {predictions['aggressive_cashout']:.2f}x - Lower risk detected"
    
    def update_game_history(self, game_result: Dict):
        """
        Update history with actual game results
        """
        self.game_history.append(game_result)
        self.recent_pattern.append(game_result['crash_multiplier'])
        self.multipliers_history.append(game_result['crash_multiplier'])
    
    def get_current_pattern_analysis(self) -> Dict:
        """
        Analyze recent game patterns
        """
        if len(self.recent_pattern) < 10:
            return {"status": "insufficient_data"}
        
        recent = list(self.recent_pattern)
        
        # Pattern statistics
        avg_crash = np.mean(recent)
        std_crash = np.std(recent)
        trend_slope = np.polyfit(range(len(recent)), recent, 1)[0]
        
        # Pattern detection
        low_crash_freq = sum(1 for x in recent if x < 1.5) / len(recent)
        high_crash_freq = sum(1 for x in recent if x > 3.0) / len(recent)
        
        return {
            'avg_crash': avg_crash,
            'std_crash': std_crash,
            'trend': 'increasing' if trend_slope > 0 else 'decreasing' if trend_slope < 0 else 'stable',
            'low_crash_frequency': low_crash_freq,
            'high_crash_frequency': high_crash_freq,
            'pattern_strength': 'strong' if std_crash < 0.5 else 'moderate' if std_crash < 1.0 else 'weak'
        }
    
    def get_real_time_prediction(self, live_game_data: Dict) -> Dict:
        """
        Get real-time prediction for live game
        """
        base_prediction = self.predict_cashout_point(live_game_data)
        
        # Add real-time adjustments
        current_multiplier = live_game_data.get('current_multiplier', 1.0)
        time_elapsed = live_game_data.get('time_elapsed', 0)
        
        # Dynamic adjustments
        if current_multiplier > 2.0:
            # Already in profit zone - consider cashing out
            base_prediction['recommendation'] = f"CASHOUT NOW at {current_multiplier:.2f}x - Good profit achieved!"
        
        if time_elapsed > 10:  # Game running long
            base_prediction['recommendation'] = f"CASHOUT NOW - Game running unusually long"
        
        return base_prediction
    
    def save_models(self, filepath: str):
        """
        Save trained models
        """
        model_data = {
            'models': self.models,
            'scalers': self.scalers,
            'feature_columns': self.feature_columns,
            'is_trained': self.is_trained,
            'risk_threshold': self.risk_threshold,
            'min_profit_multiplier': self.min_profit_multiplier
        }
        joblib.dump(model_data, filepath)
        print(f"Models saved to {filepath}")
    
    def load_models(self, filepath: str):
        """
        Load pre-trained models
        """
        model_data = joblib.load(filepath)
        self.models = model_data['models']
        self.scalers = model_data['scalers']
        self.feature_columns = model_data['feature_columns']
        self.is_trained = model_data['is_trained']
        self.risk_threshold = model_data.get('risk_threshold', 0.65)
        self.min_profit_multiplier = model_data.get('min_profit_multiplier', 1.5)
        print(f"Models loaded from {filepath}")


def main():
    """
    Main execution function
    """
    print("🛩️ Aviator Cashout AI Predictor Starting...")
    print("=" * 50)
    
    # Initialize predictor
    predictor = AviatorCashoutPredictor()
    
    # Load and train on historical data
    print("Loading historical game data...")
    historical_data = predictor.generate_sample_game_data(5000)
    
    print(f"Loaded {len(historical_data)} game records")
    print("\nSample game data:")
    print(historical_data[['crash_multiplier', 'safe_cashout_point', 'optimal_cashout_point']].head(10))
    
    # Train models
    print("\nTraining AI models...")
    predictor.train_models(historical_data)
    
    # Save models
    predictor.save_models('aviator_cashout_models.joblib')
    
    # Example predictions
    print("\n" + "=" * 50)
    print("🎯 LIVE PREDICTION EXAMPLES")
    print("=" * 50)
    
    # Simulate current game scenarios
    test_scenarios = [
        {
            'game_id': 'LIVE001',
            'time_of_day': 14,
            'day_of_week': 2,
            'player_count': 250,
            'total_bets': 50000,
            'previous_crash': 1.85,
            'avg_previous_5': 2.1,
            'trend': 'down',
            'consecutive_high_risk': 2,
            'volatility_index': 0.6,
            'current_multiplier': 1.5,
            'time_elapsed': 5
        },
        {
            'game_id': 'LIVE002',
            'time_of_day': 20,
            'day_of_week': 5,
            'player_count': 450,
            'total_bets': 85000,
            'previous_crash': 3.2,
            'avg_previous_5': 2.8,
            'trend': 'up',
            'consecutive_high_risk': 0,
            'volatility_index': 0.3,
            'current_multiplier': 2.8,
            'time_elapsed': 8
        }
    ]
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n🎮 Live Game {i}: {scenario['game_id']}")
        print("-" * 40)
        
        prediction = predictor.get_real_time_prediction(scenario)
        
        print(f"📍 Predicted Crash Point: {prediction['predicted_crash']:.2f}x")
        print(f"💰 Recommended Cashout: {prediction['recommended_cashout']:.2f}x")
        print(f"🛡️ Conservative: {prediction['conservative_cashout']:.2f}x")
        print(f"⚖️ Moderate: {prediction['moderate_cashout']:.2f}x")
        print(f"🚀 Aggressive: {prediction['aggressive_cashout']:.2f}x")
        print(f"📊 Risk Level: {prediction['risk_level']}")
        print(f"🎯 Confidence: {prediction['confidence']:.1%}")
        print(f"💡 Recommendation: {prediction['recommendation']}")
    
    # Pattern analysis
    print(f"\n{'='*50}")
    print("📈 PATTERN ANALYSIS")
    print("="*50)
    
    # Simulate some game history
    for i in range(20):
        predictor.update_game_history({
            'game_id': f'HIST{i:03d}',
            'crash_multiplier': np.random.exponential(2.0) + 1.0,
            'timestamp': time.time()
        })
    
    pattern_analysis = predictor.get_current_pattern_analysis()
    print(f"Average Crash: {pattern_analysis['avg_crash']:.2f}x")
    print(f"Pattern Strength: {pattern_analysis['pattern_strength']}")
    print(f"Trend: {pattern_analysis['trend']}")
    print(f"Low Crash Frequency: {pattern_analysis['low_crash_frequency']:.1%}")
    print(f"High Crash Frequency: {pattern_analysis['high_crash_frequency']:.1%}")
    
    # Export predictions
    export_data = {
        'predictions': [predictor.get_real_time_prediction(scenario) for scenario in test_scenarios],
        'pattern_analysis': pattern_analysis,
        'timestamp': datetime.now().isoformat(),
        'model_info': {
            'trained': predictor.is_trained,
            'risk_threshold': predictor.risk_threshold,
            'min_profit_multiplier': predictor.min_profit_multiplier
        }
    }
    
    with open('aviator_predictions.json', 'w') as f:
        json.dump(export_data, f, indent=2)
    
    print(f"\n📁 Predictions exported to aviator_predictions.json")
    print("\n🎯 AI System Ready for Live Prediction!")
    print("=" * 50)


if __name__ == "__main__":
    main()
