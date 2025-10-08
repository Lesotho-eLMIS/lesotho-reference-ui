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

    angular.module('requisition-search').config(routes);

    routes.$inject = ['$stateProvider'];

    function routes($stateProvider) {

        $stateProvider.state('openlmis.requisitions.search', {
            showInNavigation: true,
            isOffline: true,
            label: 'requisitionSearch.view',
            url: '/view?program&facility&initiatedDateFrom&initiatedDateTo&page&size&offline&sort&requisitionStatus',
            params: {
                sort: ['createdDate,desc']
            },
            controller: 'RequisitionSearchController',
            templateUrl: 'requisition-search/requisition-search.html',
            canAccess: function(permissionService, REQUISITION_RIGHTS) {
                return permissionService.hasRoleWithRightAndFacility(REQUISITION_RIGHTS.REQUISITION_VIEW);
            },
            controllerAs: 'vm',
            resolve: {
                facilities: function(requisitionSearchService) {
                    return requisitionSearchService.getFacilities();
                },
                requisitions: function(paginationService, requisitionService, $stateParams) {
                    return paginationService.registerUrl($stateParams, function(stateParams) {
                        if (stateParams.facility) {
                            var offlineFlag = stateParams.offline;
                            delete stateParams.offline;
                            return requisitionService.search(offlineFlag === 'true', stateParams);
                        }
                        return undefined;
                    });
                },
                homeFacility: function(facilityFactory, $stateParams) {
                    if (!$stateParams.facility) {
                        return facilityFactory.getUserHomeFacility();
                    }
                    return $stateParams.facility;
                }
            }
        });

    }

})();
