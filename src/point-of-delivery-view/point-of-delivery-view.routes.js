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

    angular
        .module('point-of-delivery-view')
        .config(routes);

routes.$inject = ['$stateProvider'];

    function routes($stateProvider) {
        $stateProvider.state('openlmis.pointOfDelivery.view', {
            isOffline: true,
            url: '/View?facility&page&size',
            label: 'pointOfDeliveryView.label',
            priority: 1,
            showInNavigation: true,
            views: {
                '@openlmis': {
                    controller: 'pointOfDeliveryViewController',
                    controllerAs: 'vm',
                    templateUrl: 'point-of-delivery-view/point-of-delivery-view.html',
                }
            },
            resolve: {
                facilities: function(facilityService) {
                    var paginationParams = {};                      
                    var queryParams = {
                        "type":"warehouse"
                      };
                      return facilityService.query(paginationParams, queryParams)
                      .then(function(result) {
                          // Return Facilities of Type = Warehouse
                          return result.content;
                      })
                      .catch(function(error) {
                          // Handle any errors that may occur during the query
                          console.error("Error:", error);
                          return [];
                      });                    
                },
                facilitiesMinimal: function(facilityService) {
                    return facilityService.getAllMinimal();
                },
                facility: function($stateParams, facilityFactory) {
                    // Load the current User's Assigned Facility
                    if (!$stateParams.facility) {
                        return facilityFactory.getUserHomeFacility();
                    }
                    return $stateParams.facility;
                },
                podEvents: function(facility, pointOfDeliveryService) {
                    return pointOfDeliveryService.getPODs(facility.id);
                },
                podEventsWithSuppliers: function(podEvents, facilitiesMinimal) {
                    const podEventsWithSuppliers = Object.keys(podEvents).map(key => {
                        const event = podEvents[key];
                        const supplier = facilitiesMinimal.find(facility => facility.id == event.sourceId);
                        event.sourceName = supplier.name;
                        return event;
                      });
                    return podEventsWithSuppliers;
                }, 
                PODs: function(paginationService, pointOfDeliveryService, $stateParams, facility) {
                        return paginationService.registerUrl($stateParams, function(stateParams){
                             if (stateParams){
                                stateParams.facility = facility;
                               return pointOfDeliveryService.getPODs(stateParams.facility.id);
                            }
                        });
                    }
            }
        });
       
     }
})();
  
