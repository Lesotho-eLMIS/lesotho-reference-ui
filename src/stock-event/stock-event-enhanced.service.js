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
 * http://www.gnu.org/licenses.  For additional information contact info@OpenLMIS.org. 
 */

(function() {

    'use strict';

    /**
     * @ngdoc service
     * @name stock-event.stockEventEnhancedService
     *
     * @description
     * Enhanced stock event service that provides real-time stock update notifications
     * and automatic refresh triggers for stock on hand displays.
     */
    angular
        .module('stock-event')
        .factory('stockEventEnhancedService', factory);

    factory.$inject = [
        '$rootScope', '$timeout', '$q', 'stockEventFactory', 'StockEventRepository',
        'messageService', 'loadingModalService', 'offlineService'
    ];

    function factory(
        $rootScope, $timeout, $q, stockEventFactory, StockEventRepository,
        messageService, loadingModalService, offlineService
    ) {

        var service = {
            createStockEvent: createStockEvent,
            createFromPhysicalInventory: createFromPhysicalInventory,
            createFromAdjustment: createFromAdjustment,
            createFromReceipt: createFromReceipt,
            createFromIssue: createFromIssue,
            notifyStockUpdate: notifyStockUpdate,
            notifyPhysicalInventoryCompleted: notifyPhysicalInventoryCompleted
        };

        return service;

        /**
         * @ngdoc method
         * @methodOf stock-event.stockEventEnhancedService
         * @name createStockEvent
         *
         * @description
         * Creates a new stock event and notifies listeners of stock updates.
         *
         * @param  {Object}  stockEventData  the stock event data
         * @return {Promise}                promise that resolves when stock event is created
         */
        function createStockEvent(stockEventData) {
            var loadingModal = loadingModalService.open();
            
            return StockEventRepository.create(stockEventData)
                .then(function(response) {
                    console.log('✅ Stock event created successfully:', response);
                    
                    // Notify listeners of stock update
                    notifyStockUpdate({
                        facilityId: stockEventData.facilityId,
                        programId: stockEventData.programId,
                        stockEventId: response.id,
                        type: 'stock_event',
                        timestamp: Date.now()
                    });
                    
                    // Notify specific stock event creation
                    $rootScope.$broadcast('stock.event.created', response);
                    
                    messageService.success('stockEvent.createdSuccessfully');
                    return response;
                })
                .catch(function(error) {
                    console.error('❌ Failed to create stock event:', error);
                    messageService.error('stockEvent.createError');
                    return $q.reject(error);
                })
                .finally(function() {
                    loadingModal.close();
                });
        }

        /**
         * @ngdoc method
         * @methodOf stock-event.stockEventEnhancedService
         * @name createFromPhysicalInventory
         *
         * @description
         * Creates stock events from physical inventory data and notifies listeners.
         *
         * @param  {Object}  physicalInventory     the physical inventory data
         * @param  {String}  inventoryType        the type of inventory (Major/Cyclic)
         * @return {Promise}                      promise that resolves when events are created
         */
        function createFromPhysicalInventory(physicalInventory, inventoryType) {
            var loadingModal = loadingModalService.open();
            
            try {
                var stockEvent = stockEventFactory.createFromPhysicalInventory(physicalInventory, inventoryType);
                
                return StockEventRepository.create(stockEvent)
                    .then(function(response) {
                        console.log('✅ Physical inventory stock events created:', response);
                        
                        // Notify listeners of physical inventory completion
                        notifyPhysicalInventoryCompleted({
                            facilityId: physicalInventory.facilityId,
                            programId: physicalInventory.programId,
                            inventoryId: physicalInventory.id,
                            inventoryType: inventoryType,
                            lineItemsCount: physicalInventory.lineItems.length,
                            timestamp: Date.now()
                        });
                        
                        // Notify general stock update
                        notifyStockUpdate({
                            facilityId: physicalInventory.facilityId,
                            programId: physicalInventory.programId,
                            stockEventId: response.id,
                            type: 'physical_inventory',
                            inventoryType: inventoryType,
                            timestamp: Date.now()
                        });
                        
                        messageService.success('stockEvent.physicalInventoryCreated');
                        return response;
                    })
                    .catch(function(error) {
                        console.error('❌ Failed to create physical inventory stock events:', error);
                        messageService.error('stockEvent.physicalInventoryError');
                        return $q.reject(error);
                    });
            } catch (error) {
                console.error('❌ Error creating physical inventory stock events:', error);
                messageService.error('stockEvent.physicalInventoryValidationError');
                return $q.reject(error);
            } finally {
                loadingModal.close();
            }
        }

        /**
         * @ngdoc method
         * @methodOf stock-event.stockEventEnhancedService
         * @name createFromAdjustment
         *
         * @description
         * Creates a stock adjustment event and notifies listeners.
         *
         * @param  {Object}  adjustmentData  the adjustment data
         * @return {Promise}                 promise that resolves when adjustment is created
         */
        function createFromAdjustment(adjustmentData) {
            var stockEventData = {
                facilityId: adjustmentData.facilityId,
                programId: adjustmentData.programId,
                lineItems: adjustmentData.lineItems,
                occurredDate: adjustmentData.occurredDate || new Date().toISOString(),
                signature: adjustmentData.signature,
                reasonFreeText: adjustmentData.reasonFreeText
            };
            
            return createStockEvent(stockEventData)
                .then(function(response) {
                    // Notify specific adjustment event
                    $rootScope.$broadcast('stock.adjustment.created', {
                        stockEvent: response,
                        adjustmentData: adjustmentData
                    });
                    
                    return response;
                });
        }

        /**
         * @ngdoc method
         * @methodOf stock-event.stockEventEnhancedService
         * @name createFromReceipt
         *
         * @description
         * Creates a stock receipt event and notifies listeners.
         *
         * @param  {Object}  receiptData  the receipt data
         * @return {Promise}              promise that resolves when receipt is created
         */
        function createFromReceipt(receiptData) {
            var stockEventData = {
                facilityId: receiptData.facilityId,
                programId: receiptData.programId,
                lineItems: receiptData.lineItems,
                occurredDate: receiptData.occurredDate || new Date().toISOString(),
                signature: receiptData.signature,
                documentNumber: receiptData.documentNumber
            };
            
            return createStockEvent(stockEventData)
                .then(function(response) {
                    // Notify specific receipt event
                    $rootScope.$broadcast('stock.receipt.created', {
                        stockEvent: response,
                        receiptData: receiptData
                    });
                    
                    return response;
                });
        }

        /**
         * @ngdoc method
         * @methodOf stock-event.stockEventEnhancedService
         * @name createFromIssue
         *
         * @description
         * Creates a stock issue event and notifies listeners.
         *
         * @param  {Object}  issueData  the issue data
         * @return {Promise}            promise that resolves when issue is created
         */
        function createFromIssue(issueData) {
            var stockEventData = {
                facilityId: issueData.facilityId,
                programId: issueData.programId,
                lineItems: issueData.lineItems,
                occurredDate: issueData.occurredDate || new Date().toISOString(),
                signature: issueData.signature,
                assignment: issueData.assignment
            };
            
            return createStockEvent(stockEventData)
                .then(function(response) {
                    // Notify specific issue event
                    $rootScope.$broadcast('stock.issue.created', {
                        stockEvent: response,
                        issueData: issueData
                    });
                    
                    return response;
                });
        }

        /**
         * @ngdoc method
         * @methodOf stock-event.stockEventEnhancedService
         * @name notifyStockUpdate
         *
         * @description
         * Notifies all listeners about stock updates.
         *
         * @param  {Object}  updateData  the stock update data
         */
        function notifyStockUpdate(updateData) {
            console.log('🔄 Notifying stock update:', updateData);
            
            // Broadcast general stock update event
            $rootScope.$broadcast('stock.updated', updateData);
            
            // Emit for direct listeners
            $rootScope.$emit('stock.updated.immediate', updateData);
            
            // Store update in session for cross-tab communication
            if (typeof(Storage) !== 'undefined') {
                var updates = JSON.parse(sessionStorage.getItem('stockUpdates') || '[]');
                updates.push(updateData);
                
                // Keep only last 10 updates
                if (updates.length > 10) {
                    updates = updates.slice(-10);
                }
                
                sessionStorage.setItem('stockUpdates', JSON.stringify(updates));
                
                // Trigger storage event for other tabs
                $timeout(function() {
                    sessionStorage.setItem('stockUpdateTrigger', Date.now().toString());
                }, 100);
            }
        }

        /**
         * @ngdoc method
         * @methodOf stock-event.stockEventEnhancedService
         * @name notifyPhysicalInventoryCompleted
         *
         * @description
         * Notifies listeners about physical inventory completion.
         *
         * @param  {Object}  inventoryData  the physical inventory data
         */
        function notifyPhysicalInventoryCompleted(inventoryData) {
            console.log('📋 Notifying physical inventory completed:', inventoryData);
            
            // Broadcast physical inventory completion event
            $rootScope.$broadcast('physicalInventory.completed', inventoryData);
            
            // Emit for direct listeners
            $rootScope.$emit('physicalInventory.completed.immediate', inventoryData);
        }
    }

})();
