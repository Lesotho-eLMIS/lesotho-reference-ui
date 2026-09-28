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

        // Commented out - superseded by the majorCountInProgress watches
        // added below (on vm.physicalInventoryType, vm.program.id and
        // vm.facility.id). This watch only ever set a local variable
        // (draft.isStarter) as a side effect and its return value was never
        // used by anything, since $scope.$watch listeners are not
        // consumed.
        //
        // $scope.$watch(function () { return vm.program; }, function (newVal, oldVal) {
        //
        //     if (newVal === oldVal) return;
        //     // if (vm.adjustmentType !== 'receive') return; // only show options in Receive flow
        //
        //     if (newVal == null || newVal == undefined) {
        //
        //         return;
        //
        //     } else {
        //
        //         var draft = vm.getDraft();
        //
        //         if (draft && draft.id) {
        //             draft.isStarter = false;
        //             return draft;
        //         }
        //     }
        // });


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
         * @ngdoc property
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name majorCountInProgress
         * @type {Boolean}
         *
         * @description
         * Whether the Major count currently has real progress (at least one
         * counted line item), independent of which tab is active. This is
         * what lets the button show "Continue Major Count" instead of
         * "Start Major Count", and persists correctly across toggling to
         * Cyclic and back to Major as long as program and facility do not
         * change.
         *
         * Deliberately not derived from vm.drafts / getSelectedDraft(),
         * because the summary list resolved for this page does not carry
         * lineItems and cannot reflect real progress. Deliberately not
         * derived from a draft's isStarter flag either, since isStarter only
         * tracks whether this browser session has opened the draft before,
         * not whether it has any counted quantity.
         */
        vm.majorCountInProgress = false;

        // Guards against a stale response overwriting a newer check, for
        // example if program or facility change again before the previous
        // getDraft call resolves.
        var progressCheckToken = 0;

        /**
         * @ngdoc method
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name checkMajorProgress
         *
         * @description
         * Single source of truth for vm.majorCountInProgress. Reuses the same
         * physicalInventoryService.getDraft call and the same hasProgress
         * calculation already used inside editDraft's Cyclic branch below,
         * instead of introducing a second way of detecting progress.
         */
        function checkMajorProgress() {
            if (!vm.program || !vm.program.id || !vm.facility || !vm.facility.id) {
                vm.majorCountInProgress = false;
                return $q.resolve(false);
            }

            var thisCheck = ++progressCheckToken;
            var programId = vm.program.id;
            var facilityId = vm.facility.id;

            return physicalInventoryService.getDraft(programId, facilityId)
                .then(function (serverDrafts) {
                    if (thisCheck !== progressCheckToken) {
                        return vm.majorCountInProgress;
                    }
                    if (!vm.program || vm.program.id !== programId ||
                        !vm.facility || vm.facility.id !== facilityId) {
                        return vm.majorCountInProgress;
                    }

                    var hasProgress = false;
                    if (Array.isArray(serverDrafts) && serverDrafts.length > 0 && serverDrafts[0].id) {
                        var lineItems = serverDrafts[0].lineItems || [];
                        hasProgress = lineItems.some(function (item) {
                            return item.quantity !== null &&
                                item.quantity !== undefined &&
                                item.quantity !== -1;
                        });
                    }

                    vm.majorCountInProgress = hasProgress;
                    return hasProgress;
                })
                .catch(function () {
                    return vm.majorCountInProgress;
                });
        }

        // Reliable trigger for tab changes. Calls the existing vm.onChangePhysicalInventoryType() so its behavior stays exactly
        // the same, then re-checks Major progress whenever the Major tab becomes active. The flag is not reset when switching to Cyclic,
        // which is what makes it survive Major to Cyclic to Major toggling.
        $scope.$watch(function () {
            return vm.physicalInventoryType;
        }, function (newType, oldType) {
            if (newType === oldType) {
                return;
            }
            vm.onChangePhysicalInventoryType();
            if (newType === 'Major') {
                checkMajorProgress();
            }
        });

        // Program watch. Resets the flag on a real change so a previous program's progress never leaks, then re-checks. Also re-checks on
        // the first digest if a program is already selected at that point (a restored selection), since no change event would follow that.
        $scope.$watch(function () {
            return vm.program ? vm.program.id : null;
        }, function (newId, oldId) {
            if (newId === oldId) {
                if (newId) {
                    checkMajorProgress();
                }
                return;
            }
            vm.majorCountInProgress = false;
            if (newId) {
                checkMajorProgress();
            }
        });

        // Facility watch. Same treatment as the program watch.
        $scope.$watch(function () {
            return vm.facility ? vm.facility.id : null;
        }, function (newId, oldId) {
            if (newId === oldId) {
                if (newId) {
                    checkMajorProgress();
                }
                return;
            }
            vm.majorCountInProgress = false;
            if (newId) {
                checkMajorProgress();
            }
        });

        // Immediate check at construction, in case program and facility are already resolved when this controller is built.
        checkMajorProgress();

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

            // if (!draft) {
            //     alertService.error('No draft found');
            //     return $q.reject();
            // }
            if (!vm.program || !vm.facility) {
                alertService.error('stockPhysicalInventory.selectProgramAndFacility');
                return $q.reject();
            }


            // Cyclic path - check server live for a Major count in progress before allowing navigation. physicalInventoryService.getDraft is used directly
            // (not the factory) to get the raw server response with lineItems and quantities. vm.program.id and vm.facility.id are always the currently
            // selected values from openlmis-facility-program-select two-way binding, so supervised facilities are handled correctly.
            if (vm.physicalInventoryType === 'Cyclic') {
                // Check if a Major count is in progress, and whether a server
                // draft already exists at all. Major and Cyclic share one
                // server draft per program and facility, so this same live
                // response is used for both decisions instead of two calls.
                return physicalInventoryService.getDraft(vm.program.id, vm.facility.id)
                    .then(function (serverDrafts) {
                        var existingServerDraft = null;
                        if (Array.isArray(serverDrafts) && serverDrafts.length > 0 && serverDrafts[0].id) {
                            existingServerDraft = serverDrafts[0];
                        }

                        if (existingServerDraft) {
                            var lineItems = existingServerDraft.lineItems || [];
                            var hasProgress = lineItems.some(function (item) {
                                return item.quantity !== null &&
                                    item.quantity !== undefined &&
                                    item.quantity !== -1;
                            });
                            if (hasProgress) {
                                alertService.error('stockPhysicalInventory.majorCountInProgress');
                                return $q.reject();
                            }

                            // Fix: a server draft already exists for this
                            // program and facility with no real progress yet.
                            // This is now the common case after a Cyclic
                            // refresh, since the refresh redirect back to the
                            // picker page means the passed-in draft parameter
                            // is always falsy here, regardless of whether a
                            // server draft was already created before the
                            // refresh (for example by adding a product to the
                            // count). The old code only checked draft.id on
                            // that passed-in parameter, so it always fell
                            // through to createDraft and the server correctly
                            // rejected it with "already exists". Reusing the
                            // id from the live response fetched above avoids
                            // that collision regardless of how the page was
                            // reached.
                            return navigateToCyclic({
                                id: existingServerDraft.id,
                                programId: vm.program.id
                            });
                        }

                        // No server draft at all yet for this program and
                        // facility. Safe to create one.
                        return physicalInventoryService.createDraft(vm.program.id, vm.facility.id)
                            .then(function (newDraft) {
                                return navigateToCyclic({
                                    id: newDraft.id,
                                    programId: vm.program.id
                                });
                            });
                    });
            }


            // Get the draft , prefer passed draft, then find existing, else create new 
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
            vm.drafts.forEach(function (item) {
                if (item.programId === selectedDraft.programId &&
                    selectedDraft.isStarter === true) {
                    item.isStarter = false;
                }
            });
            $state.go('openlmis.stockmanagement.physicalInventory.draft', {
                // Fix: was id: undefined, which produced a URL with an empty
                // :id segment (/physicalInventory/?...). In-app navigation
                // does not care, but on a raw browser refresh ui-router must
                // match that URL back to a state, and with non-strict
                // matching an empty trailing segment is ambiguous between
                // the parent list state (/physicalInventory) and this draft
                // state (/physicalInventory/:id). The parent is registered
                // first and wins, so a refresh silently landed on the list
                // page without the draft resolve ever running. A non-empty
                // sentinel makes the URL unambiguous. The Cyclic branch of
                // the draft resolve never reads $stateParams.id (it works
                // purely off programId/facilityId), so the sentinel is
                // otherwise inert.
                id: 'cyclic',
                program: vm.program,
                facility: vm.facility,
                // Also carried as plain ids in the URL itself (see
                // physical-inventory-draft.routes.js url pattern). vm.program
                // and vm.facility above are full objects only available via
                // this in-app navigation; a raw browser refresh cannot see
                // them, so the draft resolve falls back to these ids instead.
                programId: vm.program.id,
                facilityId: vm.facility.id,
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