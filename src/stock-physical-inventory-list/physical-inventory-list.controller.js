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

        vm.drafts = (vm.physicalInventoryType === "Major") ? drafts : draftsForCyclic;

        $scope.$watch(function () { return vm.program; }, function (newVal, oldVal) {

            if (newVal === oldVal) return;
            // if (vm.adjustmentType !== 'receive') return; // only show options in Receive flow

            if(newVal == null || newVal == undefined) {
                // vm.requisitionsToReceive = facility.requisitionsToReceive;
                // vm.requisitionToReceiveAgainst = null; // reset selected requisition when program changes
                console.log("Starting");
                return;

            }else {
                console.log('Drafts' , vm.drafts);
                console.log("Programme: ", newVal);
                var draft = vm.getDraft();
                console.log("Draft: ", draft);
                if (draft.id) {
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
                draft.isStarter = false;
            }
            // else if (!vm.facility) {
            //     alertService.error('stockPhysicalInventory.noFacilitySelected');
            // }
            var programId = vm.program.id;
            return _.find(vm.drafts, function (programId) {
                console.log("Program: ", vm.program);
                console.log("Draft: ", draft);
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
            // console.log("Edit: ", draft);
            // console.log("Drafts: ", vm.drafts);
            // console.log("Program: ", vm.program);
            // console.log("Facility: ", vm.facility);
            // console.log("Selected:" , vm.getDraft());
            $stateParams.stateOffline = setOfflineState();
            var selectedDraft = vm.getDraft();

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
            return physicalInventoryService.createDraft(vm.program.id, vm.facility.id).then(function (data) {
                //    console.log("Data: ", data);
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

