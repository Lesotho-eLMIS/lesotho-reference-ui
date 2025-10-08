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
     * @name point-of-delivery-view.controller:pointOfDeliveryViewController
     *
     * @description
     * Controller for point of delivery view.
     */
    angular
        .module('point-of-delivery-view')
        .controller('pointOfDeliveryViewController', pointOfDeliveryViewController);

    pointOfDeliveryViewController.$inject = ['$stateParams', 'facility', 'facilities', 'facilityService', 'offlineService',
        '$scope', 'PODs', 'pointOfDeliveryService', '$state', 'podEventsWithSuppliers'];

    function pointOfDeliveryViewController($stateParams, facility, facilities, facilityService, offlineService,
        $scope, PODs, pointOfDeliveryService, $state, podEventsWithSuppliers) {


        var vm = this;

        vm.supplyingFacilities = facilities;
        vm.$onInit = onInit;
        vm.facility = facility;
        vm.PODEvents = podEventsWithSuppliers;
        
        /**
         * @ngdoc method
         * @methodOf point-of-delivery-view.controller:pointOfDeliveryViewController
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
        }

        /**
         * @ngdoc method
         * @methodOf point-of-delivery-view.controller:pointOfDeliveryViewController
         * @name $formatPODrecievedBy
         *
         * @description
         * Responsible for formatting 'Received By' in the view
         */
        $scope.formatPODrecievedBy = function (name) {
            if (name) {
                var splittedName = name.split(', '); // Splitting the string by comma and space
                return splittedName.join(' '); // Joining the array elements with a space in between 
            } else {
                return ''; // Handle if input is empty or undefined
            }
        };

        // For Displaying Recieved By Name without a comma
        $scope.formatPODrecievedBy = function (name) {
            if (name) {
                var splittedName = name.split(', '); // Splitting the string by comma and space
                return splittedName.join(' '); // Joining the array elements with a space in between 
            } else {
                return ''; // Handle if input is empty or undefined
            }
        };
        /*Function for view single POD event*/
        vm.viewPOD = function (id) {
            $state.go('openlmis.pointOfDelivery.manage', {
                podId: id,
            });
        };

        vm.viewDiscrepancies = function (discrepancies, referenceNumber) {
            pointOfDeliveryService.showViewModal(discrepancies, referenceNumber).then(function () {
                $stateParams.noReload = true;
                draft.$modified = true;
                vm.cacheDraft();
                //Only reload current state and avoid reloading parent state
                $state.go($state.current.name, $stateParams, {
                    reload: $state.current.name
                });
            });
        }
    }
})();
