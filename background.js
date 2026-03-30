// Background script for THABABET AI Extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('🛩️ THABABET AI Predictor Extension Installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPrediction') {
        // Forward prediction requests to AI API
        fetchPredictionFromAPI(request.gameData)
            .then(prediction => {
                sendResponse({ success: true, prediction: prediction });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
    }
    
    return true; // Keep message channel open for async response
});

async function fetchPredictionFromAPI(gameData) {
    try {
        const response = await fetch('http://localhost:5000/api/live_prediction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gameData)
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('API request failed');
        }
    } catch (error) {
        console.error('Background script API error:', error);
        throw error;
    }
}
