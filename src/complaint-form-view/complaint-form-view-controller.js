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
     * @name complaint-form-view.controller:complaintFormViewController
     *
     * @description
     * Manages View of Complaints.
     */
    angular
        .module('complaint-form-view')
        .controller('complaintFormViewController', controller);

    controller.$inject = ['facility', 'complaints', 'lotService', 'orderableService', 'facilityService', 'complaintFormViewModalService'];

    function controller(facility, complaints, lotService, orderableService, facilityService, complaintFormViewModalService) {
        var vm = this;

        vm.getComplaints = getComplaints;
        vm.getLineItemDetails = getLineItemDetails;
        vm.getFacility = getFacility;

        vm.facility = facility;
        vm.complaints = complaints;
        

        /**
         * @ngdoc property
         * @propertyOf complaint-form-view.controller:complaintFormViewController
         * @name lineItems
         * @type {Array}
         *
         * @description
         * The list of requesting complaint form line items.
         */
        vm.lineItems = undefined;

        vm.$onInit = onInit;

        function onInit() {
           // console.log("Facility: ", vm.facility);
            vm.facilityName = vm.facility.name;
            getFacility();
        }

        
        /**
         * @ngdoc method
         * @methodOf complaint-form-view.controller:complaintFormViewController
         * @name viewComplaints
         *
         * @description
         * Gets the line items of a complaint form.
         *
         * @param {String} UUID of complaint record to get line items from
         */
        function getComplaints(itemId) {
            vm.lineItems = vm.complaints.find(item => itemId === item.id).lineItems;
            getLineItemDetails(vm.lineItems);

            complaintFormViewModalService.show(vm.lineItems).then(function() {
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
         * @methodOf complaint-form-view.controller:complaintFormViewController
         * @name getLineItemDetails
         *
         * @description
         * Resolves UUIDs of line item properties and adds the details to the line item.
         *
         * @param {Array} Array of line items to be resolved
         */        
        function getLineItemDetails(lineItems) {
            
            var promises = lineItems.map(lineItem => {
                var params = { id: lineItem.lotId };

                //Resolve lot codes and expiration dates
                lotService.query(params).then(response => {                    
                    lineItem.lotCode = response.content[0].lotCode;
                    lineItem.expirationDate = response.content[0].expirationDate;
                }).then(data => {
                //Resolve product names
                    orderableService.get(lineItem.orderableId).then(info =>{                        
                        lineItem.productName = info.fullProductName;
                    });
                });
            });
            Promise.all(promises).then(() => {
                lineItems;
                //console.log("New Line Items: ", lineItems);
            });
        }

        function getFacility(){
            var promises = vm.complaints.map(complaint =>{
                //Resolve service area (Facility) name
                facilityService.get(complaint.facilityId).then(response =>{
                   // console.log(response);
                    complaint.facilityName = response.name;
                });
            });
            Promise.all(promises).then(() => {
                vm.complaints;
               // console.log("New Complaints: ",  vm.complaints);
            });
        }
    
    }
})();