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
    angular.module('openlmis-home').service('homeService', ['$http','openlmisUrlFactory','$resource','pointOfDeliveryService', function($http,openlmisUrlFactory,$resource,pointOfDeliveryService) {
        var data = [];
        var resource = $resource(openlmisUrlFactory('/api/notifications:id'), {}, {
            get: {
                url: openlmisUrlFactory('/api/notifications'),
                method: 'GET'
            }, 
            save: {
                url: openlmisUrlFactory('/api/notifications/:id'),
                method: 'PUT'
            }             
        });

        var referenceNumberResource = $resource(
            openlmisUrlFactory('/api/stockCardLineItems/referenceNumbers/search'), {}, {
                search: {
                    method: 'POST',
                    isArray: true
                }
            });

        this.getNotifications = getNotifications;
        this.getOutstandingPods = getOutstandingPods;
        this.markNotificationsAsRead = markNotificationsAsRead;

        function getNotifications(currentUserId){
            var params = {
                         userId: currentUserId 
                         }
           return resource.get(params).$promise.then(function(response) {
                    return response.content;
            });

        
        }

        function markNotificationsAsRead(notificationId) {
            var params = {
                isRead : true //isRead 
                }
            //    "bf6d1c18-3cc9-4ca3-b25a-209ea265ebcd"
            return resource.save({ id:notificationId }, params).$promise
            
        }

        function getOutstandingPods(facilityId, programId) {
            var activePeriod = new Date(new Date().getTime() - (30 * 24 * 60 * 60 * 1000));

            return pointOfDeliveryService.getPODs(facilityId).then(function(result) {
                var recent = Object.values(result).filter(function(pod) {
                    return pod.referenceNumber && new Date(pod.receivingDate) >= activePeriod;
                });

                if (!recent.length) {
                    return [];
                }

                return referenceNumberResource.search({}, {
                    facilityId: facilityId,
                    programId: programId,
                    referenceNumbers: recent.map(function(pod) {
                        return pod.referenceNumber;
                    })
                }).$promise.then(function(received) {
                    return recent.filter(function(pod) {
                        return received.indexOf(pod.referenceNumber) === -1;
                    });
                });
            });
        }

    }]);
})();
