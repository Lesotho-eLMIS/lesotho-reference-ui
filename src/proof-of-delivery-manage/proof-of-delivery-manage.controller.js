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
     * @name proof-of-delivery-manage.controller:ProofOfDeliveryManageController
     *
     * @description
     * Controller for proof of delivery manage page
     */
    angular
        .module('proof-of-delivery-manage')
        .controller('ProofOfDeliveryManageController', controller);

    controller.$inject = [
        'proofOfDeliveryManageService', '$state', 'loadingModalService', 'notificationService', 'pods',
        '$stateParams', 'programs', 'requestingFacilities', 'supplyingFacilities', 'ProofOfDeliveryPrinter'
    ];

    function controller(proofOfDeliveryManageService, $state, loadingModalService, notificationService,
                        pods, $stateParams, programs, requestingFacilities, supplyingFacilities,
                        ProofOfDeliveryPrinter) {
        var vm = this;

        vm.$onInit = onInit;
        vm.openPod = openPod;
        vm.loadOrders = loadOrders;
        vm.printProofOfDelivery = printProofOfDelivery;

        /**
         * @ngdoc property
         * @propertyOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name pods
         * @type {Array}
         *
         * @description
         * Holds pods that will be displayed.
         */
        vm.pods = undefined;

        /**
         * @ngdoc property
         * @propertyOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name programs
         * @type {Array}
         *
         * @description
         * Holds list of supervised programs.
         */
        vm.programs = undefined;

        /**
         * @ngdoc property
         * @propertyOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name requestingFacilities
         * @type {Array}
         *
         * @description
         * Holds list of supervised requesting facilities.
         */
        vm.requestingFacilities = undefined;

        /**
         * @ngdoc property
         * @propertyOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name supplyingFacilities
         * @type {Array}
         *
         * @description
         * Holds list of supervised supplying facilities.
         */
        vm.supplyingFacilities = undefined;

        /**
         * @ngdoc property
         * @propertyOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name program
         * @type {Object}
         *
         * @description
         * Holds selected program.
         */
        vm.program = undefined;

        /**
         * @ngdoc property
         * @propertyOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name requestingFacility
         * @type {Object}
         *
         * @description
         * Holds selected requesting facility.
         */
        vm.requestingFacility = undefined;

        /**
         * @ngdoc property
         * @propertyOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name supplyingFacility
         * @type {Object}
         *
         * @description
         * Holds selected supplying facility.
         */
        vm.supplyingFacility = undefined;

        /**
         * @ngdoc property
         * @propertyOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name facilityName
         * @type {string}
         * 
         * @description
         * The name of the requesting facility for which the Proofs of Delivery are shown.
         */
        vm.facilityName = undefined;

        /**
         * @ngdoc property
         * @propertyOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name programName
         * @type {string}
         * 
         * @description
         * The name of the program for which the Proofs of Delivery are shown.
         */
        vm.programName = undefined;

        /**
         * @ngdoc method
         * @methodOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name $onInit
         *
         * @description
         * Initialization method called after the controller has been created. Responsible for
         * setting data to be available on the view.
         */
        function onInit() {
            vm.pods = pods;
            vm.programs = programs;
            vm.requestingFacilities = requestingFacilities;
            vm.supplyingFacilities = supplyingFacilities;
            vm.program = getSelectedObjectById(programs, $stateParams.programId);
            vm.requestingFacility = getSelectedObjectById(requestingFacilities, $stateParams.requestingFacilityId);
            vm.supplyingFacility = getSelectedObjectById(supplyingFacilities, $stateParams.supplyingFacilityId);
            vm.facilityName = getName(vm.requestingFacility);
            vm.programName = getName(vm.program);
        }

        /**
         * @ngdoc method
         * @methodOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name loadOrders
         *
         * @description
         * Retrieves the list of orders matching the selected requesting facility and program.
         *
         * @return {Array} the list of matching orders
         */
        function loadOrders() {
            var stateParams = angular.copy($stateParams);

            stateParams.programId = vm.program.id;
            stateParams.requestingFacilityId = vm.requestingFacility ? vm.requestingFacility.id : null;
            stateParams.supplyingFacilityId = vm.supplyingFacility ? vm.supplyingFacility.id : null;

            $state.go('openlmis.orders.podManage', stateParams, {
                reload: true
            });
        }

        /**
         *
         * @ngdoc method
         * @methodOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name openPod
         *
         * @description
         * Redirect to POD page.
         *
         * @param {String} orderId id of order to find it's POD
         */
        function openPod(orderId) {
            loadingModalService.open();
            proofOfDeliveryManageService.getByOrderId(orderId)
                .then(function(pod) {
                    $state.go('openlmis.orders.podManage.podView', {
                        podId: pod.id
                    });
                })
                .catch(function() {
                    notificationService.error('proofOfDeliveryManage.noOrderFound');
                    loadingModalService.close();
                });
        }

        /**
         *
         * @ngdoc method
         * @methodOf proof-of-delivery-manage.controller:ProofOfDeliveryManageController
         * @name printProofOfDelivery
         *
         * @description
         * Prints the given proof of delivery.
         *
         * @param  {Object} orderId the UUID of order to find it's POD
         * @return {String}         the prepared URL
         */
        function printProofOfDelivery(orderId) {
            var printer = new ProofOfDeliveryPrinter();

            printer.openTab();

            loadingModalService.open();
            proofOfDeliveryManageService.getByOrderId(orderId)
                .then(function(pod) {
                    printer.setId(pod.id);
                    printer.print();
                })
                .catch(function() {
                    printer.closeTab();
                    notificationService.error('proofOfDeliveryManage.noOrderFound');
                })
                .finally(loadingModalService.close);
        }
    }

    function getName(object) {
        return object ? object.name : undefined;
    }

    function getSelectedObjectById(list, id) {
        if (!list || !id) {
            return null;
        }
        var filteredList = list.filter(function(object) {
            return object.id === id;
        });
        return filteredList.length > 0 ? filteredList[0] : null;
    }
})();
