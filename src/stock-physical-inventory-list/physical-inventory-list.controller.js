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

        /**
         * @ngdoc property
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name facility
         * @type {Object}
         *
         * @description
         * Holds user's home facility.
         */
        vm.facility = facility;

        /**
         * @ngdoc property
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name physicalInventoryType
         * @type {Object}
         *
         * @description
         * Holds Physical Inventory Type.
         */
        vm.physicalInventoryType = undefined;

        /**
         * @ngdoc property
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name programs
         * @type {Array}
         *
         * @description
         * Holds available programs for home facility.
         */
        vm.programs = programs;

        //vm.drafts = (vm.physicalInventoryType === "Major") ? drafts : draftsForCyclic;

        //Default to Major drafts
        vm.drafts = drafts[0];

        $scope.$watch(function () { return vm.program; }, function (newVal, oldVal) {

            if (newVal === oldVal) return;
            // if (vm.adjustmentType !== 'receive') return; // only show options in Receive flow

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
            // else if (!vm.facility) {
            //     alertService.error('stockPhysicalInventory.noFacilitySelected');
            // }
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
        }

        /**
         * @ngdoc method
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name getProgramName
         *
         * @description
         * Responsible for getting program name based on id.
         *
         * @param {String} id Program UUID
         */
        vm.getProgramName = function (id) {
            return _.find(vm.programs, function (program) {
                return program.id === id;
            }).name;
        };

        /**
         * @ngdoc method
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name getDraftStatus
         *
         * @description
         * Responsible for getting physical inventory status.
         *
         * @param {Boolean} isStarter Indicates starter or saved draft.
         */
        vm.getDraftStatus = function (isStarter) {
            if (isStarter) {
                return messageService.get('stockPhysicalInventory.notStarted');
            }
            return messageService.get('stockPhysicalInventory.draft');

        };

        vm.onChangePhysicalInventoryType = function () {
            vm.drafts = (vm.physicalInventoryType === "Major") ? drafts[0] : drafts[1];
        }

        /**
         * @ngdoc method
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name editDraft
         *
         * @description
         * Navigating to draft physical inventory.
         *
         * @param {Object} draft Physical inventory draft
         */
        function editDraft(draft) {
            $stateParams.stateOffline = setOfflineState();

            if (!draft) {
                alertService.error('No draft found');
                return $q.reject();
            }

            // Cyclic path — check server live for a Major count in progress before
            // allowing navigation. physicalInventoryService.getDraft is used directly
            // (not the factory) to get the raw server response with lineItems and
            // quantities. vm.program.id and vm.facility.id are always the currently
            // selected values from openlmis-facility-program-select two-way binding,
            // so supervised facilities are handled correctly.
            if (vm.physicalInventoryType === 'Cyclic') {
                return physicalInventoryService.getDraft(vm.program.id, vm.facility.id)
                    .then(function(serverDrafts) {
                        if (!Array.isArray(serverDrafts) ||
                            serverDrafts.length === 0 ||
                            !serverDrafts[0].id) {
                            // No Major draft on server -> Cyclic is allowed.
                            return navigateToCyclic(draft);
                        }

                        // A Major draft exists. Only block if it has real progress
                        var lineItems = serverDrafts[0].lineItems || [];
                        var hasProgress = lineItems.some(function(item) {
                            return item.quantity !== null &&
                                item.quantity !== undefined &&
                                item.quantity !== -1; //&&
                                //item.quantity !== 0;
                        });

                        if (hasProgress) {
                            alertService.error('stockPhysicalInventory.majorCountInProgress');
                            return $q.reject();
                        }

                        return navigateToCyclic(draft);
                    });
            }

            // Get the draft , prefer passed draft, 
            // then find existing, else create new
            var selectedDraft = draft || vm.getDraft();

            vm.drafts.forEach(function (item) {
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

            return physicalInventoryService.getDraft(vm.program.id, vm.facility.id).then(function (data) {

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
                    return physicalInventoryService.createDraft(vm.program.id, vm.facility.id).then(function (data) {
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
            // return physicalInventoryService.createDraft(vm.program.id, vm.facility.id).then(function (data) {
            //     //    console.log("Data: ", data);
            //     selectedDraft.id = data.id;
            //     $state.go('openlmis.stockmanagement.physicalInventory.draft', {
            //         id: selectedDraft.id,
            //         program: vm.program,
            //         facility: vm.facility,
            //         supervised: vm.isSupervised,
            //         includeInactive: false,
            //         physicalInventoryType: vm.physicalInventoryType
            //     });
            // });
        }
        
        function navigateToCyclic(draft) {
            var selectedDraft = draft;
            vm.drafts.forEach(function(item) {
                if (item.programId === selectedDraft.programId &&
                    selectedDraft.isStarter === true) {
                    item.isStarter = false;
                }
            });
            $state.go('openlmis.stockmanagement.physicalInventory.draft', {
                id: undefined,
                program: vm.program,
                facility: vm.facility,
                supervised: vm.isSupervised,
                includeInactive: false,
                physicalInventoryType: vm.physicalInventoryType
            });
            return $q.resolve();
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

