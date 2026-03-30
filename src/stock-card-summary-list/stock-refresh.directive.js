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
     * @ngdoc directive
     * @name stock-card-summary-list.stockRefresh
     *
     * @description
     * Directive that provides automatic stock refresh functionality with visual indicators.
     */
    angular
        .module('stock-card-summary-list')
        .directive('stockRefresh', stockRefresh);

    stockRefresh.$inject = ['$rootScope', '$timeout', '$window', 'messageService'];

    function stockRefresh($rootScope, $timeout, $window, messageService) {
        var directive = {
            restrict: 'E',
            scope: {
                facilityId: '=',
                programId: '=',
                onRefresh: '&',
                autoRefresh: '=?',
                refreshInterval: '=?'
            },
            template: `
                <div class="stock-refresh-container" ng-show="showRefreshButton">
                    <button type="button" class="btn btn-primary" ng-click="refreshStock()" ng-disabled="isRefreshing">
                        <i class="fa" ng-class="isRefreshing ? 'fa-spinner fa-spin' : 'fa-refresh'"></i>
                        {{isRefreshing ? 'Refreshing...' : 'Refresh Stock'}}
                    </button>
                    <div class="refresh-status" ng-show="lastRefreshTime">
                        Last updated: {{lastRefreshTime | date:'shortTime'}}
                    </div>
                    <div class="auto-refresh-status" ng-show="autoRefresh">
                        <i class="fa fa-clock-o"></i> Auto-refresh: {{refreshInterval/1000}}s
                    </div>
                </div>
            `,
            link: link
        };

        return directive;

        function link(scope, element, attrs) {
            // Initialize properties
            scope.isRefreshing = false;
            scope.lastRefreshTime = null;
            scope.showRefreshButton = true;
            scope.autoRefresh = scope.autoRefresh !== false; // Default to true
            scope.refreshInterval = scope.refreshInterval || 30000; // Default 30 seconds
            
            var refreshTimer;
            var storageListener;

            // Initialize
            init();

            function init() {
                // Set up event listeners
                setupEventListeners();
                
                // Start auto-refresh if enabled
                if (scope.autoRefresh) {
                    startAutoRefresh();
                }
                
                // Listen for storage events (cross-tab communication)
                setupStorageListener();
                
                // Cleanup on destroy
                scope.$on('$destroy', cleanup);
            }

            /**
             * Sets up event listeners for stock updates
             */
            function setupEventListeners() {
                // Listen for stock updates
                var stockUpdateListener = $rootScope.$on('stock.updated', function(event, data) {
                    if (shouldRefreshForUpdate(data)) {
                        $timeout(function() {
                            scope.refreshStock();
                        }, 1000);
                    }
                });

                // Listen for physical inventory completion
                var physicalInventoryListener = $rootScope.$on('physicalInventory.completed', function(event, data) {
                    if (shouldRefreshForInventory(data)) {
                        $timeout(function() {
                            scope.refreshStock();
                        }, 1500);
                    }
                });

                // Store listeners for cleanup
                scope.stockUpdateListener = stockUpdateListener;
                scope.physicalInventoryListener = physicalInventoryListener;
            }

            /**
             * Sets up storage event listener for cross-tab communication
             */
            function setupStorageListener() {
                storageListener = function(event) {
                    if (event.key === 'stockUpdateTrigger') {
                        $timeout(function() {
                            scope.refreshStock();
                        }, 500);
                    }
                };

                $window.addEventListener('storage', storageListener);
            }

            /**
             * Starts auto-refresh timer
             */
            function startAutoRefresh() {
                if (refreshTimer) {
                    $timeout.cancel(refreshTimer);
                }

                refreshTimer = $timeout(function() {
                    scope.refreshStock();
                    startAutoRefresh(); // Schedule next refresh
                }, scope.refreshInterval);
            }

            /**
             * Stops auto-refresh timer
             */
            function stopAutoRefresh() {
                if (refreshTimer) {
                    $timeout.cancel(refreshTimer);
                    refreshTimer = null;
                }
            }

            /**
             * Determines if refresh should be triggered for stock update
             */
            function shouldRefreshForUpdate(updateData) {
                if (!scope.facilityId || !scope.programId) {
                    return false;
                }

                // Check if update affects current facility and program
                if (updateData.facilityId && updateData.facilityId !== scope.facilityId) {
                    return false;
                }

                if (updateData.programId && updateData.programId !== scope.programId) {
                    return false;
                }

                return true;
            }

            /**
             * Determines if refresh should be triggered for physical inventory
             */
            function shouldRefreshForInventory(inventoryData) {
                if (!scope.facilityId || !scope.programId) {
                    return false;
                }

                // Check if inventory affects current facility and program
                if (inventoryData.facilityId && inventoryData.facilityId !== scope.facilityId) {
                    return false;
                }

                if (inventoryData.programId && inventoryData.programId !== scope.programId) {
                    return false;
                }

                return true;
            }

            /**
             * Refreshes stock data
             */
            scope.refreshStock = function() {
                if (scope.isRefreshing) {
                    return; // Prevent multiple simultaneous refreshes
                }

                scope.isRefreshing = true;
                console.log('🔄 Stock refresh triggered by directive');

                // Call the provided refresh callback
                if (scope.onRefresh) {
                    var refreshPromise = scope.onRefresh();
                    
                    if (refreshPromise && typeof refreshPromise.then === 'function') {
                        refreshPromise
                            .then(function() {
                                onRefreshSuccess();
                            })
                            .catch(function(error) {
                                onRefreshError(error);
                            })
                            .finally(function() {
                                scope.isRefreshing = false;
                            });
                    } else {
                        // Synchronous refresh
                        onRefreshSuccess();
                        scope.isRefreshing = false;
                    }
                } else {
                    // Default refresh behavior - emit global refresh event
                    $rootScope.$broadcast('stock.refresh.requested', {
                        facilityId: scope.facilityId,
                        programId: scope.programId,
                        timestamp: Date.now()
                    });
                    
                    onRefreshSuccess();
                    scope.isRefreshing = false;
                }
            };

            /**
             * Handles successful refresh
             */
            function onRefreshSuccess() {
                scope.lastRefreshTime = new Date();
                console.log('✅ Stock refresh completed successfully');
                
                // Show success message
                messageService.success('stock.refresh.success');
            }

            /**
             * Handles refresh error
             */
            function onRefreshError(error) {
                console.error('❌ Stock refresh failed:', error);
                messageService.error('stock.refresh.error');
            }

            /**
             * Cleanup function
             */
            function cleanup() {
                // Cancel timers
                stopAutoRefresh();
                
                // Remove event listeners
                if (scope.stockUpdateListener) {
                    scope.stockUpdateListener();
                }
                if (scope.physicalInventoryListener) {
                    scope.physicalInventoryListener();
                }
                if (storageListener) {
                    $window.removeEventListener('storage', storageListener);
                }
            }

            // Watch for facility/program changes
            scope.$watch('facilityId', function(newVal, oldVal) {
                if (newVal !== oldVal) {
                    scope.lastRefreshTime = null; // Reset refresh time
                }
            });

            scope.$watch('programId', function(newVal, oldVal) {
                if (newVal !== oldVal) {
                    scope.lastRefreshTime = null; // Reset refresh time
                }
            });

            // Watch for auto-refresh changes
            scope.$watch('autoRefresh', function(newVal) {
                if (newVal) {
                    startAutoRefresh();
                } else {
                    stopAutoRefresh();
                }
            });
        }
    }

})();
