/*
 * Stock Event Enhanced Service - Triggers stock refresh events
 * This service broadcasts events when supply requests are processed
 */

(function() {
    'use strict';

    angular
        .module('stock-event')
        .service('stockEventEnhancedService', stockEventEnhancedService);

    stockEventEnhancedService.$inject = ['$rootScope'];

    function stockEventEnhancedService($rootScope) {

        /**
         * Notify stock update - broadcasts events for auto-refresh
         */
        this.notifyStockUpdate = function(updateData) {
            console.log('📢 Broadcasting stock update:', updateData);

            // Broadcast stock update event
            $rootScope.$broadcast('stock.updated', updateData);

            // Cross-tab communication
            sessionStorage.setItem('stockUpdateTrigger', Date.now().toString());
        };

        /**
         * Trigger supply request processed event - CORE TASK REQUIREMENT
         */
        this.notifySupplyRequestProcessed = function(supplyRequestData) {
            console.log('📢 Broadcasting supply request processed:', supplyRequestData);

            // Broadcast supply request processed event
            $rootScope.$broadcast('supplyRequest.processed', supplyRequestData);

            // Cross-tab communication
            sessionStorage.setItem('supplyRequestTrigger', Date.now().toString());
        };

        /**
         * Create event from physical inventory completion
         */
        this.createFromPhysicalInventory = function(physicalInventory) {
            const updateData = {
                facilityId: physicalInventory.facilityId,
                programId: physicalInventory.programId,
                type: 'physicalInventory.completed',
                timestamp: Date.now(),
                source: 'physicalInventory'
            };

            this.notifyStockUpdate(updateData);
        };

        /**
         * Create event from supply request processing - MAIN TASK
         */
        this.createFromSupplyRequest = function(supplyRequest) {
            const requestData = {
                facilityId: supplyRequest.facilityId,
                programId: supplyRequest.programId,
                type: 'supplyRequest.processed',
                timestamp: Date.now(),
                source: 'supplyRequest',
                requestId: supplyRequest.id,
                products: supplyRequest.products || []
            };

            this.notifySupplyRequestProcessed(requestData);
        };
    }
})();
