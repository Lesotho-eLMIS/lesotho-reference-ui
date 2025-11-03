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
    angular.module('openlmis-home').service('homeService', ['$http','openlmisUrlFactory','$resource', function($http,openlmisUrlFactory,$resource) {
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

        this.getNotifications = getNotifications;
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

    }]);
})();
