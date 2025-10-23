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
     * @name requisition-redistribution.controller:RequisitionRedistributionController
     *
     * @description
     * Responsible for Redistribution module of Requisitions.
     */

    angular
        .module('requisition-redistribution')
        .controller('RequisitionRedistributionController', controller);

        controller.$inject = ['stateTrackerService','requisition','user','facility', 'program', '$state', 'processingPeriod',
                        'orderCreateService', 'notificationService', 'alertService', 'loadingModalService', 'confirmService', 'healthFacilities',
                         'hospitalFacilities', 'districtFacilities'];

    function controller(stateTrackerService, requisition, user, facility, program, $state, processingPeriod, 
                    orderCreateService, notificationService, alertService, loadingModalService, confirmService, healthFacilities,
                    hospitalFacilities, districtFacilities) {
            
        var vm = this;

        vm.$onInit = onInit;
        vm.requisition = requisition;
        vm.requisitionLineItems = undefined;
        vm.program = undefined;
        vm.facility = undefined;
        vm.processingPeriod = undefined;
        vm.displaySubmitButton = undefined;
        vm.displaySubmitAndAuthorizeButton = undefined;
        vm.displayAuthorizeButton = undefined;
        vm.displayDeleteButton = undefined;
        vm.displayApproveAndRejectButtons = undefined;
        vm.displayRejectButton = undefined;
        vm.displaySkipButton = undefined;
        vm.displaySyncButton = undefined;
        vm.requisitionType = undefined;
        vm.supplyingFacilities = undefined;
        vm.submitRedistribution = submitRedistribution; 
        vm.createProcessAndSendOrder = createProcessAndSendOrder;
        vm.redistributeRequisition = redistributeRequisition;
        vm.submitOrders = submitOrders;
        vm.filteredProducts = filteredProducts;
        vm.filterFacilities = filterFacilities;
        vm.calculatePacksToShip = calculatePacksToShip;
        
        function onInit() {
        
           vm.facility = facility;
           vm.hospitals = hospitalFacilities;
           vm.healthCenters = healthFacilities;
           vm.dhmts = districtFacilities;
           vm.filteredSupplyingFacilities = filterFacilities();
           vm.program = program;
           vm.processingPeriod = processingPeriod;
           vm.requisitionLineItems = requisition.requisitionLineItems;
           vm.redistributedRequisition = angular.copy(requisition);//Keep the requisition copy for processing in redistributeRequisition()
           vm.requisitionType = 'requisitionView.emergency';
           vm.requisitionTypeClass = 'emergency';
           // Starting Each Row with Add Row Button Visible
           vm.requisitionLineItems.forEach(item => {
            item.addRowButton = true;
           });
           vm.requisitionLineItems.forEach(item => {
            item.removeRowButton = false;
           });
           vm.totalApprovedQty = vm.getApprovedQuantity();
        }

        //Merging Facility Arrays
        function getSupplyingFacilities(...arrays) {
            return arrays.reduce((acc, array) => acc.concat(array), []);
        }   
        
        
        //Select facilities in the same district as requesting facility as well as all DHMT facilities
        function filterFacilities(){
           
           console.log(vm.facility);
            var supplierFacilities = getSupplyingFacilities(vm.hospitals, vm.healthCenters, vm.dhmts);
            console.log(supplierFacilities);
            if(vm.facility.type.code === 'dist_store'){
                const zoneId = vm.facility.geographicZone.id;
                return supplierFacilities.filter(item => item.geographicZone.parent.id === zoneId || item.type.code === 'dist_store');
            }
           else {
            const zoneId = vm.facility.geographicZone.parent.id;
            return supplierFacilities.filter(item => item.geographicZone.parent.id === zoneId || item.type.code === 'dist_store');
           }
        }

        //Compute the total approved quantity for the requisition
        vm.getApprovedQuantity = function(){
            let totalApprovedQty = 0;
            vm.requisitionLineItems.forEach((item) => {
                totalApprovedQty += item.approvedQuantity;
            });
            return totalApprovedQty;
        }
        
        //Compute the total quantity to issue for the requisition       
        vm.getQuantityToIssue = function(){
            let quantityToIssue = 0;
            vm.requisitionLineItems.forEach((item) => {
                quantityToIssue += item.quantityToIssue;
            });
            return quantityToIssue;
        }

        //Assembles orders for each requisition line item and passes them on for processing.
        function submitRedistribution() {
            
            // validate that approved quantity and quantity to issue match
            if (vm.totalApprovedQty !== vm.getQuantityToIssue()) {
                failWithMessage('requisitionRedistribution.fail')();
                reloadState();
            }
            else {
                confirmService
                    .confirm('requisitionRedistribution.submit.confirm')
                    .then(function () {
                        let orderLineItems = [];
                        //build an order object for each requisition line item 
                        vm.requisitionLineItems.forEach(lineItem => {
                            const order = {
                                emergency: true,
                                createdBy: { id: user.id },
                                program: { id: program.id },
                                requestingFacility: { id: facility.id },
                                receivingFacility: { id: facility.id },
                                supplyingFacility: { id: lineItem.supplyingFacility.id },
                                facility: { id: facility.id }
                            };
                            orderLineItems.push(order);
                        });
                        let requestedItems = vm.requisitionLineItems;
                        //Pass the array of orders and their respective requisition line items to submitOrders for further processing
                        submitOrders(requestedItems, orderLineItems);
                    })
            }
        }

       
        function submitOrders(requisitionItems, orderItems) {
            let orderLineItems = orderItems;
            while (orderLineItems.length > 0) {
                //create a new array for orders having the same supplying facility ID and their corresponding requisition line items
                let supplyingFacilityId = orderLineItems[0].supplyingFacility.id;
                let ordersArray = orderLineItems.filter((lineItem) => lineItem.supplyingFacility.id === supplyingFacilityId);
                let requestedItems = requisitionItems.filter((lineItem) => lineItem.supplyingFacility.id === supplyingFacilityId);

                //Update the original array of orders to exclude the filterd orders having the same supplying facility ID
                orderLineItems = orderLineItems.filter(item => !ordersArray.includes(item));
                
                //if the array of orders is not empty, pass to createProcessAndSendOrder function for futher processing
                if (ordersArray.length > 0) {
                    let ordersForProcessing = ordersArray;
                    let order = ordersForProcessing[0];
                    createProcessAndSendOrder(order, requestedItems);
                }
            }
            //When all the orders have been sent, set requisition state to Redistributed.
            redistributeRequisition();
        }

        function createProcessAndSendOrder(order, requestedItems) {
            orderCreateService.create(order)
                .then((createdOrder) => {
                    return orderCreateService.get(createdOrder.id);
                })
                .then((fetchedOrder) => {
                    requestedItems.forEach((lineItem) => {
                        let packs = calculatePacksToShip(lineItem);
                        console.log(packs);
                        fetchedOrder.orderLineItems.push({                                    
                            orderable: lineItem.orderable,
                            orderedQuantity: packs, //lineItem.packsToShip,
                            soh: 45
                        });
                    }); 
                    console.log(fetchedOrder);                 
                    return orderCreateService.send(fetchedOrder);
                })
                .then(() => {
                    notificationService.success('Successfully submitted.');
                })
                .catch((error) => {
                    console.error('Error processing order:', error);
                });
        }

        //Calculate packs to ship for each line item
        function calculatePacksToShip(lineItem){
            var netContent = lineItem.orderable.netContent,
                quantityToIssue = lineItem.quantityToIssue,
                packRoundingThreshold = lineItem.orderable.packRoundingThreshold;
            var packsToShip = quantityToIssue / netContent,
                remainder = quantityToIssue % netContent;
            if(remainder > packRoundingThreshold){
                packsToShip += 1;
            }
            return Math.floor(packsToShip);
        }

        /*Updates the status of the requisition to show that for all requisition line items,
          orders have been created and sent for supply */
        function redistributeRequisition() {
          
            vm.requisition = angular.copy(vm.redistributedRequisition);
                vm.requisition .extraData = { isRedistributed: true };
                     return vm.requisition .$save()
                        .then(() => vm.requisition .$approve()
                            .then(() => stateTrackerService.goToPreviousState('openlmis.requisitions.approvalList')));
        } 
        
        //filters all line items with the same product as that of the given index
        function filteredProducts (index){            
            let selectedProduct = vm.requisitionLineItems[index];
            return vm.requisitionLineItems.filter(lineItem => lineItem.orderable.productCode === selectedProduct.orderable.productCode);
        }
        
        //Computes the total quantity to be issued for a single product that may be supplied by different facilities.
        vm.totalQuantityToIssue = function(index){
            let total = 0;
            let selectedProducts = filteredProducts(index);
             for(let i=0; i< selectedProducts.length; i++){
                total += selectedProducts[i].quantityToIssue;
            }
            return total;
        };
       
        /*Controls the visibility of the button that adds another row so that a 
          single product may be supplied by different facilities.*/
       vm.showAddButton = function(index) {  
            let item = vm.requisitionLineItems[index];
            let selectedProducts = filteredProducts(index);
            let quantityToIssue = vm.totalQuantityToIssue(index);
            let approvedQuantity = item.approvedQuantity;
            if (quantityToIssue >= approvedQuantity) {
                selectedProducts.forEach((product) => {
                    product.addRowButton = false; //Hide Add Row Button
                });
            }
            else if (quantityToIssue < approvedQuantity){
                selectedProducts.forEach((product) => {
                    product.addRowButton = true;
                });      
            }
        };
    
        //Adds a row to the table
        vm.addRow = function(index, item) {
            // Create a new item object with default values
            var newLineItem = angular.copy(item);

            newLineItem.supplyingFacility = null;
            newLineItem.quantityToIssue = 0;
            newLineItem.remarks = item.remarks;
            newLineItem.addRowButton = true;
            newLineItem.removeRowButton = true;
        
            // Insert the new item into the array at the specified index
            vm.requisitionLineItems.splice(index + 1, 0, newLineItem);
        };

        //Removes a line item from Redistribution table
        vm.removeLineItem = function (index) {
            vm.requisitionLineItems.splice(index, 1);
            vm.showAddButton(index);            
        }
       
        //Provides a fail message when quantity to issue for all line items fails validation
        function failWithMessage(message) {
            return function() {
                loadingModalService.close();
                alertService.error(message);
            };
        }

        function reloadState() {
            $state.reload();
        }

    }
})();