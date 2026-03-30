/**
 * Test script to verify supply request refresh functionality
 * Run this in browser console when on the order fulfillment page
 */

function testSupplyRequestRefresh() {
    console.log('Testing Supply Request Refresh Functionality...');
    
    // Test 1: Check if OrderFulfillmentController has the refresh method
    try {
        var controllerScope = angular.element('[ng-controller="OrderFulfillmentController"]').scope();
        if (controllerScope && controllerScope.vm && controllerScope.vm.refreshOrders) {
            console.log('✓ refreshOrders method is available');
            
            // Test the refresh method
            controllerScope.vm.refreshOrders().then(function() {
                console.log('✓ refreshOrders method executed successfully');
            }).catch(function(error) {
                console.log('✗ refreshOrders method failed:', error);
            });
        } else {
            console.log('✗ refreshOrders method not found');
        }
    } catch (error) {
        console.log('✗ Could not access OrderFulfillmentController:', error);
    }
    
    // Test 2: Check URL parameter handling
    var currentUrl = window.location.href;
    if (currentUrl.includes('refresh=true')) {
        console.log('✓ Refresh parameter detected in URL');
        
        // Simulate the auto-refresh mechanism
        setTimeout(function() {
            if (currentUrl.includes('refresh=true')) {
                console.log('✗ Refresh parameter was not removed after auto-refresh');
            } else {
                console.log('✓ Refresh parameter was properly removed after auto-refresh');
            }
        }, 2000);
    } else {
        console.log('ℹ No refresh parameter in current URL (this is normal)');
    }
    
    // Test 3: Check if state tracking is working
    try {
        var stateService = angular.element('body').injector().get('$state');
        console.log('✓ State service is available');
        console.log('Current state:', stateService.current.name);
    } catch (error) {
        console.log('✗ Could not access state service:', error);
    }
    
    console.log('Test completed. Check the console output above.');
}

// Run the test
testSupplyRequestRefresh();
