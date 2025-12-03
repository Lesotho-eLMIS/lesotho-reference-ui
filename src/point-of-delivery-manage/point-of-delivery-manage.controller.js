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
     * @name point-of-delivery-manage.controller:pointOfDeliveryManageController
     *
     * @description
     * Controller for point of delivery manage.
     */
    angular
        .module('point-of-delivery-manage')
        .controller('pointOfDeliveryManageController', pointOfDeliveryManageController);

    pointOfDeliveryManageController.$inject = [
        '$rootScope', '$state', '$stateParams', 'facility', 'facilities', 'facilityService', 'offlineService', 'pointOfDeliveryService',
        '$scope', 'notificationService', 'podEvents', 'confirmService', 'alertService'];

    function pointOfDeliveryManageController($rootScope, $state, $stateParams, facility, facilities, facilityService, offlineService,
        pointOfDeliveryService, $scope, notificationService, podEvents, confirmService, alertService) {


        var vm = this;

        vm.maxDate = new Date();
        vm.maxDate.setHours(23, 59, 59, 999);
        vm.supplyingFacilities = facilities;
        vm.$onInit = onInit;
        vm.facility = facility;
        vm.POD = {};
        vm.discrepancy = {};
        vm.tempPOD = undefined;
        vm.proofOfDelivery = {};
        vm.Cartons = "Cartons";
        vm.Containers = "Containers";
        vm.facilities = undefined;

        vm.homeFacilities = [facility];
        vm.validateConsignment = validateConsignment;

        /**
            * @ngdoc method
            * @methodOf point-of-delivery-manage.controller:pointOfDeliveryManageController
            * @name $onInit
            *
            * @description
            * Initialization method called after the controller has been created. Responsible for
            * setting data to be available on the view.
            */
        function onInit() {

            vm.receivingFacility = facility.name;
            vm.supplyingFacilities = facilities;
            vm.offline = $stateParams.offline === 'true' || offlineService.isOffline();
            vm.POD.referenceNo = $rootScope.referenceNoPOD; // Getting  Ref Number from Quality Checks
            $rootScope.referenceNoPOD = undefined; // Clear Var on Root Scope 
            if ($stateParams.podId) {
                vm.tempPOD = filterShipmentById(podEvents, $stateParams.podId);
                populatePODView(vm.tempPOD);
            }

        }

        function filterShipmentById(shipments, id) {
            if (shipments.hasOwnProperty(id)) {
                return shipments[id];
            } else {
                return null;
            }
        }

        vm.addDiscrepancyOnModal = function (shipmentType, currentDiscrepancies) {
            pointOfDeliveryService.show(shipmentType, currentDiscrepancies).then(function () {
                $stateParams.noReload = true;
                draft.$modified = true;
                vm.cacheDraft();
                //Only reload current state and avoid reloading parent state
                $state.go($state.current.name, $stateParams, {
                    reload: $state.current.name
                });
            });
        }

        /**
         * @ngdoc method
         * @methodOf point-of-delivery-manage.controller:pointOfDeliveryManageController
         * @name populatePODView
         *
         * @description
         * Loads view with POD data to edit
         */
        async function populatePODView(podObject) {
            vm.POD.referenceNo = podObject.referenceNumber;
            vm.POD.receivedDate = podObject.packingDate;
            vm.POD.packedBy = podObject.packedBy;
            vm.POD.cartonsQuantityOnWaybill = podObject.cartonsQuantityOnWaybill;
            vm.POD.cartonsQuantityAccepted = podObject.cartonsQuantityAccepted;
            vm.POD.cartonsQuantityRejected = podObject.cartonsQuantityRejected;
            // vm.POD.containersQuantityOnWayBill = podObject.containersQuantityOnWaybill;
            // vm.POD.containersQuantityAccepted = podObject.containersQuantityAccepted;
            // vm.POD.containersQuantityRejected = podObject.containersQuantityRejected;
            let supplyingFacility = await vm.getSupplyingFacilityName(podObject.sourceId);
            vm.POD.supplyingFacility = vm.supplyingFacilities.find(facility => facility.id === supplyingFacility.id);
        }

        /**
         * @ngdoc method
         * @methodOf point-of-delivery-manage.controller:pointOfDeliveryManageController
         * @name buildPayload
         *
         * @description
         * Builds POD receive payload for sending to backend
         */
        vm.buildPayload = function () {

            var discrepancyList = pointOfDeliveryService.getDiscrepancies();

            var payloadData = {
                sourceId: vm.POD.supplyingFacility.id,
                destinationId: vm.POD.receivingFacility.id,
                referenceNumber: vm.POD.referenceNo,
                packingDate: vm.POD.receivedDate,
                packedBy: vm.POD.packedBy,
                cartonsQuantityOnWaybill: vm.POD ? vm.POD.cartonsQuantityOnWaybill : null,
                cartonsQuantityShipped: vm.POD ? (vm.POD.cartonsQuantityRejected + vm.POD.cartonsQuantityAccepted) : null,
                cartonsQuantityAccepted: vm.POD ? vm.POD.cartonsQuantityAccepted : null,
                // containersQuantityOnWaybill: vm.POD ? vm.POD.containersQuantityOnWayBill : null,
                // containersQuantityShipped: vm.POD ? (vm.POD.containersQuantityAccepted + vm.POD.containersQuantityRejected) : null,
                // containersQuantityAccepted: vm.POD ? vm.POD.containersQuantityAccepted : null,
                discrepancies: discrepancyList
            };
            const inputsValid = vm.validatePODinputs(payloadData);
            const consignmentValid = validateConsignment(payloadData);
            if (inputsValid && consignmentValid) {
                    vm.submitPOD(payloadData);
            } else {
                alertService.error('pointOfDeliveryManage.emptyConsignment');
            }
        };

        //Perform validation to ensure that all mandatory form data is filled in
        vm.validatePODinputs = function (podInputs) {

            const hasreference = podInputs.hasOwnProperty('referenceNumber') && podInputs.referenceNumber;
            const hasSupplyingFacility = podInputs.hasOwnProperty('sourceId') && podInputs.sourceId;
            const hasreceivingFacility = podInputs.hasOwnProperty('destinationId') && podInputs.destinationId;
            const hasPackingDate = podInputs.hasOwnProperty('packingDate') && podInputs.packingDate;
            const hasPacker = podInputs.hasOwnProperty('packedBy') && podInputs.packedBy;

            if (!(hasreference)) {
                alertService.error('Reference number details missing');
            } else if (!(hasSupplyingFacility)) {
                alertService.error("Supplying facility details missing");
            } else if (!(hasreceivingFacility)) {
                alertService.error("Receiving facility details missing");
            } else if (!(hasPackingDate)) {
                alertService.error("Packing date data missing");
            } else if (!(hasPacker)) {
                alertService.error("Consignment packer details missing");
            } else {
                return true;
            }
        };

        /**
         * @ngdoc method
         * @methodOf point-of-delivery-manage.controller:pointOfDeliveryManageController
         * @name validateConsignment
         *
         * @description
         * Function validates to ensure POD form is not submitted with zero cartons and containers
         */
        function validateConsignment(consignmentDetails) {

            const hasCartonsQuantity = consignmentDetails.hasOwnProperty('cartonsQuantityOnWaybill') && consignmentDetails.cartonsQuantityOnWaybill;
            // const hasContainersQuantity = consignmentDetails.hasOwnProperty('containersQuantityOnWaybill') && consignmentDetails.containersQuantityOnWaybill;
            const hasCartonsAcceptedQuantity = consignmentDetails.hasOwnProperty('cartonsQuantityAccepted') && consignmentDetails.cartonsQuantityAccepted;
            // const hasContainersAcceptedQuantity = consignmentDetails.hasOwnProperty('containersQuantityAccepted') && consignmentDetails.containersQuantityAccepted;
            

            //Check if Cartons and Containers have values
            if (!(hasCartonsQuantity && hasCartonsAcceptedQuantity)) {
                return false;
            }

            return true;
        }

        /**
         * @ngdoc method
         * @methodOf point-of-delivery-manage.controller:pointOfDeliveryManageController
         * @name submitPOD
         *
         * @description
         * Sends POD payload to backend and confirms
         */
        vm.submitPOD = function (payloadData) {

            if (vm.tempPOD) {
                // call the edit POD method here    
                confirmService
                    .confirm("Are you sure you want to edit this point of delivery event?", 'Edit')
                    .then(function () {
                        pointOfDeliveryService.editPOD(vm.tempPOD.id, payloadData)
                            .then(function (response) {
                                // Success callback
                                vm.tempPOD = undefined;
                                vm.clearForm();
                                notificationService.success('point of delivery event Edited.');
                                $state.go('openlmis.pointOfDelivery.view');
                            })
                            .catch(function (error) {
                                // Error callback
                                notificationService.error('Failed to edit.');
                                console.error('Error occurred:', error);
                            });
                    });
            } else {
                //Saving New POD event
                confirmService
                    .confirm("Are you sure you want to submit this point of delivery event?", 'Submit')
                    .then(function () {
                        pointOfDeliveryService.submitPodManage(payloadData)
                            .then(function (response) {
                                vm.clearForm();
                                notificationService.success('point of delivery event Submitted.');
                                $state.go('openlmis.pointOfDelivery.view');
                            })
                            .catch(function (error) {
                                // Error callback
                                notificationService.error('Failed to submit.');
                                console.error('Error occurred:', error);

                            });
                    });
            }
        };

        /**
         * @ngdoc method
         * @methodOf point-of-delivery-manage.controller:pointOfDeliveryManageController
         * @name clearForm
         *
         * @description
         * Clears all form fields from POD form
         */
        vm.clearForm = function () {
            vm.POD = {};
            vm.discrepancy = [];
            vm.proofOfDelivery = {};
            pointOfDeliveryService.clearDiscrepancies();
            $scope.podManageForm.$setPristine();
            $scope.podManageForm.$setUntouched();
        };


        vm.getSupplyingFacilityName = async function (supplyingFacilityId) {
            try {
                var facilityObject = await facilityService.get(supplyingFacilityId);
                return facilityObject;
            } catch (error) {
                // Handle any errors that may occur during the query
                console.error("Error:", error);
                return ""; // Or handle the error appropriately
            }
        };

        vm.addSupplyingFacility = async function (eventPODs) {
            try {
                // Create an array of Promises
                const promises = Object.keys(eventPODs).map(async key => {
                    const singlePODEvent = eventPODs[key];

                    // Check whether SourceId has a value before calling
                    if (singlePODEvent.sourceId) {
                        try {
                            const resolvedObject = await vm.getSupplyingFacilityName(singlePODEvent.sourceId);
                            singlePODEvent.sourceName = resolvedObject.name;
                        } catch (error) {
                            // Handle errors
                            console.error('Error in controller:', error);
                        }
                    }

                    return singlePODEvent;
                });

                // Await all Promises to resolve
                const eventPODsWithSupplierNames = await Promise.all(promises);

                return eventPODsWithSupplierNames.reduce((acc, curr, index) => {
                    acc[index] = curr;
                    return acc;
                }, {});
            } catch (error) {
                // Handle any errors that may occur during processing
                console.error('Error:', error);
                return {};
            }
        };

    }
})();
