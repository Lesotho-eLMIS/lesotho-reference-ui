/*
 * This program is part of the OpenLMIS logistics management information system platform software.
 * Copyright © 2017 VillageReach
 *
 * This program is free software: you can redistribute it and/or modify it under the terms
 * of the GNU Affero General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *  
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU Affero General Public License for more details. You should have received a copy of
 * the GNU Affero General Public License along with this program. If not, see
 * http://www.gnu.org/licenses.  For additional information contact info@OpenLMIS.org. 
 */

(function() {

    'use strict';

    /**
     * @ngdoc service
     * @name stock-event.StockEvent
     *
     * @description
     * Represents a single Stock Event.
     */
    angular
        .module('stock-event')
        .factory('StockEvent', StockEvent)
        .service('stockEventEnhancedService', stockEventEnhancedService);

    function StockEvent() {

        return StockEvent;

        /**
         * @ngdoc method
         * @methodOf stock-event.StockEvent
         * @name StockEvent
         *
         * @description
         * Creates a new instance of the Stock Event class.
         *
         * @param  {Object}  physicalInventory   the physical inventory
         * @return {StockEvent}                  the Stock Event object
         */
        function StockEvent(physicalInventory) {
            this.resourceId = physicalInventory.id;
            this.lineItems = physicalInventory.lineItems;
            this.programId = physicalInventory.programId;
            this.facilityId = physicalInventory.facilityId;
            this.signature = physicalInventory.signature;
        }
    }

    /*
     * Stock Event Enhanced Service - Triggers stock refresh events
     * This service broadcasts events when supply requests are processed
     */
    
    stockEventEnhancedService.$inject = ['$rootScope'];

    function stockEventEnhancedService($rootScope) {

        /**
         * Notify stock update - broadcasts events for auto-refresh
         */
        this.notifyStockUpdate = function(updateData) {
            console.log(' Broadcasting stock update:', updateData);

            // Broadcast stock update event
            $rootScope.$broadcast('stock.updated', updateData);

            // Cross-tab communication
            sessionStorage.setItem('stockUpdateTrigger', Date.now().toString());
        };

        /**
         * Trigger supply request processed event - CORE TASK REQUIREMENT
         */
        this.notifySupplyRequestProcessed = function(supplyRequestData) {
            console.log(' Broadcasting supply request processed:', supplyRequestData);

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
