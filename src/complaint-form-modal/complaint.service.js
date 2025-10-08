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
     * @name complaint-form-modal.complaintService
     *
     * @description
     * Responsible for retrieving complaint data as well as commiting it to the server.
     */
    angular
        .module('complaint-form-modal')
        .service('complaintService', complaintService);

        complaintService.$inject = ['$resource','openlmisUrlFactory', 'openlmisModalService'];

    function complaintService($resource,openlmisUrlFactory, pointOfDeliveryManageResource, openlmisModalService ) {

        var promise;
        // Using Resource to Communicate with Complaint Endpoints

        var resource = $resource(openlmisUrlFactory('/api/complaints:id'), {}, {
                get: {
                    url: openlmisUrlFactory('/api/complaints'),
                    method: 'GET',
                    isArray: true
                }, 
                postComplaint: {
                    url: openlmisUrlFactory('api/complaints'),
                    method: 'POST'
                },
                sendComplaint: {
                    url: openlmisUrlFactory('api/complaints/:id/send'),
                    method: 'POST'
                }
        });
       

        this.saveComplaint = saveComplaint;
        this.sendComplaint = sendComplaintToCMS;
        this.getComplaints = getComplaints;


        function saveComplaint(complaint) {
            return resource.postComplaint({facilityId:complaint.facilityId}, complaint);
        }

        function sendComplaintToCMS(complaintId, complaint) {
            return resource.sendComplaint({id:complaintId}, complaint);
        }

        /**
         * @ngdoc method
         * @methodOf complaint-form-modal.complaintService
         * @name getComplaints
         *
         * @description
         * Retrieves complaint records from the server.
         *
         * @param  {String}     Facility UUID
         * @return {Promise}    complaints promise
         */
        function getComplaints(facilityId) {
            var params = {
                facilityId: facilityId
            }
            return resource.get(params).$promise.then(function (response) {
                 return response;
            });
        }
        
    }
})();