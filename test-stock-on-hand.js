/**
 * Test script to verify stock on hand refresh functionality
 * Run this in browser console when on the redistribution page
 */

function testStockOnHandRefresh() {
    console.log('Testing Stock On Hand Refresh Functionality...');
    
    // Check if stockOnHandService is available
    if (typeof stockOnHandService !== 'undefined') {
        console.log('✓ stockOnHandService is loaded');
        
        // Test the service methods
        stockOnHandService.getStockOnHandForMultiple('facility-id', 'program-id', ['orderable-id-1'])
            .then(function(result) {
                console.log('✓ getStockOnHandForMultiple works:', result);
            })
            .catch(function(error) {
                console.log('✗ getStockOnHandForMultiple failed:', error);
            });
    } else {
        console.log('✗ stockOnHandService not found');
    }
    
    // Check if controller is using dynamic stock on hand
    // Look for hardcoded '45' in the createProcessAndSendOrder function
    if (createProcessAndSendOrder.toString().includes('soh: 45')) {
        console.log('✗ Still using hardcoded stock on hand value');
    } else {
        console.log('✓ Using dynamic stock on hand values');
    }
}

// Run the test
testStockOnHandRefresh();
