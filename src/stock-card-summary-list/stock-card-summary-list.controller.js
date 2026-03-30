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
     * @ngdoc controller
     * @name stock-card-summary-list.controller:StockCardSummaryListController
     *
     * @description
     * Controller in charge of displaying stock card summary list with real-time refresh capabilities.
     */
    angular
        .module('stock-card-summary-list')
        .controller('StockCardSummaryListController', controller);

    controller.$inject = [
        '$scope', '$state', '$stateParams', '$timeout', '$window', 'stockCardSummaries', 
        'facilityProgramData', 'paginationService', 'stockCardService', 'messageService',
        'offlineService', 'StockCardSummaryRepository', 'StockCardSummaryRepositoryImpl',
        'loadingModalService', 'confirmDiscardService', 'REASON_TYPES', 'QUANTITY_UNIT',
        'quantityUnitCalculateService', 'stockEventFactory', '$rootScope'
    ];

    function controller(
        $scope, $state, $stateParams, $timeout, $window, stockCardSummaries, 
        facilityProgramData, paginationService, stockCardService, messageService,
        offlineService, StockCardSummaryRepository, StockCardSummaryRepositoryImpl,
        loadingModalService, confirmDiscardService, REASON_TYPES, QUANTITY_UNIT,
        quantityUnitCalculateService, stockEventFactory, $rootScope
    ) {

        var vm = this;
        var refreshInterval;
        var stockUpdateListener;

        vm.$onInit = onInit;
        vm.$onDestroy = onDestroy;
        vm.loadStockCardSummaries = loadStockCardSummaries;
        vm.search = search;
        vm.print = print;
        vm.viewSingleCard = viewSingleCard;
        vm.recalculateSOHQuantity = recalculateSOHQuantity;
        vm.recalculateSOHSummaryQuantity = recalculateSOHSummaryQuantity;
        vm.showInDoses = showInDoses;
        vm.refreshStockOnHand = refreshStockOnHand;
        vm.forceRefresh = forceRefresh;
        vm.isRefreshing = false;

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name quantityUnit
         * @type {Object}
         *
         * @description
         * Holds quantity unit.
         */
        vm.quantityUnit = undefined;

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name stockCardSummaries
         * @type {Array}
         *
         * @description
         * Holds stock card summaries.
         */
        vm.stockCardSummaries = [];

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name displayStockCardSummaries
         * @type {Array}
         *
         * @description
         * Holds filtered stock card summaries for display.
         */
        vm.displayStockCardSummaries = [];

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name pagedList
         * @type {Object}
         *
         * @description
         * Holds paginated list.
         */
        vm.pagedList = undefined;

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name facility
         * @type {Object}
         *
         * @description
         * Holds selected facility.
         */
        vm.facility = undefined;

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name program
         * @type {Object}
         *
         * @description
         * Holds selected program.
         */
        vm.program = undefined;

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name isSupervised
         * @type {Boolean}
         *
         * @description
         * Indicates if supervised facilities should be shown.
         */
        vm.isSupervised = false;

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name includeInactive
         * @type {Boolean}
         *
         * @description
         * Indicates if inactive items should be included.
         */
        vm.includeInactive = false;

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name productCode
         * @type {String}
         *
         * @description
         * Holds product code filter.
         */
        vm.productCode = undefined;

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name productName
         * @type {String}
         *
         * @description
         * Holds product name filter.
         */
        vm.productName = undefined;

        /**
         * @ngdoc property
         * @propertyOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name lotCode
         * @type {String}
         *
         * @description
         * Holds lot code filter.
         */
        vm.lotCode = undefined;

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name onInit
         *
         * @description
         * Initialization method that sets up the controller.
         */
        function onInit() {
            // Initialize data from resolved dependencies
            if (stockCardSummaries) {
                vm.pagedList = stockCardSummaries;
                vm.stockCardSummaries = stockCardSummaries.content || [];
                vm.displayStockCardSummaries = angular.copy(vm.stockCardSummaries);
            }

            // Set facility and program from URL parameters
            if ($stateParams.facility) {
                vm.facility = $stateParams.facility;
            }
            if ($stateParams.program) {
                vm.program = $stateParams.program;
            }

            // Initialize search parameters
            vm.includeInactive = $stateParams.includeInactive === 'true';
            vm.productCode = $stateParams.productCode;
            vm.productName = $stateParams.productName;
            vm.lotCode = $stateParams.lotCode;

            // Check for refresh parameter and trigger refresh if needed
            if ($stateParams.refresh === 'true') {
                refreshStockOnHand();
                // Remove refresh parameter to prevent infinite reload
                $state.go('.', {refresh: null}, {notify: false});
            }

            // Set up stock update listener for real-time updates
            setupStockUpdateListener();

            // Set up periodic refresh (every 30 seconds)
            setupPeriodicRefresh();
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name onDestroy
         *
         * @description
         * Cleanup method called when controller is destroyed.
         */
        function onDestroy() {
            if (refreshInterval) {
                $timeout.cancel(refreshInterval);
            }
            if (stockUpdateListener) {
                stockUpdateListener();
            }
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name setupStockUpdateListener
         *
         * @description
         * Sets up event listeners for stock updates from other parts of the application.
         */
        function setupStockUpdateListener() {
            // Listen for stock update events
            stockUpdateListener = $rootScope.$on('stock.updated', function(event, data) {
                console.log('🔄 Stock update detected:', data);
                
                // Check if the update affects our current view
                if (shouldRefreshForUpdate(data)) {
                    $timeout(function() {
                        refreshStockOnHand();
                    }, 1000); // Small delay to ensure backend has processed the update
                }
            });

            // Listen for stock event creation (adjustments, receipts, issues)
            $rootScope.$on('stock.event.created', function(event, stockEvent) {
                console.log('📦 Stock event created:', stockEvent);
                
                if (shouldRefreshForStockEvent(stockEvent)) {
                    $timeout(function() {
                        refreshStockOnHand();
                    }, 1500); // Slightly longer delay for stock events
                }
            });

            // Listen for physical inventory completion
            $rootScope.$on('physicalInventory.completed', function(event, inventoryData) {
                console.log('📋 Physical inventory completed:', inventoryData);
                
                if (shouldRefreshForPhysicalInventory(inventoryData)) {
                    $timeout(function() {
                        refreshStockOnHand();
                    }, 2000); // Longer delay for physical inventory
                }
            });
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name setupPeriodicRefresh
         *
         * @description
         * Sets up periodic refresh of stock data.
         */
        function setupPeriodicRefresh() {
            // Refresh every 30 seconds to ensure data freshness
            refreshInterval = $timeout(function() {
                if (vm.facility && vm.program) {
                    refreshStockOnHand();
                    setupPeriodicRefresh(); // Schedule next refresh
                }
            }, 30000);
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name shouldRefreshForUpdate
         *
         * @description
         * Determines if a stock update should trigger a refresh.
         *
         * @param  {Object}  updateData  the stock update data
         * @return {Boolean}             true if refresh should be triggered
         */
        function shouldRefreshForUpdate(updateData) {
            if (!vm.facility || !vm.program) {
                return false;
            }

            // Check if update affects current facility and program
            if (updateData.facilityId && updateData.facilityId !== vm.facility.id) {
                return false;
            }

            if (updateData.programId && updateData.programId !== vm.program.id) {
                return false;
            }

            return true;
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name shouldRefreshForStockEvent
         *
         * @description
         * Determines if a stock event should trigger a refresh.
         *
         * @param  {Object}  stockEvent  the stock event
         * @return {Boolean}            true if refresh should be triggered
         */
        function shouldRefreshForStockEvent(stockEvent) {
            if (!vm.facility || !vm.program) {
                return false;
            }

            // Check if stock event affects current facility and program
            if (stockEvent.facilityId && stockEvent.facilityId !== vm.facility.id) {
                return false;
            }

            if (stockEvent.programId && stockEvent.programId !== vm.program.id) {
                return false;
            }

            return true;
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name shouldRefreshForPhysicalInventory
         *
         * @description
         * Determines if a physical inventory should trigger a refresh.
         *
         * @param  {Object}  inventoryData  the physical inventory data
         * @return {Boolean}               true if refresh should be triggered
         */
        function shouldRefreshForPhysicalInventory(inventoryData) {
            if (!vm.facility || !vm.program) {
                return false;
            }

            // Check if physical inventory affects current facility and program
            if (inventoryData.facilityId && inventoryData.facilityId !== vm.facility.id) {
                return false;
            }

            if (inventoryData.programId && inventoryData.programId !== vm.program.id) {
                return false;
            }

            return true;
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name refreshStockOnHand
         *
         * @description
         * Refreshes stock on hand data with loading indicator.
         */
        function refreshStockOnHand() {
            if (vm.isRefreshing) {
                return; // Prevent multiple simultaneous refreshes
            }

            vm.isRefreshing = true;
            console.log('🔄 Refreshing stock on hand data...');

            var params = buildSearchParams();
            
            if (offlineService.isOffline()) {
                refreshOfflineStockCards(params);
            } else {
                refreshOnlineStockCards(params);
            }
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name forceRefresh
         *
         * @description
         * Forces a complete refresh bypassing any caching.
         */
        function forceRefresh() {
            console.log('🔄 Force refreshing stock on hand data...');
            
            // Clear any cached data
            if (vm.pagedList && vm.pagedList.clearCache) {
                vm.pagedList.clearCache();
            }

            // Refresh with timestamp to prevent caching
            $state.go('.', {refresh: 'true', timestamp: Date.now()}, {reload: true});
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name refreshOnlineStockCards
         *
         * @description
         * Refreshes stock cards in online mode.
         *
         * @param  {Object}  params  search parameters
         */
        function refreshOnlineStockCards(params) {
            var repository = new StockCardSummaryRepository(new StockCardSummaryRepositoryImpl());
            
            repository.query(params)
                .then(function(response) {
                    vm.pagedList = response;
                    vm.stockCardSummaries = response.content || [];
                    vm.displayStockCardSummaries = angular.copy(vm.stockCardSummaries);
                    
                    console.log('✅ Stock on hand refreshed successfully:', vm.stockCardSummaries.length, 'items');
                    
                    // Broadcast refresh event for other components
                    $rootScope.$broadcast('stock.summary.refreshed', {
                        count: vm.stockCardSummaries.length,
                        timestamp: Date.now()
                    });
                })
                .catch(function(error) {
                    console.error('❌ Failed to refresh stock on hand:', error);
                    messageService.error('stockCardSummaryList.refreshError');
                })
                .finally(function() {
                    vm.isRefreshing = false;
                });
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name refreshOfflineStockCards
         *
         * @description
         * Refreshes stock cards in offline mode.
         *
         * @param  {Object}  params  search parameters
         */
        function refreshOfflineStockCards(params) {
            var repository = new StockCardSummaryRepository(new StockCardSummaryRepositoryImpl());
            
            repository.query(params)
                .then(function(items) {
                    vm.stockCardSummaries = items.content || items || [];
                    vm.displayStockCardSummaries = angular.copy(vm.stockCardSummaries);
                    
                    console.log('✅ Offline stock on hand refreshed:', vm.stockCardSummaries.length, 'items');
                })
                .catch(function(error) {
                    console.error('❌ Failed to refresh offline stock on hand:', error);
                    messageService.error('stockCardSummaryList.refreshError');
                })
                .finally(function() {
                    vm.isRefreshing = false;
                });
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name buildSearchParams
         *
         * @description
         * Builds search parameters for API calls.
         *
         * @return {Object}  search parameters
         */
        function buildSearchParams() {
            var params = {
                facilityId: vm.facility ? vm.facility.id : undefined,
                programId: vm.program ? vm.program.id : undefined,
                includeInactive: vm.includeInactive,
                orderableCode: vm.productCode,
                orderableName: vm.productName,
                lotCode: vm.lotCode,
                nonEmptyOnly: true
            };

            // Remove undefined parameters
            Object.keys(params).forEach(function(key) {
                if (params[key] === undefined) {
                    delete params[key];
                }
            });

            return params;
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name loadStockCardSummaries
         *
         * @description
         * Loads stock card summaries based on current filters.
         */
        function loadStockCardSummaries() {
            if (!vm.facility || !vm.program) {
                return;
            }

            vm.isRefreshing = true;
            var params = buildSearchParams();
            
            if (offlineService.isOffline()) {
                refreshOfflineStockCards(params);
            } else {
                refreshOnlineStockCards(params);
            }
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name search
         *
         * @description
         * Filters stock card summaries based on search criteria.
         */
        function search() {
            var filtered = angular.copy(vm.stockCardSummaries);
            
            // Apply filters
            if (vm.productCode) {
                filtered = filtered.filter(function(item) {
                    return item.orderable && item.orderable.productCode && 
                           item.orderable.productCode.toLowerCase().indexOf(vm.productCode.toLowerCase()) !== -1;
                });
            }

            if (vm.productName) {
                filtered = filtered.filter(function(item) {
                    return item.orderable && item.orderable.fullProductName && 
                           item.orderable.fullProductName.toLowerCase().indexOf(vm.productName.toLowerCase()) !== -1;
                });
            }

            if (vm.lotCode) {
                filtered = filtered.filter(function(item) {
                    return item.canFulfillForMe && item.canFulfillForMe.some(function(fulfill) {
                        return fulfill.lot && fulfill.lot.lotCode && 
                               fulfill.lot.lotCode.toLowerCase().indexOf(vm.lotCode.toLowerCase()) !== -1;
                    });
                });
            }

            vm.displayStockCardSummaries = filtered;
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name print
         *
         * @description
         * Prints stock card summaries.
         */
        function print() {
            if (vm.facility && vm.program) {
                stockCardService.print(vm.facility.id, vm.program.id);
            }
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name viewSingleCard
         *
         * @description
         * Navigates to single stock card view.
         *
         * @param  {String}  stockCardId  the stock card ID
         */
        function viewSingleCard(stockCardId) {
            $state.go('openlmis.stockmanagement.stockCard', {
                stockCardId: stockCardId,
                refresh: 'true'
            });
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name showInDoses
         *
         * @description
         * Returns whether the screen is showing quantities in doses.
         *
         * @return {boolean} true if the quantities are in doses, false otherwise
         */
        function showInDoses() {
            return vm.quantityUnit === QUANTITY_UNIT.DOSES;
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name recalculateSOHQuantity
         *
         * @description
         * Recalculates the given quantity to packs or doses.
         *
         * @param  {Number}  quantity    the quantity to be recalculated
         * @param  {Number}  netContent  the net content of the product
         * @return {String}             the recalculated quantity
         */
        function recalculateSOHQuantity(quantity, netContent) {
            return quantityUnitCalculateService
                .recalculateSOHQuantity(quantity, netContent, vm.showInDoses());
        }

        /**
         * @ngdoc method
         * @methodOf stock-card-summary-list.controller:StockCardSummaryListController
         * @name recalculateSOHSummaryQuantity
         *
         * @description
         * Recalculates summary quantity to packs or doses.
         *
         * @param  {Object}  summary  the stock card summary
         * @return {String}          the recalculated quantity
         */
        function recalculateSOHSummaryQuantity(summary) {
            return quantityUnitCalculateService
                .recalculateSOHQuantity(summary.stockOnHand, summary.orderable.netContent, vm.showInDoses());
        }
    }

})();
