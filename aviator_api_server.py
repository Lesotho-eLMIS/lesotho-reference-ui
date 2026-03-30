from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import json
import numpy as np
import time
from datetime import datetime
from aviator_cashout_predictor import AviatorCashoutPredictor
import joblib
import os

app = Flask(__name__)
CORS(app)

# Initialize AI predictor
predictor = AviatorCashoutPredictor()

# Load pre-trained models if available
if os.path.exists('aviator_cashout_models.joblib'):
    predictor.load_models('aviator_cashout_models.joblib')
    print("✅ Aviator AI models loaded successfully")
else:
    # Train with sample data if no pre-trained models exist
    print("🔄 No pre-trained models found. Training with sample data...")
    historical_data = predictor.generate_sample_game_data(3000)
    predictor.train_models(historical_data)
    predictor.save_models('aviator_cashout_models.joblib')
    print("✅ Models trained and saved")

# Global game state for demo
current_games = {}
game_history = []

@app.route('/')
def index():
    """Serve Aviator predictor web interface"""
    with open('aviator_predictor_web.html', 'r') as f:
        html_content = f.read()
    return html_content

@app.route('/api/predict', methods=['POST'])
def predict_cashout():
    """API endpoint for cashout prediction"""
    try:
        # Get game data from request
        game_data = request.json
        
        # Validate required fields
        required_fields = ['current_multiplier', 'game_time', 'player_count', 
                        'previous_crash', 'avg_previous_5', 'trend']
        
        for field in required_fields:
            if field not in game_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Make prediction
        prediction = predictor.predict_cashout_point(game_data)
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'timestamp': datetime.now().isoformat(),
            'game_id': game_data.get('game_id', 'UNKNOWN')
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/live_prediction', methods=['POST'])
def live_prediction():
    """API endpoint for real-time live game prediction"""
    try:
        game_data = request.json
        
        # Add real-time features
        game_data['time_elapsed'] = game_data.get('time_elapsed', 0)
        game_data['current_multiplier'] = game_data.get('current_multiplier', 1.0)
        
        # Get real-time prediction
        prediction = predictor.get_real_time_prediction(game_data)
        
        # Add urgency indicators
        current_multiplier = game_data.get('current_multiplier', 1.0)
        if current_multiplier > 2.5:
            prediction['urgency'] = 'HIGH - Consider cashing out now!'
        elif current_multiplier > 1.8:
            prediction['urgency'] = 'MEDIUM - Good profit available'
        else:
            prediction['urgency'] = 'LOW - Safe to continue'
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'timestamp': datetime.now().isoformat(),
            'live_data': {
                'current_multiplier': current_multiplier,
                'time_elapsed': game_data.get('time_elapsed', 0),
                'recommendation_strength': prediction['confidence'] * 100
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/pattern_analysis', methods=['GET'])
def pattern_analysis():
    """API endpoint for pattern analysis"""
    try:
        pattern_data = predictor.get_current_pattern_analysis()
        
        return jsonify({
            'success': True,
            'pattern_analysis': pattern_data,
            'timestamp': datetime.now().isoformat(),
            'recommendations': generate_pattern_recommendations(pattern_data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/game_result', methods=['POST'])
def record_game_result():
    """API endpoint to record actual game results for learning"""
    try:
        game_result = request.json
        
        # Validate required fields
        required_fields = ['game_id', 'actual_crash', 'cashout_point', 'profit']
        
        for field in required_fields:
            if field not in game_result:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Update predictor history
        predictor.update_game_history({
            'game_id': game_result['game_id'],
            'crash_multiplier': game_result['actual_crash'],
            'timestamp': datetime.now().timestamp()
        })
        
        # Add to global history
        game_history.append({
            **game_result,
            'timestamp': datetime.now().isoformat()
        })
        
        # Calculate accuracy metrics
        recent_games = game_history[-100:]  # Last 100 games
        correct_predictions = sum(1 for g in recent_games 
                               if g.get('predicted_crash', g['cashout_point']) < g['actual_crash'])
        accuracy = (correct_predictions / len(recent_games)) * 100 if recent_games else 0
        
        return jsonify({
            'success': True,
            'message': 'Game result recorded successfully',
            'accuracy_metrics': {
                'recent_accuracy': round(accuracy, 2),
                'total_games': len(recent_games),
                'correct_predictions': correct_predictions
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/optimize_strategy', methods=['POST'])
def optimize_strategy():
    """API endpoint to optimize betting strategy"""
    try:
        user_preferences = request.json
        
        risk_tolerance = user_preferences.get('risk_tolerance', 'moderate')
        min_profit = user_preferences.get('min_profit', 1.5)
        bankroll = user_preferences.get('bankroll', 1000)
        
        # Generate optimized strategy
        strategy = generate_optimized_strategy(risk_tolerance, min_profit, bankroll)
        
        return jsonify({
            'success': True,
            'strategy': strategy,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """API endpoint for performance statistics"""
    try:
        if not game_history:
            return jsonify({
                'success': True,
                'statistics': {
                    'total_games': 0,
                    'win_rate': 0,
                    'average_profit': 0,
                    'highest_multiplier': 0,
                    'accuracy': 0
                }
            })
        
        # Calculate statistics
        total_games = len(game_history)
        winning_games = [g for g in game_history if g['profit'] > 0]
        win_rate = (len(winning_games) / total_games) * 100 if total_games > 0 else 0
        average_profit = sum(g['profit'] for g in game_history) / total_games if total_games > 0 else 0
        highest_multiplier = max(g['actual_crash'] for g in game_history) if game_history else 0
        
        # Calculate prediction accuracy
        correct_predictions = sum(1 for g in game_history 
                               if g.get('predicted_crash', g['cashout_point']) < g['actual_crash'])
        accuracy = (correct_predictions / total_games) * 100 if total_games > 0 else 0
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_games': total_games,
                'win_rate': round(win_rate, 2),
                'average_profit': round(average_profit, 3),
                'highest_multiplier': round(highest_multiplier, 2),
                'accuracy': round(accuracy, 2),
                'total_wins': len(winning_games),
                'total_losses': total_games - len(winning_games)
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/model_info', methods=['GET'])
def model_info():
    """Get information about the AI model"""
    try:
        info = {
            'model_type': 'Aviator Cashout Predictor',
            'version': '1.0.0',
            'is_trained': predictor.is_trained,
            'feature_count': len(predictor.feature_columns) if predictor.is_trained else 0,
            'models_available': list(predictor.models.keys()),
            'risk_threshold': predictor.risk_threshold,
            'min_profit_multiplier': predictor.min_profit_multiplier,
            'supported_features': [
                'Real-time prediction',
                'Pattern analysis', 
                'Risk assessment',
                'Optimal cashout points',
                'Auto-cashout recommendations'
            ]
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
        'active_games': len(current_games),
        'timestamp': datetime.now().isoformat()
    })

def generate_pattern_recommendations(pattern_data):
    """Generate recommendations based on pattern analysis"""
    recommendations = []
    
    if pattern_data.get('status') == 'insufficient_data':
        return ['More game data needed for pattern analysis']
    
    avg_crash = pattern_data.get('avg_crash', 2.0)
    trend = pattern_data.get('trend', 'stable')
    low_crash_freq = pattern_data.get('low_crash_frequency', 0.3)
    
    # Trend-based recommendations
    if trend == 'increasing' and avg_crash > 2.5:
        recommendations.append('📈 Upward trend detected - Consider conservative cashouts')
    elif trend == 'decreasing' and avg_crash < 1.8:
        recommendations.append('📉 Downward trend - Opportunity for higher multipliers')
    
    # Frequency-based recommendations
    if low_crash_freq > 0.5:
        recommendations.append('⚠️ High frequency of low crashes - Use conservative strategy')
    elif low_crash_freq < 0.2:
        recommendations.append('🎯 Low crash frequency - Opportunity for aggressive play')
    
    # Pattern strength recommendations
    pattern_strength = pattern_data.get('pattern_strength', 'moderate')
    if pattern_strength == 'strong':
        recommendations.append('🔍 Strong patterns detected - AI predictions more reliable')
    elif pattern_strength == 'weak':
        recommendations.append('🎲 Weak patterns - Use caution with predictions')
    
    return recommendations

def generate_optimized_strategy(risk_tolerance, min_profit, bankroll):
    """Generate optimized betting strategy"""
    base_bet = bankroll * 0.02  # 2% base betting
    
    strategies = {
        'conservative': {
            'base_bet': bankroll * 0.01,
            'cashout_target': min_profit,
            'max_consecutive_losses': 5,
            'stop_loss': bankroll * 0.1,
            'description': 'Safe play with minimal risk'
        },
        'moderate': {
            'base_bet': bankroll * 0.02,
            'cashout_target': min_profit * 1.2,
            'max_consecutive_losses': 3,
            'stop_loss': bankroll * 0.15,
            'description': 'Balanced risk-reward ratio'
        },
        'aggressive': {
            'base_bet': bankroll * 0.04,
            'cashout_target': min_profit * 1.5,
            'max_consecutive_losses': 2,
            'stop_loss': bankroll * 0.2,
            'description': 'High risk, high reward strategy'
        }
    }
    
    strategy = strategies.get(risk_tolerance, strategies['moderate'])
    strategy['recommended_sessions'] = int(bankroll / strategy['base_bet'] / 10)
    strategy['profit_target'] = bankroll * 0.2  # 20% daily profit target
    
    return strategy

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found', 'success': False}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error', 'success': False}), 500

if __name__ == '__main__':
    print("🛩️ Starting Aviator Cashout AI Predictor Server...")
    print("=" * 60)
    print("🌐 Web Interface: http://localhost:5000")
    print("📡 API Endpoints: http://localhost:5000/api/")
    print("🎯 AI Model Status:", "✅ Ready" if predictor.is_trained else "🔄 Training...")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
