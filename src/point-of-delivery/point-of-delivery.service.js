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
     * @ngdoc service
     * @name point-of-delivery.pointOfDeliveryService
     *
     * @description
     * Responsible for retrieving POD data as well as commiting it to the server.
     */
    angular
        .module('requisition-search')
        .service('pointOfDeliveryService', pointOfDeliveryService);

        pointOfDeliveryService.$inject = ['$resource','openlmisUrlFactory','pointOfDeliveryManageResource', 'openlmisModalService'];

    function pointOfDeliveryService($resource,openlmisUrlFactory, pointOfDeliveryManageResource, openlmisModalService ) {

        var promise,
            POD_FACILITIES = 'pointOfDeliveryManageFacilities';
           // Using Resource to Communicate with POD Endpoints

            var resource = $resource(openlmisUrlFactory('/api/podEvents:id'), {}, {
                get: {
                    url: openlmisUrlFactory('/api/podEvents'),
                    method: 'GET',
                    isArray: true
                }, 
                savePODEvent: {
                    url: openlmisUrlFactory('/api/podEvents'),
                    method: 'POST'
                },
                editPODEvent: {
                    url: openlmisUrlFactory('/api/podEvents/:id'),
                    method: 'PUT'
                }             
            });
 
        this.submitPodManage = submitPodManage; // To post data POD Manage payload
        this.getPODs = getPODs; //To retrieve PODs from the database
        this.show = show;
        this.getDiscrepancies = getDiscrepancies; // To retrieve the compiled discrepancies
        this.addDiscrepancies = addDiscrepancies; // To compile the list of discrepancies
        this.clearDiscrepancies = clearDiscrepancies;
        this.showViewModal = showViewModal;
        this.editPOD = editPOD;

        var discrepancyList = [];

        function getDiscrepancies() {
            return discrepancyList;
        }

        function addDiscrepancies (discrepancies) {
                discrepancyList.push(discrepancies);
        }
        function clearDiscrepancies() {
                discrepancyList = [];
        }
       

        /**
         * @ngdoc method
         * @methodOf point-of-delivery.pointOfDeliveryService
         * @name getPODs
         *
         * @description
         * Retrieves POD records from the server.
         *
         * @param  {String}     Facility UUID
         * @return {Promise}    POD promise
         */
        function getPODs(receivingFacilityId){
            var params = {
                         destinationId: receivingFacilityId 
                         }
            return resource.get(params).$promise.then(function(response) {
                    // Transforming the response to an object if it's an array
                if (Array.isArray(response)) {
                                  
                    var objectOfPODs = response.reduce((result, obj) => {
                    result[obj.id] = obj;
                    return result;
                }, {});                          
                return objectOfPODs;                         
                }
            return response; 
            });
        }
    
        function submitPodManage(payloadData){
            return resource.savePODEvent(payloadData).$promise;
        }
        function editPOD(podId, payloadData) {
            return resource.editPODEvent({ id:podId },payloadData).$promise;
        }
        /**
         * @ngdoc method
         * @methodOf point-of-delivery.pointOfDeliveryService
         * @name show
         *
         * @description
         * Shows modal that allows users to add discrepancies.
         *
         * @param  {Array}   rejectionReasons 
         * @param  {String}   shipmentType  
         * @return {Promise}                resolved with discrepancies.
         */
        function show (shipmentType, currentDiscrepancies) {
            return openlmisModalService.createDialog(
                {
                    controller: 'podAddDiscrepancyModalController',
                    controllerAs: 'vm',
                    templateUrl: 'pod-add-discrepancy-modal/add-discrepancy-modal.html',
                    show: true ,
                    resolve: {
                        rejectionReasons: function(rejectionReasonService) {
                                // Load rejection Reasons into the controller.
                                return rejectionReasonService.getAll();
                            
                        }, 
                        shipmentType: function () {
                            return shipmentType;
                        },
                        discrepancies: function () {
                            if (currentDiscrepancies) {
                                return currentDiscrepancies;
                            }else{
                                return [];
                            }
                            
                        }
                    }   
                }
            ).promise.finally(function() {
                angular.element('.openlmis-popover').popover('destroy');
            });
        }

        function showViewModal (discrepancies, referenceNumber) {
            return openlmisModalService.createDialog(
                {
                    controller: 'podViewDiscrepancyModalController',
                    controllerAs: 'vm',
                    templateUrl: 'pod-view-discrepancy-modal/view-discrepancy-modal.html',
                    show: true,
                    resolve: {
                        discrepancies: function () {
                            return discrepancies;
                        },
                        referenceNumber: function () {
                            return referenceNumber;
                        }
                    }
                }
            ).promise.finally(function() {
                angular.element('.openlmis-popover').popover('destroy');
            });
        }
        
    }
})();