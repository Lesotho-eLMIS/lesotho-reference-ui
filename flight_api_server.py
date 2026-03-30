from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import json
import numpy as np
from flight_drop_off_predictor import FlightDropOffPredictor
import joblib
import os

app = Flask(__name__)
CORS(app)

# Initialize the AI predictor
predictor = FlightDropOffPredictor()

# Load pre-trained models if available
if os.path.exists('flight_drop_off_models.joblib'):
    predictor.load_models('flight_drop_off_models.joblib')
    print("Pre-trained models loaded successfully")
else:
    # Train with sample data if no pre-trained models exist
    print("No pre-trained models found. Training with sample data...")
    historical_data = predictor.load_historical_data()
    predictor.train_models(historical_data)
    predictor.save_models('flight_drop_off_models.joblib')

@app.route('/')
def index():
    """Serve the web interface"""
    with open('flight_predictor_web.html', 'r') as f:
        html_content = f.read()
    return html_content

@app.route('/api/predict', methods=['POST'])
def predict():
    """API endpoint for flight drop-off prediction"""
    try:
        # Get flight data from request
        flight_data = request.json
        
        # Validate required fields
        required_fields = ['origin_airport', 'flight_duration', 'cargo_weight', 
                        'passenger_count', 'flight_hour', 'day_of_week', 'month',
                        'wind_speed', 'visibility', 'precipitation', 
                        'previous_drop', 'flights_today']
        
        for field in required_fields:
            if field not in flight_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Make prediction
        prediction = predictor.predict_next_drop_off(flight_data)
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'timestamp': np.datetime64('now').astype(str)
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/batch_predict', methods=['POST'])
def batch_predict():
    """API endpoint for batch predictions"""
    try:
        flight_data_list = request.json.get('flights', [])
        
        if not flight_data_list:
            return jsonify({'error': 'No flight data provided'}), 400
        
        predictions = predictor.predict_batch(flight_data_list)
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'count': len(predictions),
            'timestamp': np.datetime64('now').astype(str)
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/optimize_schedule', methods=['POST'])
def optimize_schedule():
    """API endpoint for optimal drop-off scheduling"""
    try:
        data = request.json
        flights = data.get('flights', [])
        time_window = data.get('time_window_hours', 24)
        
        if not flights:
            return jsonify({'error': 'No flight data provided'}), 400
        
        schedule = predictor.get_optimal_drop_schedule(flights, time_window)
        
        return jsonify({
            'success': True,
            'schedule': schedule,
            'timestamp': np.datetime64('now').astype(str)
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/train', methods=['POST'])
def train_models():
    """API endpoint to retrain models with new data"""
    try:
        data = request.json
        data_source = data.get('data_source')
        
        # Load and train on new data
        historical_data = predictor.load_historical_data(data_source)
        predictor.train_models(historical_data)
        
        # Save updated models
        predictor.save_models('flight_drop_off_models.joblib')
        
        return jsonify({
            'success': True,
            'message': 'Models trained successfully',
            'data_points': len(historical_data),
            'timestamp': np.datetime64('now').astype(str)
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/model_info', methods=['GET'])
def model_info():
    """Get information about the trained models"""
    try:
        info = {
            'is_trained': predictor.is_trained,
            'feature_count': len(predictor.feature_columns) if predictor.is_trained else 0,
            'models_available': list(predictor.models.keys()),
            'drop_locations': ['Maseru', 'Mokhotlong', 'Berea', 'Leribe', 'Quthing', 'Qachas Nek'],
            'origin_airports': ['JHB', 'CPT', 'DUR', 'PLZ', 'ELS', 'GRJ']
        }
        
        return jsonify({
            'success': True,
            'model_info': info
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': predictor.is_trained,
        'timestamp': np.datetime64('now').astype(str)
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found', 'success': False}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error', 'success': False}), 500

if __name__ == '__main__':
    print("Starting Flight Drop-Off AI Predictor Server...")
    print("Access the web interface at: http://localhost:5000")
    print("API endpoints available at: http://localhost:5000/api/")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
