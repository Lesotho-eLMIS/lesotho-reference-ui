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
     * @ngdoc controller
     * @name requisition-view.controller:RequisitionViewController
     *
     * @description
     * Controller for managing requisitions.
     */
    angular
        .module('requisition-view')
        .controller('RequisitionViewController', RequisitionViewController);

    RequisitionViewController.$inject = [
        '$state', 'requisition', 'requisitionValidator', 'requisitionService', 'loadingModalService', 'alertService',
        'notificationService', 'confirmService', 'offlineService', '$window', 'requisitionUrlFactory', '$filter',
        '$scope', 'RequisitionWatcher', 'accessTokenFactory', 'messageService', 'stateTrackerService',
        'RequisitionStockCountDateModal', 'localStorageFactory', 'canSubmit', 'canAuthorize', 'canApproveAndReject',
        'canDelete', 'canSkip', 'canSync', 'program', 'facility', 'processingPeriod',
        'rejectionReasonModalService', '$q', 'TB_STORAGE', 'LEPROSY_STORAGE', '$rootScope', 'RequisitionViewService', 'homeFacility'
    ];
       
    function RequisitionViewController($state, requisition, requisitionValidator, requisitionService,
                                       loadingModalService, alertService, notificationService, confirmService,
                                       offlineService, $window, requisitionUrlFactory, $filter, $scope,
                                       RequisitionWatcher, accessTokenFactory, messageService, stateTrackerService,
                                       RequisitionStockCountDateModal, localStorageFactory, canSubmit, canAuthorize,
                                       canApproveAndReject, canDelete, canSkip, canSync, program, facility, 
                                       processingPeriod, rejectionReasonModalService, $q, TB_STORAGE, LEPROSY_STORAGE, 
                                       $rootScope, RequisitionViewService, homeFacility) {

        var vm = this,
            watcher = new RequisitionWatcher($scope, requisition, localStorageFactory('requisitions'));
        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name requisition
         * @type {Object}
         *
         * @description
         * Holds requisition.
         */
        vm.requisition = requisition;

        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name program
         * @type {Object}
         *
         * @description
         * Holds requisition program.
         */
        vm.program = undefined;

        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name facility
         * @type {Object}
         *
         * @description
         * Holds requisition facility.
         */
        vm.facility = undefined;

        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name processingPeriod
         * @type {Object}
         *
         * @description
         * Holds requisition processing period.
         */
        vm.processingPeriod = undefined;

        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name requisitionType
         * @type {String}
         *
         * @description
         * Holds message key to display, depending on the requisition type (regular/emergency/report-only).
         */
        vm.requisitionType = undefined;

        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name requisitionTypeClass
         * @type {String}
         *
         * @description
         * Holds CSS class to use, depending on the requisition type (regular/emergency/report-only).
         */
        vm.requisitionTypeClass = undefined;

        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name invalidNonFullSupply
         * @type {Boolean}
         *
         * @description
         * False if non-full supply tab is valid, true otherwise.
         */
        vm.invalidNonFullSupply = undefined;

        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name invalidFullSupply
         * @type {Boolean}
         *
         * @description
         * False if full supply tab is valid, true otherwise.
         */
        vm.invalidFullSupply = undefined;

        /**
         * ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name displaySubmitButton
         * @type {Boolean}
         *
         * @description
         * Flag defining whether current user should see the submit button.
         */
        vm.displaySubmitButton = undefined;

        /**
         * ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name displaySubmitAndAuthorizeButton
         * @type {Boolean}
         *
         * @description
         * Flag defining whether current user should see the submit and authorize button.
         */
        vm.displaySubmitAndAuthorizeButton = undefined;

        /**
         * ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name displayAuthorizeButton
         * @type {Boolean}
         *
         * @description
         * Flag defining whether current user should see the authorize button.
         */
        vm.displayAuthorizeButton = undefined;

        /**
         * ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name displayDeleteButton
         * @type {Boolean}
         *
         * @description
         * Flag defining whether current user should see the delete button.
         */
        vm.displayDeleteButton = undefined;

        /**
         * ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name displayApproveAndRejectButtons
         * @type {Boolean}
         *
         * @description
         * Flag defining whether current user should see the approve and reject buttons.
         */
        vm.displayApproveAndRejectButtons = undefined;

        /**
         * ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name displaySkipButton
         * @type {Boolean}
         *
         * @description
         * Flag defining whether current user should see the skip button.
         */
        vm.displaySkipButton = undefined;

        /**
         * ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name displaySyncButton
         * @type {Boolean}
         *
         * @description
         * Flag defining whether current user should see the sync to server button.
         */
        vm.displaySyncButton = undefined;

        /**
         * ngdoc property
         * @propertyOf requisition-view.controller:RequisitionViewController
         * @name patientsTabEnabled
         * @type {Boolean}
         *
         * @description
         * Flag to define requisition tab names whenever patientsTabEnabled is true or false.
         */
        vm.patientsTabEnabled = vm.requisition.template.patientsTabEnabled;

        // Functions
        vm.$onInit = onInit;
        vm.updateRequisition = updateRequisition;
        vm.syncRnr = syncRnr;
        vm.syncRnrAndPrint = syncRnrAndPrint;
        vm.submitRnr = submitRnr;
        vm.authorizeRnr = authorizeRnr;
        vm.removeRnr = removeRnr;
        vm.approveRnr = approveRnr;
        vm.rejectRnr = rejectRnr;
        vm.skipRnr = skipRnr;
        vm.isOffline = offlineService.isOffline;
        vm.getPrintUrl = getPrintUrl;
        vm.isFullSupplyTabValid = isFullSupplyTabValid;
        vm.isNonFullSupplyTabValid = isNonFullSupplyTabValid;
        vm.close = close;
        vm.loadRejectionReasonModal = loadRejectionReasonModal;
        vm.goToRedistribution = goToRedistribution;
        
        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name $onInit
         *
         * @description
         * Initialization method of the RequisitionViewController.
         */
        function onInit() {
            setTypeAndClass();
            vm.program = program;
            vm.facility = facility;
            vm.processingPeriod = processingPeriod;
            vm.displaySubmitButton = canSubmit && !vm.program.skipAuthorization;
            vm.displaySubmitAndAuthorizeButton = canSubmit && vm.program.skipAuthorization;
            vm.displayAuthorizeButton = canAuthorize;
            vm.displayDeleteButton = canDelete;
            vm.displayApproveAndRejectButtons = canApproveAndReject;
            vm.displayRejectButton = canApproveAndReject && !vm.requisition.extraData.originalRequisition;
            vm.displaySkipButton = canSkip;
            vm.displaySyncButton = canSync;
            vm.homeFacility = homeFacility;
        }

        function goToRedistribution(requisitionId) {
            $state.go('openlmis.redistribution', {
                rnr: requisitionId,
                requisition: vm.requisition
            });   

        } 

        vm.isEmergencyRequisition = function(){
          
            if(vm.requisition.emergency && (vm.homeFacility.type.code === "dist_store" || vm.homeFacility.type.code === "central_store") ){
                return true;
            }
            else{
                return false;
            }
        }

        vm.inDHMTForApproval = function(){
            if(vm.requisition.hasOwnProperty('supervisoryNode')){
                if((vm.homeFacility.type.code === "dist_store" || vm.homeFacility.type.code === "central_store") && vm.requisition.status === "IN_APPROVAL"){
                    return false;
                }
                else{
                    return true;
                }
            }
            else{
                return true;
            }
        }

        function setTypeAndClass() {
            if (vm.requisition.emergency) {
                vm.requisitionType = 'requisitionView.emergency';
                vm.requisitionTypeClass = 'emergency';
            } else if (vm.requisition.reportOnly) {
                vm.requisitionType = 'requisitionView.reportOnly';
                vm.requisitionTypeClass = 'report-only';
            } else {
                vm.requisitionType = 'requisitionView.regular';
                vm.requisitionTypeClass = 'regular';
            }
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name updateRequisition
         *
         * @description
         * After confirming with the user, the offline requisition is removed,
         * and the state is reloaded. This will fetch a fresh version of the
         * requisition.
         *
         * If the browser is offline, an error will be thrown, and nothing will
         * change.
         *
         */
        function updateRequisition() {
            if (offlineService.isOffline()) {
                alertService.error('requisitionView.updateOffline');
                return;
            }

            confirmService.confirm('requisitionView.updateWarning', 'requisitionView.update')
                .then(function() {
                    requisitionService.removeOfflineRequisition(requisition.id);
                    $state.reload();
                });
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name syncRnr
         *
         * @description
         * Responsible for syncing requisition with the server. If the requisition fails to sync,
         * an error notification will be displayed. Otherwise, a success notification will be shown.
         * If the error status is 409 (conflict), the requisition will be reloaded, since this
         * indicates a version conflict.
         */
        function syncRnr() {
            var loadingPromise = loadingModalService.open();
            saveRnr().then(function() {
                loadingPromise.then(function() {
                    notificationService.success('requisitionView.sync.success');
                });
                reloadState();
            }, function(response) {
                handleSaveError(response.status);
            });
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name syncRnrAndPrint
         *
         * @description
         * Responsible for syncing requisition with the server. If the requisition fails to sync,
         * an error notification will be displayed. Otherwise, a success notification will be shown
         * and the requisition will be printed.
         * If the error status is 409 (conflict), the requisition will be reloaded, since this
         * indicates a version conflict.
         */
        function syncRnrAndPrint() {
            if (vm.displaySyncButton) {
                var popup = $window.open('', '_blank');
                popup.document.write(messageService.get('requisitionView.sync.pending'));
                var loadingPromise = loadingModalService.open();
                saveRnr().then(function() {
                    watcher.disableWatcher();
                    loadingPromise.then(function() {
                        notificationService.success('requisitionView.sync.success');
                    });
                    popup.location.href = accessTokenFactory.addAccessToken(vm.getPrintUrl());
                    reloadState();
                }, function(response) {
                    handleSaveError(response.status);
                    popup.close();
                });
            } else {
                $window.open(accessTokenFactory.addAccessToken(vm.getPrintUrl()), '_blank');
            }
        }

        function saveRnr() {
            vm.requisition.$modified = false;
            return vm.requisition.$save();
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name submitRnr
         *
         * @description
         * Responsible for submitting requisition. Displays confirmation dialog, and checks
         * requisition validity before submission. If the requisition is not valid, fails to save or
         * an error occurs during submission, an error notification modal will be displayed.
         * Otherwise, a success notification modal will be shown.
         */
        function submitRnr() {
            confirmService.confirm('requisitionView.submit.confirm', 'requisitionView.submit.label').then(function() {
                if (requisitionValidator.validateRequisition(requisition) && validatePatientsTable()) {
                    addPatientsDataToRequisition();

                    if (requisitionValidator.areAllLineItemsSkipped(requisition.requisitionLineItems)) {
                        failWithMessage('requisitionView.allLineItemsSkipped')();
                    } else if (vm.program.enableDatePhysicalStockCountCompleted) {
                        var modal = new RequisitionStockCountDateModal(vm.requisition);
                        modal.then(saveThenSubmit);
                    } else {
                        saveThenSubmit();
                    }
                } else {
                    $rootScope.$broadcast('isSubmitInProgress', true);
                    $scope.$broadcast('openlmis-form-submit');
                    failWithMessage('requisitionView.rnrHasErrors')();
                }
            });
                

            function saveThenSubmit() {
                var loadingPromise = loadingModalService.open();
                vm.requisition.$save().then(function() {
                    vm.requisition.$submit().then(function() {
                        watcher.disableWatcher();
                        loadingPromise.then(function() {
                            notificationService.success('requisitionView.submit.success');
                            clearPatientsLocalStorage();
                        });
                        stateTrackerService.goToPreviousState('openlmis.requisitions.initRnr');
                    }, loadingModalService.close);
                }, function(response) {
                    handleSaveError(response.status);
                });
            }
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name authorizeRnr
         *
         * @description
         * Responsible for authorizing requisition. Displays confirmation dialog, and checks
         * requisition validity before authorization. If the requisition is not valid, fails to
         * save or an error occurs during authorization, an error notification modal will be
         * displayed.
         * Otherwise, a success notification modal will be shown.
         */
        function authorizeRnr() {
            confirmService.confirm(
                'requisitionView.authorize.confirm',
                'requisitionView.authorize.label'
            ).then(function() {
                if (requisitionValidator.validateRequisition(requisition) && validatePatientsTable()) {
                    addPatientsDataToRequisition();

                    if (requisitionValidator.areAllLineItemsSkipped(requisition.requisitionLineItems)) {
                        failWithMessage('requisitionView.allLineItemsSkipped')();
                    } else if (vm.program.enableDatePhysicalStockCountCompleted) {
                        var modal = new RequisitionStockCountDateModal(vm.requisition);
                        modal.then(saveThenAuthorize);
                    } else {
                        saveThenAuthorize();
                    }
                } else {
                    $rootScope.$broadcast('isSubmitInProgress', true);
                    $scope.$broadcast('openlmis-form-submit');
                    failWithMessage('requisitionView.rnrHasErrors')();
                }
            });

            function saveThenAuthorize() {
                var loadingPromise = loadingModalService.open();
                vm.requisition.$save().then(function() {
                    vm.requisition.$authorize().then(function() {
                        watcher.disableWatcher();
                        loadingPromise.then(function() {
                            notificationService.success('requisitionView.authorize.success');
                            clearPatientsLocalStorage();
                        });
                        stateTrackerService.goToPreviousState('openlmis.requisitions.initRnr');
                    }, loadingModalService.close);
                }, function(response) {
                    handleSaveError(response.status);
                });
            }
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name removeRnr
         *
         * @description
         * Responsible for removing requisition. Displays confirmation dialog before deletion.
         * If an error occurs during authorization, it will display an error notification modal.
         * Otherwise, a success notification modal will be shown.
         */
        function removeRnr() {
            confirmService.confirmDestroy(
                'requisitionView.delete.confirm',
                'requisitionView.delete.label'
            ).then(function() {
                var loadingPromise = loadingModalService.open();
                vm.requisition.$remove().then(function() {
                    watcher.disableWatcher();
                    loadingPromise.then(function() {
                        notificationService.success('requisitionView.delete.success');
                        clearPatientsLocalStorage();
                    });
                    stateTrackerService.goToPreviousState('openlmis.requisitions.initRnr');
                }, loadingModalService.close);
            });
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name approveRnr
         *
         * @description
         * Responsible for approving requisition. Displays confirmation dialog, and checks
         * requisition validity before approval. If the requisition is not valid or it fails to
         * save, an error notification modal will be displayed.
         * Otherwise, a success notification modal will be shown.
         */
        function approveRnr() {
            // Unskip skipped line items when approving
            vm.requisition.requisitionLineItems.forEach(function (lineItem) {
                if (lineItem.requestedQuantity > 0) {
                    lineItem.skipped = "";
                }
            });
            confirmService.confirm(
                'requisitionView.approve.confirm',
                'requisitionView.approve.label'
            ).then(function () {
                if (requisitionValidator.validateRequisition(requisition)) {
                    var loadingPromise = loadingModalService.open();
                    vm.requisition.$save().then(function () {
                        vm.requisition.$approve().then(function () {
                            watcher.disableWatcher();
                            loadingPromise.then(function () {
                                notificationService.success('requisitionView.approve.success');
                                clearPatientsLocalStorage();
                            });
                            stateTrackerService.goToPreviousState('openlmis.requisitions.approvalList');
                        }, loadingModalService.close);
                    }, function (response) {
                        handleSaveError(response.status);
                    });
                } else {
                    $scope.$broadcast('openlmis-form-submit');
                    failWithMessage('requisitionView.rnrHasErrors')();
                }
            });
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name rejectRnr
         *
         * @description
         * Responsible for rejecting requisition. Displays confirmation dialog before rejection.
         * If an error occurs during rejecting it will display an error notification modal.
         * Otherwise, a success notification modal will be shown.
         */
        function rejectRnr() {
            loadRejectionReasonModal().then(function(rejectionReasons) {
                confirmService.confirmDestroy(
                    'requisitionView.reject.confirm',
                    'requisitionView.reject.label'
                ).then(function() {
                    loadingModalService.open();
                    vm.requisition.$save()
                        .then(function() {
                            return vm.requisition.$reject(rejectionReasons);
                        })
                        .then(function() {
                            watcher.disableWatcher();
                            notificationService.success('requisitionView.reject.success');
                            stateTrackerService.goToPreviousState('openlmis.requisitions.approvalList');
                            clearPatientsLocalStorage();
                        })
                        .catch(loadingModalService.close);
                });
            });
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name loadRejectionReasonModal
         *
         * @description
         * Display rejection reason dialog if enabled.
         */
        function loadRejectionReasonModal() {
            return $q(function(resolve)  {
                if (vm.requisition.template.rejectionReasonWindowVisible) {
                    rejectionReasonModalService.open().then(function(rejectionReasons) {
                        resolve(rejectionReasons);
                    });
                } else {
                    resolve();
                }
            });
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name skipRnr
         *
         * @description
         * Responsible for skipping requisition. Displays confirmation dialog before skipping.
         * If an error occurs during skipping it will display an error notification modal.
         * Otherwise, a success notification modal will be shown.
         */
        function skipRnr() {
            confirmService.confirm(
                'requisitionView.skip.confirm',
                'requisitionView.skip.label'
            ).then(function() {
                var loadingPromise = loadingModalService.open();
                vm.requisition.$skip().then(function() {
                    watcher.disableWatcher();
                    loadingPromise.then(function() {
                        notificationService.success('requisitionView.skip.success');
                    });
                    stateTrackerService.goToPreviousState('openlmis.requisitions.initRnr');
                }, failWithMessage('requisitionView.skip.failure'));
            });
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name getPrintUrl
         *
         * @description
         * Prepares a print URL for the given requisition.
         *
         * @return {String} the prepared URL
         */
        function getPrintUrl() {
            return requisitionUrlFactory('/api/requisitions/' + vm.requisition.id + '/print');
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name isFullSupplyTabValid
         *
         * @description
         * Checks whether full supply tab has any errors. This method ignores skipped line items and
         * does not trigger validation.
         *
         * @return {Boolean} true if full supply tab has any errors, false otherwise
         */
        function isFullSupplyTabValid() {
            var fullSupplyItems = $filter('filter')(vm.requisition.requisitionLineItems, {
                    $program: {
                        fullSupply: true
                    }
                }, true),
                valid = requisitionValidator.areLineItemsValid(fullSupplyItems);

            vm.invalidFullSupply = valid ? undefined : messageService.get('requisitionView.requisition.error');

            return valid;
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionViewController
         * @name isNonFullSupplyTabValid
         *
         * @description
         * Checks whether non full supply tab has any errors. This method ignores skipped line items
         * and does not trigger validation.
         *
         * @return {Boolean} true if non full supply tab has any errors, false otherwise
         */
        function isNonFullSupplyTabValid() {
            var nonFullSupplyItems = $filter('filter')(vm.requisition.requisitionLineItems, {
                    $program: {
                        fullSupply: false
                    }
                }, true),
                valid = requisitionValidator.areLineItemsValid(nonFullSupplyItems);

            vm.invalidNonFullSupply = valid ? undefined : messageService.get('requisitionView.requisition.error');

            return valid;
        }

        function handleSaveError(status) {
            if (status === 409) {
                // in case of conflict, use the server version
                notificationService.error('requisitionView.versionMismatch');
                reloadState();
            } else if (status === 403) {
                // 403 means user lost rights or requisition changed status
                notificationService.error('requisitionView.updateForbidden');
                reloadState();
            } else {
                failWithMessage('requisitionView.sync.failure')();
            }
        }

        function reloadState() {
            $state.reload();
        }

        function failWithMessage(message) {
            return function() {
                loadingModalService.close();
                alertService.error(message);
            };
        }

        function clearPatientsLocalStorage() {
            localStorageFactory(TB_STORAGE).clearAll();
            localStorageFactory(LEPROSY_STORAGE).clearAll();
        }

        function getFromLocalStorage(storageName) {
            return localStorageFactory(storageName).getAll();
        }

        function validatePatientsTable() {
            var TBArray = getFromLocalStorage(TB_STORAGE);
            var LeprosyArray = getFromLocalStorage(LEPROSY_STORAGE);

            // When PatientsTab is not enabled should return true
            if (!requisition.template.patientsTabEnabled) {
                return true;
            }

            return RequisitionViewService.isArrayFullyFilled(TBArray) &&
                RequisitionViewService.isArrayFullyFilled(LeprosyArray);
        }

        function addPatientsDataToRequisition() {
            var TBArray = getFromLocalStorage(TB_STORAGE);
            var LeprosyArray = getFromLocalStorage(LEPROSY_STORAGE);

            vm.requisition.patientsData = JSON.stringify(
                {
                    TBData: TBArray,
                    leprosyData: LeprosyArray
                }
            );
        }
    }
})();
