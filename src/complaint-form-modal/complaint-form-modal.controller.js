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
     * @name complaint-form-modal.controller:complaintFormModalController
     *
     * @description
     * Manages Add Discrepancy Modal.
     */
    angular
        .module('complaint-form-modal')
        .controller('complaintFormModalController', controller);

    controller.$inject = [ 'modalDeferred', '$scope', 'rejectionReasons', 'notificationService', 'orderableGroups', 'program', 'facility', 
            'orderableGroupService', 'hasPermissionToAddNewLot', 'messageService','user', 'complaintService','confirmService'];

    function controller( modalDeferred, $scope, rejectionReasons, notificationService, orderableGroups, program, facility, 
        orderableGroupService, hasPermissionToAddNewLot, messageService, user, complaintService, confirmService) {
        var vm = this;

        vm.$onInit = onInit;
        vm.confirm = confirm;
        vm.lotChanged = lotChanged;
        vm.addProductToComplaintForm = addProductToComplaintForm;
        vm.removeProductLineItem = removeProductLineItem;
        vm.onChangeComplainingFacility = onChangeComplainingFacility;
        vm.buildPayload = buildPayload;
        vm.productsForComplaint = [];
        vm.discrepancyOptions = [];
        vm.discrepancies =[];
        vm.selectedDiscrepancy = undefined;
        vm.facility = facility;
        vm.facilities = undefined;
        vm.homeFacilities = [facility];
        vm.complaint = {}
         
        vm.natureOfcomplaintOptions = [{ id: 1, name: "Wrong product" }, { id: 2, name: "Wrong pack size" }, { id: 3, name: "Over supply" },
            {id:4, name: "Expired products"}, {id:5, name: "Due to expire"}, {id:6, name: "Delivery queries"}, {id:7, name: "Shortage"},
            {id:8, name: "Quality"}, {id:9, name:  "Price hike"}, {id:10, name: "Other (specify)"}];   
        
        vm.complaintReasonOptions = [{id:1, reasons:["Issued", "Ordered"]}, {id:2, reasons:["Requested", "Issued"]}, 
                              {id:3, reasons: ["Duplication", "Wrong calculations when converting pack size/strength", "Uncommunicated back order"]},
                              {id:6, reasons: ["Invoiced but not delivered", "Delivered but not invoiced"]},
                              {id:7, reasons: ["Miscalculations", "Pack size / strength conversion"]},
                              {id:8, reasons: ["Damage", "Physical Inspection"]}];

        vm.complaintDetailsOptions = [{name: "Damage", details: ["Container", "Product"]}, 
                                      {name: "Physical Inspection", details: ["Moulding", "Decolourization", "Crystallization", "Cold chain was not maintained",
                                            "Friability", "Unlabelled products", "Foreign language"]}];
        $scope.showModal=false;
        
        function onInit() {
            vm.receivingFacility = facility.name; 
            vm.complaint.programId = program.id;
            vm.complaint.userId = user.id;
            vm.complaint.userNames = user.username;
            vm.selectedDiscrepancy = [];
           
           vm.rejectionReasons = rejectionReasons.content;
           vm.rejectionReasons.forEach(reason => {
               // Load only those of type POD/Point of Delivery
               if(reason.rejectionReasonCategory.code == "POD"){
                   vm.discrepancyOptions.push(reason.name);
               }
               
           });


           vm.orderableGroups = orderableGroups;
           vm.hasLot = false;
           vm.orderableGroups.forEach(function (group) {
             vm.hasLot =
               vm.hasLot ||
               orderableGroupService.lotsOf(group, hasPermissionToAddNewLot).length >
                 0;
           });
           vm.showVVMStatusColumn = orderableGroupService.areOrderablesUseVvm(
             vm.orderableGroups
           );
        }

        /**
         * @ngdoc method
         * @methodOf complaint-form-modal.controller:complaintFormModalController
         * @name orderableSelectionChanged
         *
         * @description
         * Reset form status and change content inside lots drop down list.
         */
        vm.orderableSelectionChanged = function () {
            //reset selected lot, so that lot field has no default value
            vm.selectedLot = null;
    
            initiateNewLotObject();
            vm.canAddNewLot = false;
    
            //same as above
            $scope.productForm.$setUntouched();
    
            //make form good as new, so errors won't persist
            $scope.productForm.$setPristine();
    
            vm.lots = orderableGroupService.lotsOf(
            vm.selectedOrderableGroup,
            vm.hasPermissionToAddNewLot
            );
            vm.selectedOrderableHasLots = vm.lots.length > 0;
        };

        vm.setComplaintReason = function (product) {
            console.log(product);
            //set the nature of complaint
            if (typeof product.natureOfComplaintName === "object") {
                product.natureOfComplaint = product.natureOfComplaintName.name;
            }

            // Set complaint reasons for the selected nature of complaint
            product.complaintReasons = vm.complaintReasonOptions.find(
                reason => reason.id === product.natureOfComplaintName?.id
            )?.reasons || [];

            // Reset dependent dropdowns when nature of complaint changes
            product.complaintReason = null;
            product.reasonDetail = null;
            product.reasonDetailOptions = [];
        };

        vm.setComplaintDetail = function (product) {
            console.log(product);
            // Set complaint details for the selected complaint reason
            product.reasonDetailOptions = vm.complaintDetailsOptions.find(
                detail => detail.name === product.complaintReason
            )?.details || [];

            // Reset complaint detail when complaint reason changes
            product.reasonDetail = null;
        };

        /**
         * @ngdoc method
         * @methodOf complaint-form-modal.controller:complaintFormModalController
         * @name lotChanged
         *
         * @description
         * Allows inputs to add missing lot to be displayed.
         */
        function lotChanged() {
            vm.canAddNewLot =
            vm.selectedLot &&
            vm.selectedLot.lotCode ===
                messageService.get('orderableGroupService.addMissingLot');
            initiateNewLotObject();
        }

        function onChangeComplainingFacility() {
            vm.complaint.facilityId = vm.complaintFormFacility.id;
        }

        function initiateNewLotObject() {
            vm.newLot = {
              active: true,
            };
        }

        function addProductToComplaintForm() {
            vm.productsForComplaint.unshift({
                    'name': vm.selectedOrderableGroup[0].orderable.fullProductName,
                    'batch': vm.selectedLot.lotCode,
                    'expiary': vm.selectedLot.expirationDate,
                    'orderable': vm.selectedOrderableGroup[0].orderable,
                    'lot':vm.selectedLot,
                    'lotId':vm.selectedLot.id,
                    'orderableId': vm.selectedOrderableGroup[0].orderable.id

            });
            
        }

        // removing discrepancies from table
        function removeProductLineItem(index) {
            vm.productsForComplaint.splice(index, 1);
        }

        /**
         * @ngdoc method
         * @methodOf complaint-form-modal.controller:complaintFormModalController
         * @name validateQuantities
         *
         * @description
         * Checks that returned quantity does not exceed affected quantity.
         */
        vm.validateQuantities = function (product) {
            if (!product.$errors) product.$errors = {};          
            if (product.quantityReturned > product.quantityAffected) {
                product.$errors.quantityInvalid = messageService.get('complaintFormModal.quantityInvalid');
            } else {
                delete product.$errors.quantityInvalid;
            }
            return product;
        };
         
        function confirm() {
            var lineItems = vm.productsForComplaint;
            confirmService.confirm("Are you sure you want to send complaint?", "Send")
            .then(function () {

                vm.complaint.lineItems = buildPayload(lineItems);

                complaintService.saveComplaint(vm.complaint).$promise
                .then(function (response) {
                    //Success callback
                    let complaintId = "";
                    for (let i = 0; i < Object.keys(response).length - 2; i++) {
                            complaintId += response[i];
                    }
                    notificationService.success('Complaint Saved Sucessfully.');
                    complaintService.sendComplaint(complaintId, vm.complaint).$promise
                    .then(function (sendReponse) {
                        notificationService.success('Complaint Sent Sucessfully.');
                    });
                    modalDeferred.resolve(); 
                })
                .catch(function (saveError) {
                    // Handle error in saving complaint
                    notificationService.error('Failed to save complaint.');
                    modalDeferred.reject(); 
                });
            })
            .catch(function () {
                // Handle user cancellation from the confirmation modal
                console.log("Complaint submission was cancelled.");
            });
        }

        function buildPayload(products) {
            //Check that the complaint line items are not empty
            if (!Array.isArray(products) || products.length === 0) {
                console.error("Error: products is empty or undefined", products);
                return [];
            }
            //Build the complaint form line items payload
            var complaintLineItems = products.map(product => ({
                orderableId: product.orderable?.id, 
                lotId: product.lot?.id,  
                quantityAffected: product.quantityAffected,
                quantityReturned: product.quantityReturned,
                natureOfComplaint: product.natureOfComplaint,  
                complaintReason: product.complaintReason || null,
                reasonDetails: product.reasonDetails || null,
                comments: product.comments || null  
            }));
            return complaintLineItems;
        }
    }
})();
