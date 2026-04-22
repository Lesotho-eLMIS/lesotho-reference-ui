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

(function () {

    'use strict';

    /**
     * @ngdoc controller
     * @name stock-physical-inventory-list.controller:PhysicalInventoryListController
     *
     * @description
     * Controller for managing physical inventory.
     */
    angular
        .module('stock-physical-inventory-list')
        .controller('PhysicalInventoryListController', controller);

    controller.$inject = ['facility', 'programs', 'drafts', 'messageService', '$state', 'physicalInventoryService',
        'FunctionDecorator', 'offlineService', '$q', '$scope', '$stateParams', 'draftsForCyclic', 'alertService'];

    function controller(facility, programs, drafts, messageService, $state, physicalInventoryService,
        FunctionDecorator, offlineService, $q, $scope, $stateParams, draftsForCyclic, alertService) {
        var vm = this;
        vm.$onInit = onInit;

        localStorage.removeItem('isSubmitted');

        vm.facility = facility;
        vm.physicalInventoryType = undefined;
        vm.programs = programs;

        // Default to Major drafts at init time.
        vm.drafts = drafts[0];

        $scope.$watch(function () { return vm.program; }, function (newVal, oldVal) {
            if (newVal === oldVal) return;
            if (newVal == null || newVal == undefined) {
                return;
            } else {
                var draft = vm.getDraft();
                if (draft && draft.id) {
                    draft.isStarter = false;
                    return draft;
                }
            }
        });

        vm.editDraft = new FunctionDecorator()
            .decorateFunction(editDraft)
            .withLoading(true)
            .getDecoratedFunction();

        vm.getSelectedDraft = function () {
            if (!vm.program || !vm.facility) {
                return null;
            }
            var programId = vm.program.id;
            return _.find(vm.drafts, function (draft) {
                return draft.programId === programId;
            });
        };

        vm.getDraft = function () {
            var programId = vm.program.id;
            return _.find(vm.drafts, function (draft) {
                return draft.programId === programId;
            });
        };

        vm.getProgramName = function (id) {
            return _.find(vm.programs, function (program) {
                return program.id === id;
            }).name;
        };

        vm.getDraftStatus = function (isStarter) {
            if (isStarter) {
                return messageService.get('stockPhysicalInventory.notStarted');
            }
            return messageService.get('stockPhysicalInventory.draft');
        };

        vm.onChangePhysicalInventoryType = function () {
            vm.drafts = (vm.physicalInventoryType === "Major") ? drafts[0] : drafts[1];
        };

        /**
         * @ngdoc method
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name editDraft
         *
         * @description
         * Navigating to draft physical inventory. For Cyclic counts, queries the
         * server live using draft.facilityId and draft.programId to check if a
         * Major count is in progress for that exact facility and program. This
         * avoids the stale in-memory drafts[0] and correctly handles supervised
         * facilities where vm.facility.id is always the home facility.
         *
         * @param {Object} draft Physical inventory draft
         */
        function editDraft(draft) {
            $stateParams.stateOffline = setOfflineState();

            if (!draft) {
                alertService.error('No draft found');
                return $q.reject();
            }

            if (vm.physicalInventoryType === 'Cyclic') {
            // Query server live to get the current Major draft for this facility
            // and program. physicalInventoryService.getDraft is used directly here
            // (not the factory method) so we get the raw server response with
            // lineItems and quantities — the same source used by getDraftByProgramAndFacility.
            return physicalInventoryService.getDraft(vm.program.id, vm.facility.id)
                .then(function(serverDrafts) {
                    if (!Array.isArray(serverDrafts) ||
                        serverDrafts.length === 0 ||
                        !serverDrafts[0].id) {
                        // No Major draft on the server — Cyclic count is allowed.
                        return navigateToCyclic(draft);
                    }

                    // A Major draft exists. Only block if it has real progress —
                    // at least one line item with a quantity entered (not null, not -1).
                    // A draft at 0% (all quantities null/-1) is treated as not started
                    // and does not block the Cyclic count.
                    var lineItems = serverDrafts[0].lineItems || [];
                    var hasProgress = lineItems.some(function(item) {
                        return item.quantity !== null &&
                            item.quantity !== undefined &&
                            item.quantity !== -1;
                    });

                    if (hasProgress) {
                        alertService.error('stockPhysicalInventory.majorCountInProgress');
                        return $q.reject();
                    }

                    return navigateToCyclic(draft);
                });
        }
            // Major path — original logic unchanged.
            var selectedDraft = draft || vm.getDraft();

            vm.drafts.forEach(function(item) {
                if (item.programId === selectedDraft.programId && selectedDraft.isStarter === true) {
                    item.isStarter = false;
                }
            });

            if (offlineService.isOffline() || selectedDraft.id) {
                $state.go('openlmis.stockmanagement.physicalInventory.draft', {
                    id: selectedDraft.id,
                    program: vm.program,
                    facility: vm.facility,
                    supervised: vm.isSupervised,
                    includeInactive: false,
                    physicalInventoryType: vm.physicalInventoryType
                });
                return $q.resolve();
            }

            return physicalInventoryService.getDraft(vm.program.id, vm.facility.id)
                .then(function(data) {
                    if (Array.isArray(data) && data.length > 0 && data[0].id) {
                        selectedDraft.id = data[0].id;
                        $state.go('openlmis.stockmanagement.physicalInventory.draft', {
                            id: selectedDraft.id,
                            program: vm.program,
                            facility: vm.facility,
                            supervised: vm.isSupervised,
                            includeInactive: false,
                            physicalInventoryType: vm.physicalInventoryType
                        });
                    } else {
                        return physicalInventoryService.createDraft(vm.program.id, vm.facility.id)
                            .then(function(data) {
                                selectedDraft.id = data.id;
                                $state.go('openlmis.stockmanagement.physicalInventory.draft', {
                                    id: selectedDraft.id,
                                    program: vm.program,
                                    facility: vm.facility,
                                    supervised: vm.isSupervised,
                                    includeInactive: false,
                                    physicalInventoryType: vm.physicalInventoryType
                                });
                            });
                    }
                });
        }

        function navigateToCyclic(draft) {
        var selectedDraft = draft;
        vm.drafts.forEach(function(item) {
            if (item.programId === selectedDraft.programId &&
                selectedDraft.isStarter === true) {
                item.isStarter = false;
            }
        });
        //if (offlineService.isOffline() || selectedDraft.id) {
            $state.go('openlmis.stockmanagement.physicalInventory.draft', {
                //id: selectedDraft.id,
                id: undefined,
                program: vm.program,
                facility: vm.facility,
                supervised: vm.isSupervised,
                includeInactive: false,
                physicalInventoryType: vm.physicalInventoryType
            });
            return $q.resolve();
        //}
        return physicalInventoryService.createDraft(vm.program.id, vm.facility.id)
            .then(function(data) {
                selectedDraft.id = data.id;
                $state.go('openlmis.stockmanagement.physicalInventory.draft', {
                    id: selectedDraft.id,
                    program: vm.program,
                    facility: vm.facility,
                    supervised: vm.isSupervised,
                    includeInactive: false,
                    physicalInventoryType: vm.physicalInventoryType
                });
            });
    }

        function onInit() {
            if (networkStateHasBeenChanged()) {
                reloadPage();
            }

            $scope.$watch(function () {
                return offlineService.isOffline();
            }, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    reloadPage();
                }
            }, true);
        }

        function reloadPage() {
            $state.go('openlmis.stockmanagement.physicalInventory', {}, {
                reload: true
            });
        }

        function networkStateHasBeenChanged() {
            return $stateParams.stateOffline !== undefined &&
                $stateParams.stateOffline !== offlineService.isOffline();
        }

        function setOfflineState() {
            return offlineService.isOffline();
        }
    }
})();