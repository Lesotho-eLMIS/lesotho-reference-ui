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
        .module('requisition-redistribution')
        .config(routes);

routes.$inject = ['$stateProvider'];

    function routes($stateProvider) {
        $stateProvider.state('openlmis.redistribution', {
            url: '/redistribution/:rnr', 
            isOffline: true,
            controller: 'RequisitionRedistributionController',
            controllerAs: 'vm',
            templateUrl: 'requisition-redistribution/requisition-redistribution.html',
            resolve: {
                user: function(currentUserService) {
                    return currentUserService.getUserInfo();
                },
                requisition: function($stateParams,requisitionService) {
                    return requisitionService.get($stateParams.rnr);
                },
                facility: function(facilityService, requisition) {
                    return facilityService.get(requisition.facility.id);
                },
                districtFacilities: function (facilityService) {
                    var paginationParams = {};
                    var queryParams = {
                        "type": "dist_store"
                    };
                    return facilityService.query(paginationParams, queryParams)
                        .then(function (result) {
                            return result.content;
                        })
                        .catch(function (error) {
                            // Handle any errors that may occur during the query
                            console.error("Error:", error);
                            return [];
                        });
                },
                hospitalFacilities: function (facilityService) {
                    var paginationParams = {};
                    var queryParams = {
                        "type": "hospital"
                    };
                    return facilityService.query(paginationParams, queryParams)
                        .then(function (result) {
                            return result.content;
                        })
                        .catch(function (error) {
                            // Handle any errors that may occur during the query
                            console.error("Error:", error);
                            return [];
                        });
                },
                healthFacilities: function (facilityService, facility) {
                    var paginationParams = {};
                    var queryParams = {
                        "type": "health_center",                        
                    };
                    return facilityService.query(paginationParams, queryParams)
                        .then(function (result) {
                            return result.content;
                        })
                        .catch(function (error) {
                            // Handle any errors that may occur during the query
                            console.error("Error:", error);
                            return [];
                        });
                },
                program: function(programService, requisition) {
                    return programService.get(requisition.program.id);
                },
                processingPeriod: function(periodService, requisition) {
                    return periodService.get(requisition.processingPeriod.id);
                }
            }
        });
       
     }
})();
  
