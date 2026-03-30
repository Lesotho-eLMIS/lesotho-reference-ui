# Testing Supply Request Refresh Fix

## Problem Statement
The "View Supply Requests" page was not refreshing after changes were made in "Fulfill Requests", causing outdated information to persist even after page refresh.

## Solution Implemented
Enhanced the refresh mechanism between fulfillment operations and the order fulfillment view to ensure real-time updates.

## Files Modified
1. `lesotho-reference-ui/requisition-redistribution/requisition-redistribution.controller.js`
2. `lesotho-reference-ui/src/order-fulfillment/order-fulfillment.controller.js`

## Test Scenarios

### Scenario 1: Automatic Refresh After Fulfillment
**Steps:**
1. Navigate to Supply Requests > Fulfill Requests
2. Select a requisition and make changes (approve quantities, modify allocations)
3. Submit the changes
4. Navigate back to Supply Requests > View Supply Requests
5. Verify the changes are immediately reflected

**Expected Result:**
- The "View Supply Requests" page shows the updated information
- Order statuses reflect the changes made in fulfillment
- No manual page refresh needed

### Scenario 2: URL Parameter Refresh Test
**Steps:**
1. Navigate to `http://your-domain/#/orders/fulfillment?refresh=true`
2. Observe the page behavior
3. Check that the refresh parameter is removed from URL after auto-refresh

**Expected Result:**
- Page automatically reloads with fresh data
- URL parameter `refresh=true` is removed after reload
- No infinite reload loop occurs

### Scenario 3: Browser Console Test
**Steps:**
1. Navigate to the "View Supply Requests" page
2. Open browser developer console
3. Copy and paste the test script from `test-refresh-fix.js`
4. Execute the script

**Expected Result:**
- Console shows "✓ refreshOrders method is available"
- Console shows "✓ refreshOrders method executed successfully"
- No error messages in console

### Scenario 4: Manual Refresh Test
**Steps:**
1. Navigate to Supply Requests > View Supply Requests
2. Note the current data (timestamps, statuses, etc.)
3. In another tab/window, make changes via Fulfill Requests
4. Return to View Supply Requests and manually refresh (F5)
5. Verify updated data appears

**Expected Result:**
- Manual refresh shows updated information
- No cached/stale data persists

## Technical Verification

### Code Changes Verification

#### 1. RequisitionRedistributionController
Check lines 269-277 in `requisition-redistribution.controller.js`:
```javascript
.then(() => {
    // Check if previous state was order fulfillment to trigger refresh
    if (stateTrackerService.getPreviousState() && 
        stateTrackerService.getPreviousState().name === 'openlmis.orders.fulfillment') {
        stateTrackerService.goToPreviousState('openlmis.orders.fulfillment', {refresh: 'true'});
    } else {
        stateTrackerService.goToPreviousState('openlmis.requisitions.approvalList');
    }
}));
```

#### 2. OrderFulfillmentController
Check lines 44-59 in `order-fulfillment.controller.js`:
```javascript
// Auto-refresh mechanism when returning from shipment view or after changes
vm.$onInit = function() {
    onInit();
    
    // Check if we're returning from shipment view (indicates status change may have occurred)
    if ($stateParams.refresh === 'true') {
        vm.loadOrders();
        // Remove refresh parameter to prevent infinite reload
        $state.go('.', {refresh: null}, {notify: false});
    }
};

// Enhanced refresh method that can be called from other controllers
vm.refreshOrders = function() {
    return vm.loadOrders();
};
```

### Network Request Verification
1. Open browser developer tools > Network tab
2. Navigate through the test scenarios
3. Verify that fresh API calls are made when refresh is triggered
4. Check that `orderRepository.search()` is called with updated parameters

## Test Data Requirements
- At least one requisition in "Fulfilling" or "Ordered" status
- User permissions for both fulfillment and order viewing
- Access to both "Fulfill Requests" and "View Supply Requests" pages

## Troubleshooting

### If refresh doesn't work:
1. Check browser console for JavaScript errors
2. Verify the `stateTrackerService` is properly injected
3. Confirm the `$stateParams.refresh` parameter is being passed correctly
4. Check network tab for failed API calls

### If infinite reload occurs:
1. Check that the `refresh` parameter is being removed from URL
2. Verify the `notify: false` option in state transition
3. Ensure no other code is re-adding the refresh parameter

### If data is still stale:
1. Verify `orderRepository.search()` is being called with correct parameters
2. Check if server-side caching is affecting the response
3. Confirm the `reload: true` option is working in state transition

## Success Criteria
- ✅ Automatic refresh after fulfillment operations
- ✅ Manual refresh works correctly
- ✅ No infinite reload loops
- ✅ URL parameters handled correctly
- ✅ No JavaScript errors in console
- ✅ Real-time data synchronization between pages

## Rollback Plan
If issues arise, the changes can be reverted by:
1. Restoring original `redistributeRequisition()` function
2. Removing enhanced refresh logic from `OrderFulfillmentController`
3. Keeping the original basic auto-refresh mechanism only
