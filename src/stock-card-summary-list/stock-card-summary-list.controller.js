/*
 * This program is part of OpenLMIS logistics management information system platform software.
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

    angular
        .module('stock-card-summary-list')
        .controller('StockCardSummaryListController', StockCardSummaryListController);

    StockCardSummaryListController.$inject = [
        '$q', '$scope', '$timeout', '$state', '$stateParams', 'confirmModalService',
        'loadingModalService', 'StockCardSummaryRepository', 'StockCardSummaryRepositoryImpl',
        'messageService', 'confirmService', 'alertService', '$rootScope', 'offlineService',
        'quantityUnitService', 'stockCardService'
    ];

    function StockCardSummaryListController($q, $scope, $timeout, $state, $stateParams,
        confirmModalService, loadingModalService, StockCardSummaryRepository,
        StockCardSummaryRepositoryImpl, messageService, confirmService, alertService, $rootScope,
        offlineService, quantityUnitService, stockCardService) {

        var vm = this;
        vm.$scope = $scope;
        vm.$timeout = $timeout;
        vm.$state = $state;
        vm.$stateParams = $stateParams;
        vm.confirmModalService = confirmModalService;
        vm.loadingModalService = loadingModalService;
        vm.messageService = messageService;
        vm.confirmService = confirmService;
        vm.alertService = alertService;
        vm.$rootScope = $rootScope;
        vm.quantityUnitService = quantityUnitService;
        vm.stockCardService = stockCardService;

        // Properties
        vm.pagedList = [];
        vm.stockCardSummaries = [];
        vm.displayStockCardSummaries = [];
        vm.facility = undefined;
        vm.program = undefined;
        vm.productCode = undefined;
        vm.productName = undefined;
        vm.lotCode = undefined;
        vm.includeInactive = false;
        vm.quantityUnit = undefined;
        vm.isRefreshing = false;
        vm.isSupervised = $stateParams.supervised;

        // Auto-refresh variables
        var autoRefreshTimer;
        var AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

        // Methods
        vm.loadStockCardSummaries = loadStockCardSummaries;
        vm.refreshStockOnHand = refreshStockOnHand;
        vm.print = print;
        vm.viewSingleCard = viewSingleCard;
        vm.filter = filter;
        vm.recalculateSOHQuantity = recalculateSOHQuantity;
        vm.recalculateSOHSummaryQuantity = recalculateSOHSummaryQuantity;
        vm.showInDoses = showInDoses;
        vm.goToPendingOfflineEventsPage = goToPendingOfflineEventsPage;
        vm.offline = offline;

        // Initialize
        vm.$onInit = function() {
            loadStockCardSummaries();
            setupEventListeners();
            startPeriodicRefresh();
            setupCrossTabCommunication();
        };

        function loadStockCardSummaries() {
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
                if (params[key] === undefined) delete params[key];
            });

            var repository = new StockCardSummaryRepository(new StockCardSummaryRepositoryImpl());
            return repository.query(params).then(function(response) {
                vm.pagedList = response;
                vm.stockCardSummaries = response.content || [];
                vm.displayStockCardSummaries = angular.copy(vm.stockCardSummaries);
                return response;
            });
        }

        function refreshStockOnHand() {
            if (vm.isRefreshing) return;
            vm.isRefreshing = true;
            console.log('🔄 Refreshing stock on hand data...');

            loadStockCardSummaries()
                .then(function() {
                    vm.isRefreshing = false;
                    vm.$scope.$digest();
                    console.log('✅ Stock on hand refreshed successfully:', vm.stockCardSummaries.length, 'items');

                    // Broadcast refresh event
                    vm.$rootScope.$broadcast('stock.summary.refreshed', {
                        count: vm.stockCardSummaries.length,
                        timestamp: Date.now(),
                        facilityId: vm.facility ? vm.facility.id : null,
                        programId: vm.program ? vm.program.id : null
                    });
                })
                .catch(function(error) {
                    console.error('❌ Failed to refresh stock on hand:', error);
                    vm.messageService.error('stockCardSummaryList.refreshError');
                    vm.isRefreshing = false;
                    vm.$scope.$digest();
                });
        }

        function setupEventListeners() {
            // Listen for stock updates
            vm.$rootScope.$on('stock.updated', function(event, data) {
                console.log('🔄 Stock update detected:', data);

                if (vm.facility && vm.program && 
                    (!data.facilityId || data.facilityId === vm.facility.id) &&
                    (!data.programId || data.programId === vm.program.id)) {

                    console.log('🎯 Stock update affects current view - triggering refresh...');
                    vm.$timeout(function() { 
                        vm.refreshStockOnHand(); 
                    }, 1000);
                }
            });

            // Listen for physical inventory completion
            vm.$rootScope.$on('physicalInventory.completed', function(event, data) {
                console.log('🔄 Physical inventory completed:', data);
                if (vm.facility && vm.program && 
                    data.facilityId === vm.facility.id && 
                    data.programId === vm.program.id) {
                    vm.$timeout(function() { 
                        vm.refreshStockOnHand(); 
                    }, 2000);
                }
            });

            // Listen for supply request processing - CORE TASK REQUIREMENT
            vm.$rootScope.$on('supplyRequest.processed', function(event, data) {
                console.log('🔄 Supply request processed:', data);
                if (vm.facility && vm.program && 
                    data.facilityId === vm.facility.id && 
                    data.programId === vm.program.id) {
                    console.log('🎯 Supply request affects current stock - triggering refresh...');
                    vm.$timeout(function() { 
                        vm.refreshStockOnHand(); 
                    }, 1500);
                }
            });
        }

        function startPeriodicRefresh() {
            if (vm.facility && vm.program) {
                autoRefreshTimer = vm.$timeout(function() {
                    console.log('⏰ Periodic refresh triggered');
                    vm.refreshStockOnHand();
                    startPeriodicRefresh();
                }, AUTO_REFRESH_INTERVAL);
            }
        }

        function setupCrossTabCommunication() {
            // Listen for storage events (cross-tab communication)
            window.addEventListener('storage', function(event) {
                if (event.key === 'stockUpdateTrigger' || event.key === 'supplyRequestTrigger') {
                    console.log('🔄 Cross-tab stock update detected');
                    vm.$timeout(function() {
                        vm.refreshStockOnHand();
                    }, 500);
                }
            });
        }

        function filter() {
            var filtered = angular.copy(vm.stockCardSummaries);

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

        function print() {
            if (vm.facility && vm.program) {
                vm.stockCardService.print(vm.facility.id, vm.program.id);
            }
        }

        function viewSingleCard(stockCard) {
            vm.$state.go('openlmis.stockmanagement.stockCard', {
                stockCardId: stockCard.stockCardId
            });
        }

        function recalculateSOHQuantity(stockOnHand, netContent) {
            if (vm.showInDoses()) {
                return vm.quantityUnitService.calculateDoses(stockOnHand, netContent);
            }
            return stockOnHand;
        }

        function recalculateSOHSummaryQuantity(summary) {
            if (vm.showInDoses()) {
                return vm.quantityUnitService.calculateDoses(summary.stockOnHand, summary.orderable.netContent);
            }
            return summary.stockOnHand;
        }

        function showInDoses() {
            return vm.quantityUnit && vm.quantityUnit.code === 'DOSE';
        }

        function goToPendingOfflineEventsPage() {
            vm.$state.go('openlmis.stockmanagement.pendingOfflineEvents');
        }

        function offline() {
            return offlineService.isOffline();
        }

        // Cleanup
        vm.$scope.$on('$destroy', function() {
            if (autoRefreshTimer) {
                vm.$timeout.cancel(autoRefreshTimer);
            }
        });
    }
})();
