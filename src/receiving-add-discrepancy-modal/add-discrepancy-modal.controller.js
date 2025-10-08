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
     * @name receiving-add-discrepancy-modal.controller:receivingAddDiscrepancyModalController
     *
     * @description
     * Manages Add Discrepancy Modal.
     */
    angular
        .module('receiving-add-discrepancy-modal')
        .controller('receivingAddDiscrepancyModalController', controller);

    controller.$inject = [ 'modalDeferred', '$scope', 'rejectionReasons', 'itemTimestamp', 'stockAdjustmentCreationService', 'notificationService'];

    function controller( modalDeferred, $scope, rejectionReasons, itemTimestamp, stockAdjustmentCreationService, notificationService) {
        var vm = this;

        vm.$onInit = onInit;
        vm.confirm = confirm;
        vm.discrepancyOptions = [];
        vm.discrepancies =[];
        vm.selectedDiscrepancy = undefined;
        vm.addDiscrepancy = addDiscrepancy;
        vm.removeDispency = removeDiscrepancy;

        $scope.showModal=false;
        

        // adding discrepancies to table
        function addDiscrepancy() {
            vm.discrepancies.push({
                'name': vm.selectedDiscrepancy,
                'quantity': '',
                'comments': ''
            });
        };

        // removing discrepancies from table
        function removeDiscrepancy(index) {
            vm.discrepancies.splice(index, 1);
        }
        
        function onInit() {
            vm.selectedDiscrepancy = [];
           
           vm.rejectionReasons = rejectionReasons.content;
           vm.rejectionReasons.forEach(reason => {
               // Load only those of type POD/Point of Delivery
               if(reason.rejectionReasonCategory.code == "POD"){
                   vm.discrepancyOptions.push(reason.name);
               }
               
           });
        }

        //builds receiving payload
        function confirm (){
            if(vm.discrepancies.length!=0){
                var receivingDiscrepancy = {};
                vm.discrepancies.forEach(function (discrepancy) {
                    // Use native array method find to find the matching object in rejectionReasons
                    var reasonDetails = vm.rejectionReasons.find(function (reason) {
                        return reason.name === discrepancy.name;
                    });
                    // If a match is found, build the rejection object
                    if (reasonDetails) {
                        receivingDiscrepancy = {
                            rejectionReason: angular.copy(reasonDetails),
                            quantityAffected: discrepancy.quantity,
                            timestamp: itemTimestamp,
                            remarks: discrepancy.comments
                        };
                        stockAdjustmentCreationService.addReceivingDiscrepancies(receivingDiscrepancy);
                        receivingDiscrepancy = {};
                    }
                });
                vm.discrepancies = [];
                modalDeferred.resolve();
            }
            else{
                notificationService.error('Add discrepancies before saving them.');
            }
        }
    }
})();
