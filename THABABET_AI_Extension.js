// THABABET AI Cashout Predictor Browser Extension
// This script integrates with the real THABABET platform to provide AI predictions

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        API_BASE_URL: 'http://localhost:5000/api',
        UPDATE_INTERVAL: 1000, // Update predictions every 1 second
        AUTO_CASHOUT_ENABLED: false,
        RISK_TOLERANCE: 'moderate',
        MIN_PROFIT_TARGET: 1.5
    };

    // Game state tracking
    let gameState = {
        currentMultiplier: 1.0,
        gameActive: false,
        startTime: null,
        previousMultipliers: [],
        currentPrediction: null,
        autoCashoutTarget: 0
    };

    // UI elements to inject
    let aiPanel = null;
    let predictionDisplay = null;
    let cashoutButton = null;

    // Initialize extension
    function init() {
        console.log('🛩️ THABABET AI Predictor Extension Loaded');
        
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupAIInterface);
        } else {
            setupAIInterface();
        }
    }

    function setupAIInterface() {
        console.log('Setting up AI interface...');
        
        // Create AI panel
        createAIPanel();
        
        // Start monitoring game state
        startGameMonitoring();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
    }

    function createAIPanel() {
        // Create floating AI panel
        aiPanel = document.createElement('div');
        aiPanel.id = 'thabet-ai-panel';
        aiPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(60, 60, 60, 0.95));
            border: 2px solid #FFD700;
            border-radius: 15px;
            padding: 20px;
            color: white;
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
        `;

        aiPanel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 15px; font-size: 16px; color: #FFD700;">
                🛩️ THABABET AI PREDICTOR
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #ccc; margin-bottom: 5px;">Current Multiplier</div>
                <div id="ai-current-multiplier" style="font-size: 24px; font-weight: bold; color: #4CAF50;">1.00x</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #ccc; margin-bottom: 5px;">AI Prediction</div>
                <div id="ai-prediction" style="font-size: 14px; color: #FFD700; margin-bottom: 10px;">Analyzing...</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #ccc; margin-bottom: 5px;">Risk Level</div>
                <div id="ai-risk" style="font-size: 14px; padding: 5px 10px; border-radius: 5px; background: #666;">--</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #ccc; margin-bottom: 5px;">Auto Cashout</div>
                <select id="ai-auto-cashout" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #555; background: #333; color: white;">
                    <option value="disabled">Disabled</option>
                    <option value="conservative">Conservative (1.5x)</option>
                    <option value="moderate">Moderate (2.0x)</option>
                    <option value="aggressive">Aggressive (3.0x)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <button id="ai-cashout-btn" style="width: 100%; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">
                    💵 CASHOUT NOW
                </button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <button id="ai-minimize-btn" style="width: 100%; padding: 8px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    − Minimize
                </button>
            </div>
        `;

        document.body.appendChild(aiPanel);

        // Add event listeners
        document.getElementById('ai-auto-cashout').addEventListener('change', handleAutoCashoutChange);
        document.getElementById('ai-cashout-btn').addEventListener('click', handleManualCashout);
        document.getElementById('ai-minimize-btn').addEventListener('click', minimizePanel);
    }

    function startGameMonitoring() {
        console.log('Starting game monitoring...');
        
        // Monitor for game changes
        setInterval(() => {
            updateGameState();
            if (gameState.gameActive) {
                requestPrediction();
            }
        }, CONFIG.UPDATE_INTERVAL);
    }

    function updateGameState() {
        try {
            // Look for game elements
            const multiplierElement = document.querySelector('[class*="multiplier"]') || 
                                   document.querySelector('[data-testid*="multiplier"]') ||
                                   document.querySelector('span[class*="multiplier"]');
            
            if (multiplierElement) {
                const multiplierText = multiplierElement.textContent || multiplierElement.innerText;
                const multiplierMatch = multiplierText.match(/([0-9.]+)x/);
                
                if (multiplierMatch) {
                    const newMultiplier = parseFloat(multiplierMatch[1]);
                    
                    if (newMultiplier !== gameState.currentMultiplier) {
                        gameState.currentMultiplier = newMultiplier;
                        document.getElementById('ai-current-multiplier').textContent = newMultiplier.toFixed(2) + 'x';
                        
                        // Check if game is active (multiplier > 1.0)
                        if (newMultiplier > 1.0 && !gameState.gameActive) {
                            gameState.gameActive = true;
                            gameState.startTime = Date.now();
                            console.log('🎮 Game started at multiplier:', newMultiplier);
                        }
                        
                        // Check if game crashed
                        if (newMultiplier === 1.0 && gameState.gameActive) {
                            gameState.gameActive = false;
                            console.log('💥 Game crashed at:', gameState.currentMultiplier);
                            
                            // Add to previous multipliers
                            gameState.previousMultipliers.unshift(gameState.currentMultiplier);
                            if (gameState.previousMultipliers.length > 20) {
                                gameState.previousMultipliers = gameState.previousMultipliers.slice(0, 20);
                            }
                        }
                    }
                }
            }

            // Look for previous multipliers
            const previousElements = document.querySelectorAll('[class*="previous"], [class*="history"]');
            if (previousElements.length > 0) {
                // Extract previous multipliers from the page
                extractPreviousMultipliers();
            }

        } catch (error) {
            console.error('Error updating game state:', error);
        }
    }

    function extractPreviousMultipliers() {
        try {
            // Look for multiplier history in the page
            const allText = document.body.innerText;
            const multiplierMatches = allText.match(/([0-9.]+)x/g);
            
            if (multiplierMatches && multiplierMatches.length > 1) {
                const newMultipliers = multiplierMatches.slice(1, 10).map(match => parseFloat(match.slice(0, -1)));
                
                if (newMultipliers.length > 0) {
                    gameState.previousMultipliers = newMultipliers;
                    console.log('📊 Updated previous multipliers:', newMultipliers.slice(0, 5));
                }
            }
        } catch (error) {
            console.error('Error extracting previous multipliers:', error);
        }
    }

    async function requestPrediction() {
        if (!gameState.gameActive) return;

        try {
            // Prepare game data for API
            const gameData = {
                current_multiplier: gameState.currentMultiplier,
                game_time: gameState.startTime ? (Date.now() - gameState.startTime) / 1000 : 0,
                player_count: estimatePlayerCount(),
                previous_crash: gameState.previousMultipliers[0] || 2.0,
                avg_previous_5: calculateAveragePrevious(5),
                trend: calculateTrend(),
                time_elapsed: gameState.startTime ? (Date.now() - gameState.startTime) / 1000 : 0
            };

            // Call AI API
            const response = await fetch(`${CONFIG.API_BASE_URL}/live_prediction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gameData)
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    gameState.currentPrediction = data.prediction;
                    updatePredictionDisplay(data.prediction);
                } else {
                    console.error('API Error:', data.error);
                }
            } else {
                console.error('Network error calling AI API');
            }

        } catch (error) {
            console.error('Error requesting prediction:', error);
        }
    }

    function updatePredictionDisplay(prediction) {
        if (!prediction) return;

        try {
            // Update prediction display
            document.getElementById('ai-prediction').textContent = 
                `Cashout: ${prediction.recommended_cashout?.toFixed(2) || '2.00'}x (Confidence: ${Math.round((prediction.confidence || 0.8) * 100)}%)`;
            
            // Update risk indicator
            const riskElement = document.getElementById('ai-risk');
            const riskLevel = prediction.risk_level || 'MEDIUM';
            const riskColors = {
                'LOW': '#4CAF50',
                'MEDIUM': '#FFA500', 
                'HIGH': '#FF4444'
            };
            
            riskElement.textContent = riskLevel + ' RISK';
            riskElement.style.background = riskColors[riskLevel] || '#666';
            
            // Auto cashout check
            if (CONFIG.AUTO_CASHOUT_ENABLED && gameState.autoCashoutTarget > 0) {
                if (gameState.currentMultiplier >= gameState.autoCashoutTarget) {
                    handleAutoCashout();
                }
            }

        } catch (error) {
            console.error('Error updating prediction display:', error);
        }
    }

    function handleAutoCashoutChange(event) {
        const value = event.target.value;
        CONFIG.AUTO_CASHOUT_ENABLED = value !== 'disabled';
        
        const targets = {
            'conservative': 1.5,
            'moderate': 2.0,
            'aggressive': 3.0
        };
        
        gameState.autoCashoutTarget = targets[value] || 0;
        console.log('Auto cashout set to:', value, gameState.autoCashoutTarget);
    }

    function handleManualCashout() {
        if (gameState.gameActive) {
            console.log('💰 Manual cashout triggered at:', gameState.currentMultiplier);
            
            // Try to find and click the cashout button
            const cashoutButtons = document.querySelectorAll('button[class*="cashout"], button[class*="bet"], button[onclick*="cashout"]');
            
            for (let button of cashoutButtons) {
                if (button.textContent && button.textContent.toLowerCase().includes('cash')) {
                    button.click();
                    break;
                }
            }
        }
    }

    function handleAutoCashout() {
        console.log('🤖 Auto cashout triggered at:', gameState.currentMultiplier);
        handleManualCashout();
    }

    function minimizePanel() {
        aiPanel.style.transform = 'scale(0.1)';
        aiPanel.style.opacity = '0.1';
        
        // Create restore button
        const restoreBtn = document.createElement('button');
        restoreBtn.textContent = '🛩️';
        restoreBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 350px;
            width: 40px;
            height: 40px;
            background: #FFD700;
            color: black;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10001;
            font-weight: bold;
        `;
        
        restoreBtn.onclick = () => {
            aiPanel.style.transform = 'scale(1)';
            aiPanel.style.opacity = '1';
            restoreBtn.remove();
        };
        
        document.body.appendChild(restoreBtn);
    }

    function estimatePlayerCount() {
        // Try to estimate player count from the page
        const playerElements = document.querySelectorAll('[class*="player"], [class*="user"], [class*="bet"]');
        return playerElements.length || 50; // Default estimate
    }

    function calculateAveragePrevious(count) {
        const recent = gameState.previousMultipliers.slice(0, count);
        if (recent.length === 0) return 2.0;
        return recent.reduce((sum, val) => sum + val, 0) / recent.length;
    }

    function calculateTrend() {
        const recent = gameState.previousMultipliers.slice(0, 5);
        if (recent.length < 2) return 'stable';
        
        const increasing = recent.filter((val, i) => i > 0 && val > recent[i-1]).length;
        const decreasing = recent.filter((val, i) => i > 0 && val < recent[i-1]).length;
        
        if (increasing > decreasing) return 'up';
        if (decreasing > increasing) return 'down';
        return 'stable';
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Alt + C for cashout
            if (event.altKey && event.key === 'c') {
                event.preventDefault();
                handleManualCashout();
            }
            
            // Alt + H to hide/show panel
            if (event.altKey && event.key === 'h') {
                event.preventDefault();
                if (aiPanel.style.opacity === '0.1') {
                    aiPanel.style.transform = 'scale(1)';
                    aiPanel.style.opacity = '1';
                } else {
                    minimizePanel();
                }
            }
        });
    }

    // Start the extension
    init();

})();
