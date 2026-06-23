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
     * @name pod-add-discrepancy-modal.controller:podAddDiscrepancyModalController
     *
     * @description
     * Manages Add Discrepancy Modal.
     */
    angular
        .module('pod-add-discrepancy-modal')
        .controller('podAddDiscrepancyModalController', controller);

    controller.$inject = ['rejectionReasons', '$filter', 'shipmentType', 'notificationService', 'modalDeferred', 'discrepancies'];

    function controller(rejectionReasons, $filter, shipmentType, notificationService, modalDeferred, discrepancies) {
        var vm = this;

        vm.$onInit = onInit;
        vm.currentShipmentType = shipmentType; //Storing Selected ShipmentType
        vm.discrepancyOptions = [];
        vm.discrepancies = []; //undefined;
        vm.selectedDiscrepancy = undefined;
        vm.addDiscrepancy = addDiscrepency;
        vm.removeDispency = removeDiscrepancy;
        vm.confirm = confirm;
       
        /**
         * @ngdoc method
         * @methodOf pod-add-discrepancy-modal.controller:podAddDiscrepancyModalController
         * @name $onInit
         *
         * @description
         * Initialization method called after the controller has been created. Responsible for
         * setting data to be available on the view.
         */        
        function onInit() {
           vm.discrepancies = populateModalWithCurrentDiscrepancies(discrepancies);
           vm.selectedDiscrepancy = [];

           vm.rejectionReasons = rejectionReasons.content;
           vm.rejectionReasons.forEach(reason => {
               // Load only those of type POD/Point of Delivery
               if(reason.rejectionReasonCategory.code == "POD"){
                   vm.discrepancyOptions.push(reason.name);
               }
               
           });
        }
        
        function addDiscrepency() {
            if(vm.selectedDiscrepancy.length!=0){
                vm.discrepancies.push({
                    'shipmentType': shipmentType,
                    'name': vm.selectedDiscrepancy,
                    'quantity': '',
                    'comments': ''
                });  
            }
            else{
                notificationService.error('Select a discrepancy before adding.');
            }
        }

        // removing discrepancies from table
        function removeDiscrepancy(index) {
            vm.discrepancies.splice(index, 1);
        }
        
        function confirm (){
            var resolvedDiscrepancies = [];

            angular.forEach(vm.discrepancies, function(reason) {
                var reasonDetails = $filter('filter')(vm.rejectionReasons, {
                    name: reason.name
                }, true);

                if (reasonDetails.length > 0) {
                    resolvedDiscrepancies.push({
                        rejectionReason: angular.copy(reasonDetails[0]),
                        quantityAffected: reason.quantity,
                        shipmentType: reason.shipmentType,
                        comments: reason.comments
                    });
                }
            });

            modalDeferred.resolve(resolvedDiscrepancies);
        }

        function populateModalWithCurrentDiscrepancies (currentDiscrepancies){
            if(currentDiscrepancies && currentDiscrepancies.length!=0){
                return currentDiscrepancies.map(function(reason) {
                    return {
                        shipmentType: reason.shipmentType,
                        name: reason.name || (reason.rejectionReason ? reason.rejectionReason.name : ''),
                        quantity: angular.isDefined(reason.quantity) ? reason.quantity : reason.quantityAffected,
                        comments: reason.comments
                    };
                });
            }
            else{
               return [];
            }
        }
                     
    }
})();
