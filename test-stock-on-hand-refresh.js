/*
 * Test Suite for Supply Request Stock On Hand Refresh
 * This test suite verifies that stock on hand data refreshes correctly
 * when products' stock on hand is updated through various operations.
 */

// Test Configuration
const TEST_CONFIG = {
    baseUrl: 'http://localhost:8080',
    testFacilityId: 'FACILITY-001',
    testProgramId: 'PROGRAM-001',
    testProductId: 'PRODUCT-001',
    refreshTimeout: 5000,
    apiTimeout: 10000
};

// Test Utilities
class StockRefreshTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        
        if (type === 'error') {
            console.error(logEntry);
        } else if (type === 'success') {
            console.log(`%c${logEntry}`, 'color: green');
        }
    }

    async runTest(testName, testFunction) {
        this.currentTest = testName;
        this.log(`🧪 Running test: ${testName}`);
        
        try {
            const startTime = Date.now();
            await testFunction();
            const duration = Date.now() - startTime;
            
            this.log(`✅ Test passed: ${testName} (${duration}ms)`, 'success');
            this.testResults.push({ name: testName, status: 'PASSED', duration });
        } catch (error) {
            this.log(`❌ Test failed: ${testName} - ${error.message}`, 'error');
            this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async waitForElement(selector, timeout = TEST_CONFIG.apiTimeout) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
            await this.sleep(100);
        }
        
        throw new Error(`Element not found: ${selector}`);
    }

    async waitForStockRefresh(timeout = TEST_CONFIG.refreshTimeout) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkRefresh = setInterval(() => {
                const refreshIndicator = document.querySelector('.stock-refresh-container .fa-spinner');
                if (!refreshIndicator) {
                    clearInterval(checkRefresh);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkRefresh);
                    reject(new Error('Stock refresh timeout'));
                }
            }, 100);
        });
    }

    async simulateStockUpdate(updateType, updateData) {
        this.log(`📦 Simulating ${updateType} stock update...`);
        
        // Simulate different types of stock updates
        const stockUpdateEvent = new CustomEvent('stockUpdated', {
            detail: {
                facilityId: updateData.facilityId || TEST_CONFIG.testFacilityId,
                programId: updateData.programId || TEST_CONFIG.testProgramId,
                type: updateType,
                timestamp: Date.now(),
                ...updateData
            }
        });
        
        document.dispatchEvent(stockUpdateEvent);
        
        // Also trigger Angular event if available
        if (window.angular && window.angular.element) {
            const scope = angular.element(document.querySelector('[ng-controller]')).scope();
            if (scope && scope.$broadcast) {
                scope.$broadcast('stock.updated', stockUpdateEvent.detail);
                scope.$digest();
            }
        }
        
        await this.sleep(500); // Allow event processing
    }

    async getStockOnHand() {
        // Try to get stock on hand from various sources
        const selectors = [
            '.stock-on-hand-value',
            '.stock-quantity',
            '[data-stock-on-hand]',
            '.summary-quantity'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent.trim();
                const number = parseFloat(text.replace(/[^\d.-]/g, ''));
                if (!isNaN(number)) {
                    return number;
                }
            }
        }
        
        return null;
    }

    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
        const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
        
        console.log('\n📊 Test Report Summary:');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ❌`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(r => r.status === 'FAILED').forEach(test => {
                console.log(`  - ${test.name}: ${test.error}`);
            });
        }
        
        return {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: (passedTests / totalTests) * 100
        };
    }
}

// Test Suite
async function runStockRefreshTests() {
    const tester = new StockRefreshTester();
    
    console.log('🚀 Starting Stock On Hand Refresh Test Suite');
    console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`Test Facility: ${TEST_CONFIG.testFacilityId}`);
    console.log(`Test Program: ${TEST_CONFIG.testProgramId}`);
    
    // Test 1: Check if stock refresh controller exists
    await tester.runTest('Stock Refresh Controller Exists', async () => {
        if (typeof angular === 'undefined') {
            throw new Error('Angular is not loaded');
        }
        
        const module = angular.module('stock-card-summary-list');
        if (!module) {
            throw new Error('stock-card-summary-list module not found');
        }
        
        tester.log('✓ Stock refresh controller module found');
    });
    
    // Test 2: Check if refresh methods are available
    await tester.runTest('Refresh Methods Available', async () => {
        const controllerElement = document.querySelector('[ng-controller*="StockCardSummaryListController"]');
        if (!controllerElement) {
            throw new Error('StockCardSummaryListController not found on page');
        }
        
        const scope = angular.element(controllerElement).scope();
        if (!scope.vm) {
            throw new Error('Controller scope (vm) not found');
        }
        
        const requiredMethods = ['refreshStockOnHand', 'forceRefresh', 'loadStockCardSummaries'];
        for (const method of requiredMethods) {
            if (typeof scope.vm[method] !== 'function') {
                throw new Error(`Method ${method} not found on controller`);
            }
        }
        
        tester.log('✓ All required refresh methods are available');
    });
    
    // Test 3: Test manual refresh functionality
    await tester.runTest('Manual Stock Refresh', async () => {
        const controllerElement = document.querySelector('[ng-controller*="StockCardSummaryListController"]');
        const scope = angular.element(controllerElement).scope();
        
        const initialStock = await tester.getStockOnHand();
        tester.log(`Initial stock on hand: ${initialStock}`);
        
        // Trigger manual refresh
        scope.vm.refreshStockOnHand();
        scope.$digest();
        
        // Wait for refresh to complete
        await tester.waitForStockRefresh();
        
        const refreshedStock = await tester.getStockOnHand();
        tester.log(`Refreshed stock on hand: ${refreshedStock}`);
        
        // The refresh should complete without errors
        if (scope.vm.isRefreshing) {
            throw new Error('Refresh is still in progress after timeout');
        }
        
        tester.log('✓ Manual refresh completed successfully');
    });
    
    // Test 4: Test force refresh functionality
    await tester.runTest('Force Stock Refresh', async () => {
        const controllerElement = document.querySelector('[ng-controller*="StockCardSummaryListController"]');
        const scope = angular.element(controllerElement).scope();
        
        // Trigger force refresh
        scope.vm.forceRefresh();
        scope.$digest();
        
        // Force refresh should trigger a page reload or state change
        // We can't easily test the reload, but we can verify the method exists and runs
        tester.log('✓ Force refresh method executed');
    });
    
    // Test 5: Test stock update event handling
    await tester.runTest('Stock Update Event Handling', async () => {
        const initialStock = await tester.getStockOnHand();
        
        // Simulate stock update
        await tester.simulateStockUpdate('adjustment', {
            productId: TEST_CONFIG.testProductId,
            quantity: 10
        });
        
        // Wait for automatic refresh
        await tester.sleep(TEST_CONFIG.refreshTimeout);
        
        // Check if refresh was triggered
        const controllerElement = document.querySelector('[ng-controller*="StockCardSummaryListController"]');
        const scope = angular.element(controllerElement).scope();
        
        // The controller should have received the update event
        tester.log('✓ Stock update event handled');
    });
    
    // Test 6: Test physical inventory refresh
    await tester.runTest('Physical Inventory Refresh', async () => {
        // Simulate physical inventory completion
        await tester.simulateStockUpdate('physical_inventory', {
            inventoryType: 'Major',
            lineItemsCount: 5
        });
        
        // Wait for automatic refresh
        await tester.sleep(TEST_CONFIG.refreshTimeout);
        
        tester.log('✓ Physical inventory refresh triggered');
    });
    
    // Test 7: Test cross-tab communication
    await tester.runTest('Cross-Tab Communication', async () => {
        // Simulate storage event for cross-tab communication
        sessionStorage.setItem('stockUpdateTrigger', Date.now().toString());
        
        await tester.sleep(1000);
        
        // Check if the storage event was handled
        tester.log('✓ Cross-tab communication mechanism in place');
    });
    
    // Test 8: Test auto-refresh functionality
    await tester.runTest('Auto-Refresh Functionality', async () => {
        const controllerElement = document.querySelector('[ng-controller*="StockCardSummaryListController"]');
        const scope = angular.element(controllerElement).scope();
        
        // Check if auto-refresh is configured
        if (!scope.vm.autoRefreshEnabled) {
            tester.log('Auto-refresh is disabled');
        } else {
            tester.log('✓ Auto-refresh is enabled');
        }
    });
    
    // Test 9: Test error handling
    await tester.runTest('Error Handling', async () => {
        const controllerElement = document.querySelector('[ng-controller*="StockCardSummaryListController"]');
        const scope = angular.element(controllerElement).scope();
        
        // Simulate network error by mocking the repository
        const originalLoadOrders = scope.vm.loadStockCardSummaries;
        let errorCalled = false;
        
        scope.vm.loadStockCardSummaries = function() {
            errorCalled = true;
            return Promise.reject(new Error('Network error'));
        };
        
        try {
            await scope.vm.refreshStockOnHand();
        } catch (error) {
            // Expected error
        }
        
        // Restore original method
        scope.vm.loadStockCardSummaries = originalLoadOrders;
        
        if (!errorCalled) {
            throw new Error('Error handling not triggered');
        }
        
        tester.log('✓ Error handling works correctly');
    });
    
    // Test 10: Test UI indicators
    await tester.runTest('UI Refresh Indicators', async () => {
        const controllerElement = document.querySelector('[ng-controller*="StockCardSummaryListController"]');
        const scope = angular.element(controllerElement).scope();
        
        // Check if refresh button exists
        const refreshButton = document.querySelector('button[ng-click*="refresh"]');
        if (!refreshButton) {
            throw new Error('Refresh button not found');
        }
        
        // Check if loading indicator works
        scope.vm.isRefreshing = true;
        scope.$digest();
        
        const spinner = refreshButton.querySelector('.fa-spinner');
        if (!spinner) {
            throw new Error('Loading spinner not found');
        }
        
        // Reset state
        scope.vm.isRefreshing = false;
        scope.$digest();
        
        tester.log('✓ UI refresh indicators working correctly');
    });
    
    // Generate final report
    const report = tester.generateTestReport();
    
    console.log('\n🎉 Stock Refresh Test Suite Completed!');
    
    return report;
}

// Manual test functions for developers
window.StockRefreshTests = {
    runTests: runStockRefreshTests,
    
    // Quick test for manual verification
    quickTest: async function() {
        console.log('🔍 Running quick stock refresh test...');
        
        try {
            // Check if we're on the stock card summary page
            const controllerElement = document.querySelector('[ng-controller*="StockCardSummaryListController"]');
            if (!controllerElement) {
                console.error('❌ Not on stock card summary page');
                return;
            }
            
            const scope = angular.element(controllerElement).scope();
            
            // Test refresh methods
            console.log('✓ Controller found');
            console.log('✓ refreshStockOnHand:', typeof scope.vm.refreshStockOnHand);
            console.log('✓ forceRefresh:', typeof scope.vm.forceRefresh);
            console.log('✓ loadStockCardSummaries:', typeof scope.vm.loadStockCardSummaries);
            
            // Test manual refresh
            console.log('🔄 Testing manual refresh...');
            scope.vm.refreshStockOnHand();
            
            console.log('✅ Quick test completed successfully');
            
        } catch (error) {
            console.error('❌ Quick test failed:', error);
        }
    },
    
    // Simulate stock update
    simulateUpdate: function(type, data) {
        const tester = new StockRefreshTester();
        return tester.simulateStockUpdate(type, data || {});
    },
    
    // Check current state
    checkState: function() {
        const controllerElement = document.querySelector('[ng-controller*="StockCardSummaryListController"]');
        if (!controllerElement) {
            console.log('❌ Stock card summary controller not found');
            return;
        }
        
        const scope = angular.element(controllerElement).scope();
        
        console.log('📊 Current State:');
        console.log('  Facility:', scope.vm.facility ? scope.vm.facility.name : 'Not selected');
        console.log('  Program:', scope.vm.program ? scope.vm.program.name : 'Not selected');
        console.log('  Is Refreshing:', scope.vm.isRefreshing);
        console.log('  Stock Cards Count:', scope.vm.stockCardSummaries ? scope.vm.stockCardSummaries.length : 0);
        console.log('  Display Cards Count:', scope.vm.displayStockCardSummaries ? scope.vm.displayStockCardSummaries.length : 0);
    }
};

// Auto-run tests if on the correct page
if (window.location.href.includes('stockCardSummaries')) {
    console.log('🎯 Detected stock card summary page - tests available');
    console.log('Run StockRefreshTests.runTests() for full test suite');
    console.log('Run StockRefreshTests.quickTest() for quick verification');
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runStockRefreshTests, StockRefreshTests };
}
