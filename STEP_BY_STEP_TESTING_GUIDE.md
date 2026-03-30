# Step-by-Step Testing Guide - Supply Request Refresh Fix

## Prerequisites
- Access to a running OpenLMIS instance (dev/staging/production)
- User account with permissions for:
  - Supply Requests > Fulfill Requests
  - Supply Requests > View Supply Requests
- At least one requisition in "Fulfilling" or "Ordered" status

---

## Step 1: Access the Application
1. Open your web browser
2. Navigate to your OpenLMIS instance URL (e.g., `http://your-domain/`)
3. Log in with your credentials
4. Navigate to **Supply Requests** from the main menu

---

## Step 2: Baseline - Check Current Data
1. Click on **"View Supply Requests"** from the dropdown menu
2. **Take note of:**
   - Total number of requests shown
   - Status of specific requests (look for "Fulfilling" or "Ordered" status)
   - Request numbers and their current states
   - Take a screenshot or write down specific request details for comparison
3. Keep this tab open for reference

---

## Step 3: Test Scenario 1 - Automatic Refresh
### Part A: Navigate to Fulfill Requests
1. From the Supply Requests dropdown, click **"Fulfill Requests"**
2. Find a requisition that you can modify (status should be "Fulfilling")
3. **Note the current details:**
   - Request number
   - Current quantities
   - Status

### Part B: Make Changes to Supply Request
1. Click on a specific requisition to open it
2. Review the requisition details and line items
3. Make one of these changes:
   - **Approve quantities**: Adjust the approved quantity for one or more line items
   - **Modify allocations**: Change supplying facilities if applicable
   - **Add remarks**: Add or modify remarks
4. Click **"Submit"** or **"Save"** to confirm your changes
5. Wait for the success confirmation message

### Part C: Navigate Back to View Supply Requests
1. From the Supply Requests dropdown, click **"View Supply Requests"**
2. **Observe immediately:** The page should show updated information without manual refresh
3. **Compare with baseline:**
   - Check if the request status changed
   - Verify quantities are updated
   - Confirm the changes you made are reflected

### Expected Results for Step 3:
✅ Changes appear immediately in "View Supply Requests"  
✅ No manual page refresh needed  
✅ Request status reflects the changes made  
✅ Quantities and allocations are updated  

---

## Step 4: Test Scenario 2 - URL Parameter Refresh
1. In the same browser tab, manually add the refresh parameter:
   ```
   http://your-domain/#/orders/fulfillment?refresh=true
   ```
2. Press Enter to navigate to this URL
3. **Observe the behavior:**
   - Page should automatically reload with fresh data
   - The `refresh=true` parameter should disappear from the URL after reload
   - No infinite reload loop should occur

### Expected Results for Step 4:
✅ Page reloads automatically  
✅ URL parameter is removed after reload  
✅ No infinite reloading  

---

## Step 5: Test Scenario 3 - Browser Console Test
1. Navigate to **"View Supply Requests"** page
2. Open browser developer tools:
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Opt+I` (Mac)
   - **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Opt+K` (Mac)
3. Click on the **Console** tab
4. Copy and paste this test script:

```javascript
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
    } else {
        console.log('ℹ No refresh parameter in current URL (this is normal)');
    }
    
    console.log('Test completed. Check the console output above.');
}

// Run the test
testSupplyRequestRefresh();
```

5. Press `Enter` to execute the script
6. **Check the console output:**
   - Should show "✓ refreshOrders method is available"
   - Should show "✓ refreshOrders method executed successfully"
   - No error messages should appear

### Expected Results for Step 5:
✅ All console tests pass  
✅ No JavaScript errors  
✅ refreshOrders method is functional  

---

## Step 6: Test Scenario 4 - Manual Refresh Verification
1. Open **"View Supply Requests"** in a new tab
2. In the first tab, make changes via **"Fulfill Requests"**
3. Return to the second tab and manually refresh with `F5`
4. **Verify:** Updated data appears correctly

### Expected Results for Step 6:
✅ Manual refresh shows updated information  
✅ No cached/stale data persists  

---

## Step 7: Network Verification (Advanced)
1. Keep browser developer tools open
2. Click on the **Network** tab
3. Clear the network log (trash icon)
4. Perform the refresh operations from previous steps
5. **Look for:**
   - Fresh API calls to order endpoints
   - `orderRepository.search()` calls with updated parameters
   - No cached responses (should show 200 status codes)

### Expected Results for Step 7:
✅ Fresh API calls are made  
✅ No cached responses  
✅ Proper request parameters  

---

## Troubleshooting Guide

### If Changes Don't Appear:
1. **Check browser console** for JavaScript errors
2. **Verify network requests** are being made successfully
3. **Confirm user permissions** for both fulfillment and viewing
4. **Check if backend services** are running properly

### If Infinite Reload Occurs:
1. **Check the URL** - `refresh=true` should disappear after initial load
2. **Clear browser cache** and try again
3. **Check for other extensions** that might interfere with page reload

### If Console Tests Fail:
1. **Ensure you're on the correct page** ("View Supply Requests")
2. **Wait for page to fully load** before running tests
3. **Check if AngularJS is properly loaded**

---

## Success Indicators

Your fix is working correctly if you observe:
- ✅ **Immediate updates**: Changes in fulfillment appear instantly in view requests
- ✅ **No manual refresh needed**: Data updates automatically
- ✅ **Smooth navigation**: No loading issues or errors
- ✅ **Console tests pass**: All browser console tests show success
- ✅ **No infinite loops**: Page reloads properly without getting stuck

---

## Reporting Results

When reporting test results, include:
1. **Browser and version** used
2. **OpenLMIS version** tested
3. **Which scenarios passed/failed**
4. **Any error messages** from browser console
5. **Network request details** if applicable
6. **Screenshots** of before/after states

---

## Quick Reference Checklist

- [ ] Baseline data recorded
- [ ] Changes made in fulfillment
- [ ] Automatic refresh verified
- [ ] URL parameter test passed
- [ ] Console tests successful
- [ ] Manual refresh works
- [ ] Network requests verified
- [ ] No errors in console
- [ ] No infinite reload loops
