import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
from datetime import datetime, timedelta
import json
import requests
from typing import Dict, List, Tuple, Optional

class FlightDropOffPredictor:
    """
    AI system to predict next flight plane drop-off locations and times
    based on historical flight data, weather conditions, and logistics patterns.
    """
    
    def __init__(self):
        self.models = {
            'location': RandomForestRegressor(n_estimators=100, random_state=42),
            'time': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'probability': RandomForestRegressor(n_estimators=100, random_state=42)
        }
        self.scalers = {}
        self.feature_columns = []
        self.is_trained = False
        
    def load_historical_data(self, data_source: str = None) -> pd.DataFrame:
        """
        Load historical flight drop-off data
        """
        if data_source and data_source.startswith('http'):
            # Load from API
            response = requests.get(data_source)
            data = pd.DataFrame(response.json())
        else:
            # Generate sample data for demonstration
            data = self._generate_sample_data()
        
        return data
    
    def _generate_sample_data(self, n_samples: int = 1000) -> pd.DataFrame:
        """
        Generate sample flight drop-off data for demonstration
        """
        np.random.seed(42)
        
        # Generate realistic flight patterns
        base_airports = ['JHB', 'CPT', 'DUR', 'PLZ', 'ELS', 'GRJ']
        drop_locations = ['Maseru', 'Mokhotlong', 'Berea', 'Leribe', 'Quthing', 'Qachas Nek']
        
        data = []
        for i in range(n_samples):
            # Time-based patterns
            hour = np.random.randint(6, 18)  # Flight hours 6AM-6PM
            day_of_week = np.random.randint(0, 7)
            month = np.random.randint(1, 13)
            
            # Flight characteristics
            flight_duration = np.random.normal(2.5, 0.8)  # hours
            cargo_weight = np.random.normal(500, 200)  # kg
            passenger_count = np.random.randint(2, 12)
            
            # Weather conditions
            wind_speed = np.random.normal(15, 8)  # km/h
            visibility = np.random.normal(10, 3)  # km
            precipitation = np.random.choice([0, 0, 0, 1, 2, 5])  # mm
            
            # Previous drop-off patterns
            previous_drop = np.random.choice(drop_locations)
            flights_today = np.random.randint(1, 8)
            
            # Target variables
            next_drop_location = np.random.choice(drop_locations)
            time_to_next_drop = np.random.normal(3.5, 1.2)  # hours
            drop_probability = np.random.random()
            
            data.append({
                'flight_id': f'FLT{i:04d}',
                'origin_airport': np.random.choice(base_airports),
                'hour': hour,
                'day_of_week': day_of_week,
                'month': month,
                'flight_duration': flight_duration,
                'cargo_weight': cargo_weight,
                'passenger_count': passenger_count,
                'wind_speed': wind_speed,
                'visibility': visibility,
                'precipitation': precipitation,
                'previous_drop_location': previous_drop,
                'flights_today': flights_today,
                'next_drop_location_encoded': drop_locations.index(next_drop_location),
                'time_to_next_drop': time_to_next_drop,
                'drop_probability': drop_probability
            })
        
        return pd.DataFrame(data)
    
    def preprocess_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Preprocess and engineer features for prediction
        """
        df_processed = df.copy()
        
        # Time-based features
        df_processed['hour_sin'] = np.sin(2 * np.pi * df_processed['hour'] / 24)
        df_processed['hour_cos'] = np.cos(2 * np.pi * df_processed['hour'] / 24)
        df_processed['day_sin'] = np.sin(2 * np.pi * df_processed['day_of_week'] / 7)
        df_processed['day_cos'] = np.cos(2 * np.pi * df_processed['day_of_week'] / 7)
        df_processed['month_sin'] = np.sin(2 * np.pi * df_processed['month'] / 12)
        df_processed['month_cos'] = np.cos(2 * np.pi * df_processed['month'] / 12)
        
        # Weather features
        df_processed['wind_category'] = pd.cut(df_processed['wind_speed'], 
                                          bins=[0, 10, 20, 30, float('inf')], 
                                          labels=['Calm', 'Moderate', 'Strong', 'Severe'])
        df_processed['visibility_category'] = pd.cut(df_processed['visibility'],
                                              bins=[0, 5, 10, float('inf')],
                                              labels=['Poor', 'Fair', 'Good'])
        
        # Flight efficiency metrics
        df_processed['cargo_per_passenger'] = df_processed['cargo_weight'] / (df_processed['passenger_count'] + 1)
        df_processed['flight_efficiency'] = df_processed['cargo_weight'] / df_processed['flight_duration']
        
        # Categorical encoding
        categorical_columns = ['origin_airport', 'previous_drop_location', 
                           'wind_category', 'visibility_category']
        
        for col in categorical_columns:
            if col in df_processed.columns:
                df_processed = pd.get_dummies(df_processed, columns=[col], prefix=col)
        
        return df_processed
    
    def train_models(self, data: pd.DataFrame):
        """
        Train prediction models
        """
        print("Preprocessing features...")
        df_processed = self.preprocess_features(data)
        
        # Define feature columns (exclude target variables)
        exclude_columns = ['flight_id', 'next_drop_location_encoded', 
                         'time_to_next_drop', 'drop_probability']
        self.feature_columns = [col for col in df_processed.columns if col not in exclude_columns]
        
        X = df_processed[self.feature_columns]
        
        # Train models for different predictions
        targets = {
            'location': df_processed['next_drop_location_encoded'],
            'time': df_processed['time_to_next_drop'],
            'probability': df_processed['drop_probability']
        }
        
        for model_name, model in self.models.items():
            print(f"Training {model_name} model...")
            y = targets[model_name]
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Store scaler
            self.scalers[model_name] = scaler
            
            # Evaluate model
            y_pred = model.predict(X_test_scaled)
            
            if model_name == 'location':
                accuracy = np.mean(np.round(y_pred) == y_test)
                print(f"Location Model Accuracy: {accuracy:.3f}")
            else:
                mae = mean_absolute_error(y_test, y_pred)
                mse = mean_squared_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)
                print(f"{model_name.title()} Model - MAE: {mae:.3f}, MSE: {mse:.3f}, R2: {r2:.3f}")
        
        self.is_trained = True
        print("All models trained successfully!")
    
    def predict_next_drop_off(self, current_flight_data: Dict) -> Dict:
        """
        Predict next drop-off location, time, and probability
        """
        if not self.is_trained:
            raise ValueError("Models must be trained before making predictions")
        
        # Convert to DataFrame
        df_input = pd.DataFrame([current_flight_data])
        
        # Preprocess
        df_processed = self.preprocess_features(df_input)
        
        # Ensure all required columns exist
        for col in self.feature_columns:
            if col not in df_processed.columns:
                df_processed[col] = 0
        
        X = df_processed[self.feature_columns]
        
        predictions = {}
        
        for model_name, model in self.models.items():
            scaler = self.scalers[model_name]
            X_scaled = scaler.transform(X)
            
            pred = model.predict(X_scaled)[0]
            
            if model_name == 'location':
                # Convert back to location name
                drop_locations = ['Maseru', 'Mokhotlong', 'Berea', 'Leribe', 'Quthing', 'Qachas Nek']
                location_idx = int(np.round(pred))
                location_idx = max(0, min(location_idx, len(drop_locations) - 1))
                predictions['next_drop_location'] = drop_locations[location_idx]
                predictions['location_confidence'] = np.max(model.predict_proba(X_scaled)[0]) if hasattr(model, 'predict_proba') else 0.8
            elif model_name == 'time':
                predictions['time_to_next_drop_hours'] = max(0.5, pred)
            elif model_name == 'probability':
                predictions['drop_probability'] = max(0, min(1, pred))
        
        return predictions
    
    def predict_batch(self, flight_data_list: List[Dict]) -> List[Dict]:
        """
        Predict next drop-offs for multiple flights
        """
        return [self.predict_next_drop_off(flight_data) for flight_data in flight_data_list]
    
    def get_optimal_drop_schedule(self, flights: List[Dict], time_window_hours: int = 24) -> Dict:
        """
        Generate optimal drop-off schedule for multiple flights
        """
        predictions = self.predict_batch(flights)
        
        # Sort by drop probability and time
        sorted_predictions = sorted(predictions, 
                             key=lambda x: (-x['drop_probability'], x['time_to_next_drop_hours']))
        
        schedule = {
            'total_flights': len(flights),
            'time_window_hours': time_window_hours,
            'scheduled_drops': [],
            'optimization_score': 0
        }
        
        current_time = 0
        for pred in sorted_predictions:
            if current_time + pred['time_to_next_drop_hours'] <= time_window_hours:
                drop_time = current_time + pred['time_to_next_drop_hours']
                schedule['scheduled_drops'].append({
                    'location': pred['next_drop_location'],
                    'estimated_time': drop_time,
                    'probability': pred['drop_probability'],
                    'confidence': pred.get('location_confidence', 0.8)
                })
                current_time = drop_time
                schedule['optimization_score'] += pred['drop_probability']
        
        return schedule
    
    def save_models(self, filepath: str):
        """
        Save trained models and scalers
        """
        model_data = {
            'models': self.models,
            'scalers': self.scalers,
            'feature_columns': self.feature_columns,
            'is_trained': self.is_trained
        }
        joblib.dump(model_data, filepath)
        print(f"Models saved to {filepath}")
    
    def load_models(self, filepath: str):
        """
        Load pre-trained models and scalers
        """
        model_data = joblib.load(filepath)
        self.models = model_data['models']
        self.scalers = model_data['scalers']
        self.feature_columns = model_data['feature_columns']
        self.is_trained = model_data['is_trained']
        print(f"Models loaded from {filepath}")


def main():
    """
    Main execution function
    """
    print("Initializing Flight Drop-Off Predictor AI System...")
    
    # Initialize predictor
    predictor = FlightDropOffPredictor()
    
    # Load and train on historical data
    print("Loading historical flight data...")
    historical_data = predictor.load_historical_data()
    
    print(f"Loaded {len(historical_data)} flight records")
    print("\nSample data:")
    print(historical_data.head())
    
    # Train models
    print("\nTraining AI models...")
    predictor.train_models(historical_data)
    
    # Save models
    predictor.save_models('flight_drop_off_models.joblib')
    
    # Example predictions
    print("\n" + "="*50)
    print("EXAMPLE PREDICTIONS")
    print("="*50)
    
    # Current flight scenarios
    test_flights = [
        {
            'flight_id': 'FLT0001',
            'origin_airport': 'JHB',
            'hour': 14,
            'day_of_week': 2,
            'month': 6,
            'flight_duration': 2.5,
            'cargo_weight': 450,
            'passenger_count': 4,
            'wind_speed': 12,
            'visibility': 15,
            'precipitation': 0,
            'previous_drop_location': 'Maseru',
            'flights_today': 3
        },
        {
            'flight_id': 'FLT0002',
            'origin_airport': 'CPT',
            'hour': 9,
            'day_of_week': 4,
            'month': 8,
            'flight_duration': 3.2,
            'cargo_weight': 680,
            'passenger_count': 6,
            'wind_speed': 8,
            'visibility': 12,
            'precipitation': 2,
            'previous_drop_location': 'Leribe',
            'flights_today': 5
        }
    ]
    
    # Make predictions
    for i, flight in enumerate(test_flights, 1):
        print(f"\nFlight {i}: {flight['flight_id']}")
        print("-" * 30)
        
        prediction = predictor.predict_next_drop_off(flight)
        
        print(f"Next Drop Location: {prediction['next_drop_location']}")
        print(f"Time to Next Drop: {prediction['time_to_next_drop_hours']:.1f} hours")
        print(f"Drop Probability: {prediction['drop_probability']:.2f}")
        print(f"Location Confidence: {prediction.get('location_confidence', 'N/A')}")
    
    # Generate optimal schedule
    print(f"\n{'='*50}")
    print("OPTIMAL DROP-OFF SCHEDULE")
    print("="*50)
    
    schedule = predictor.get_optimal_drop_schedule(test_flights, time_window_hours=12)
    
    print(f"Total Flights: {schedule['total_flights']}")
    print(f"Time Window: {schedule['time_window_hours']} hours")
    print(f"Optimization Score: {schedule['optimization_score']:.2f}")
    
    print("\nScheduled Drops:")
    for i, drop in enumerate(schedule['scheduled_drops'], 1):
        print(f"{i}. {drop['location']} at {drop['estimated_time']:.1f}h "
              f"(Prob: {drop['probability']:.2f}, Conf: {drop['confidence']:.2f})")
    
    # Export predictions to JSON
    export_data = {
        'predictions': [predictor.predict_next_drop_off(flight) for flight in test_flights],
        'schedule': schedule,
        'timestamp': datetime.now().isoformat()
    }
    
    with open('flight_predictions.json', 'w') as f:
        json.dump(export_data, f, indent=2)
    
    print(f"\nPredictions exported to flight_predictions.json")


if __name__ == "__main__":
    main()
