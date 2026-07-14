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

        // Commented out - replaced with $scope.$watch for reliable toggle handling.
        // This watch depended on the ng-click wiring on the toggle component firing
        // in the right order relative to vm.program changing, which was not reliable.
        // The new watches below (on vm.physicalInventoryType, vm.program.id, and
        // vm.facility.id) replace this behavior and drive vm.majorCountInProgress.
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

        /**
         * @ngdoc method
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name onChangePhysicalInventoryType
         *
         * @description
         * Swaps vm.drafts to point at the Major or Cyclic draft list depending on
         * vm.physicalInventoryType. Kept as-is and reused by the $scope.$watch
         * below, instead of introducing a separate draft-list-swapping function.
         */
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
         * Persists whether the Major count currently has progress, independent of
         * which tab (Major or Cyclic) is active. This lets the button correctly
         * show "Continue Major Count" after toggling away to Cyclic and back to
         * Major, as long as the program and facility have not changed.
         */
        vm.majorCountInProgress = false;

        // Guards against a stale async response overwriting a newer evaluation,
        // for example if the user changes program or facility again before the
        // previous physicalInventoryService.getDraft call resolves.
        var progressCheckToken = 0;

        /**
         * @ngdoc method
         * @propertyOf stock-physical-inventory-list.controller:PhysicalInventoryListController
         * @name checkMajorProgress
         *
         * @description
         * Single source of truth for vm.majorCountInProgress. Reuses the exact
         * same physicalInventoryService.getDraft call and the exact same
         * hasProgress calculation that editDraft already uses for the
         * Cyclic-blocking check.
         *
         * Key fix compared to the previous attempt: this no longer trusts the
         * summary drafts list (draftsForMajor) at all. That list does not carry
         * lineItems, so any progress detection based on it silently produced
         * false. This function always asks the server directly and derives the
         * flag from the server response only.
         *
         * The console.log lines are tagged MAJOR-PROGRESS so the flow can be
         * traced in DevTools. Remove them once the feature is verified working.
         */
        function checkMajorProgress(reason) {
            console.log('[MAJOR-PROGRESS] checkMajorProgress called, reason:', reason,
                'program:', vm.program ? vm.program.id : null,
                'facility:', vm.facility ? vm.facility.id : null);

            if (!vm.program || !vm.program.id || !vm.facility || !vm.facility.id) {
                vm.majorCountInProgress = false;
                console.log('[MAJOR-PROGRESS] missing program or facility, flag set to false');
                return $q.resolve(false);
            }

            var thisCheck = ++progressCheckToken;
            var programId = vm.program.id;
            var facilityId = vm.facility.id;

            return physicalInventoryService.getDraft(programId, facilityId)
                .then(function (serverDrafts) {
                    console.log('[MAJOR-PROGRESS] getDraft resolved:', serverDrafts);

                    // A newer check has started, or the selection changed while
                    // this call was in flight. Discard this result.
                    if (thisCheck !== progressCheckToken) {
                        console.log('[MAJOR-PROGRESS] stale response discarded');
                        return vm.majorCountInProgress;
                    }
                    if (!vm.program || vm.program.id !== programId ||
                        !vm.facility || vm.facility.id !== facilityId) {
                        console.log('[MAJOR-PROGRESS] selection changed, response discarded');
                        return vm.majorCountInProgress;
                    }

                    var hasProgress = false;
                    if (Array.isArray(serverDrafts) && serverDrafts.length > 0 && serverDrafts[0].id) {
                        var lineItems = serverDrafts[0].lineItems || [];
                        console.log('[MAJOR-PROGRESS] draft id:', serverDrafts[0].id,
                            'lineItems count:', lineItems.length);
                        hasProgress = lineItems.some(function (item) {
                            return item.quantity !== null &&
                                item.quantity !== undefined &&
                                item.quantity !== -1;
                        });
                    } else {
                        console.log('[MAJOR-PROGRESS] response is not a non-empty array with an id.',
                            'isArray:', Array.isArray(serverDrafts),
                            'If this logs an object instead of an array, the service is',
                            'unwrapping the response differently than expected and the',
                            'array checks here and in editDraft need adjusting.');
                    }

                    vm.majorCountInProgress = hasProgress;
                    console.log('[MAJOR-PROGRESS] majorCountInProgress set to:', hasProgress);
                    return hasProgress;
                })
                .catch(function (error) {
                    console.log('[MAJOR-PROGRESS] getDraft FAILED:', error);
                    return vm.majorCountInProgress;
                });
        }

        // Reliable trigger for tab changes. Calls the existing
        // vm.onChangePhysicalInventoryType() so its behavior stays the same, then
        // re-checks Major progress whenever the Major tab becomes active. The
        // flag itself is not reset when switching to Cyclic, which is what makes
        // it survive Major -> Cyclic -> Major toggling.
        $scope.$watch(function () {
            return vm.physicalInventoryType;
        }, function (newType, oldType) {
            console.log('[MAJOR-PROGRESS] type watch fired:', oldType, '->', newType);
            if (newType === oldType) {
                return;
            }
            vm.onChangePhysicalInventoryType(); // reused as-is
            if (newType === 'Major') {
                checkMajorProgress('type changed to Major');
            }
        });

        // Program watch. Fires on any change of the selected program id,
        // including the very first selection (null -> id) and a restored
        // selection applied by openlmis-facility-program-select after load.
        // Resets the flag first so a previous program's progress never leaks,
        // then re-checks for the new selection.
        $scope.$watch(function () {
            return vm.program ? vm.program.id : null;
        }, function (newId, oldId) {
            console.log('[MAJOR-PROGRESS] program watch fired:', oldId, '->', newId);
            if (newId === oldId) {
                // First digest fires with newId === oldId. If a program is
                // already selected at that point (restored selection), we still
                // need an initial check, because no change event will follow.
                if (newId) {
                    checkMajorProgress('program already set on first digest');
                }
                return;
            }
            vm.majorCountInProgress = false;
            if (newId) {
                checkMajorProgress('program changed');
            }
        });

        // Facility watch. Same treatment as the program watch.
        $scope.$watch(function () {
            return vm.facility ? vm.facility.id : null;
        }, function (newId, oldId) {
            console.log('[MAJOR-PROGRESS] facility watch fired:', oldId, '->', newId);
            if (newId === oldId) {
                if (newId) {
                    checkMajorProgress('facility already set on first digest');
                }
                return;
            }
            vm.majorCountInProgress = false;
            if (newId) {
                checkMajorProgress('facility changed');
            }
        });

        // Immediate check at controller construction. This does not depend on
        // $onInit being invoked (ui-router route controllers do not get the
        // component lifecycle hooks in all versions) and does not depend on any
        // watch firing. If program and facility are already resolved when this
        // controller is built, the button label is correct from the first render.
        checkMajorProgress('controller construction');

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


            // Cyclic path. Checks the server live for a Major count in progress before
            // allowing navigation. physicalInventoryService.getDraft is used directly
            // (not the factory) to get the raw server response with lineItems and
            // quantities. vm.program.id and vm.facility.id are always the currently
            // selected values from openlmis-facility-program-select two-way binding,
            // so supervised facilities are handled correctly.
            if (vm.physicalInventoryType === 'Cyclic') {
                // Step 1: Check if a Major count is in progress
                return physicalInventoryService.getDraft(vm.program.id, vm.facility.id)
                    .then(function (serverDrafts) {
                        // Only block if Major has real progress
                        if (Array.isArray(serverDrafts) && serverDrafts.length > 0 && serverDrafts[0].id) {
                            var lineItems = serverDrafts[0].lineItems || [];
                            var hasProgress = lineItems.some(function (item) {
                                return item.quantity !== null &&
                                    item.quantity !== undefined &&
                                    item.quantity !== -1;
                            });
                            if (hasProgress) {
                                alertService.error('stockPhysicalInventory.majorCountInProgress');
                                return $q.reject();
                            }
                        }

                        // Step 2: draft already has an ID from page load, just navigate
                        if (draft && draft.id) {
                            return navigateToCyclic(draft);
                        }

                        // Step 3: No draft ID. Create one directly, same as Major does
                        return physicalInventoryService.createDraft(vm.program.id, vm.facility.id)
                            .then(function (newDraft) {
                                return navigateToCyclic({
                                    id: newDraft.id,
                                    programId: vm.program.id
                                });
                            });
                    });
            }


            // Get the draft, prefer passed draft, 
            // then find existing, else create new
            var selectedDraft = draft || vm.getDraft();

            vm.drafts.forEach(function (item) {
                if (item.programId === selectedDraft.programId && selectedDraft.isStarter === true) {
                    item.isStarter = false;
                }
            });
            // Keep majorCountInProgress in sync immediately after opening a Major
            // count, so the label is already correct if the user comes straight
            // back to this page.
            vm.majorCountInProgress = true;

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
            //    console.log("Data: ", data);
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