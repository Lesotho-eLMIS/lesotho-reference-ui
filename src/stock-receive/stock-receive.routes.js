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
        .module('stock-receive')
        .config(routes);

    routes.$inject = ['$stateProvider', 'STOCKMANAGEMENT_RIGHTS', 'ADJUSTMENT_TYPE'];

    function routes($stateProvider, STOCKMANAGEMENT_RIGHTS, ADJUSTMENT_TYPE) {
        $stateProvider.state('openlmis.stockmanagement.receive', {
            isOffline: true,
            url: '/receive',
            label: 'stockReceive.receive',
            priority: 4,
            showInNavigation: true,
            views: {
                '@openlmis': {
                    controller: 'StockAdjustmentController',
                    controllerAs: 'vm',
                    templateUrl: 'stock-adjustment/stock-adjustment.html'
                }
            },
            accessRights: [STOCKMANAGEMENT_RIGHTS.STOCK_ADJUST],
            resolve: {
                facility: function(facilityFactory) {
                    return facilityFactory.getUserHomeFacility();
                },
                user: function(authorizationService) {
                    return authorizationService.getUser();
                },
                programs: function(user, stockProgramUtilService) {
                    return stockProgramUtilService.getPrograms(user.user_id, STOCKMANAGEMENT_RIGHTS.STOCK_ADJUST);
                },
                //Make 2 API calls for the different statuses
                requisitionsToReceive: function(requisitionService, facility) {
                    return requisitionService.search(false, {
                        facility: facility.id,
                        initiatedDateFrom: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
                        requisitionStatus: 'APPROVED',
                        emergency: false
                    }).then(function(response) {
                        var approved = response.content.filter(function(r) { return !r.emergency; });
                        return requisitionService.search(false, {
                            facility: facility.id,
                            initiatedDateFrom: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
                            requisitionStatus: 'RELEASED',  //Released is shown as Acknowledged
                            emergency: false
                        }).then(function(response) {
                            var released = response.content.filter(function(r) { return !r.emergency; });
                            return approved.concat(released);
                        });
                    });
                },
                adjustmentType: function(facility, requisitionsToReceive) {
                    facility.requisitionsToReceive = requisitionsToReceive; // Attach to facility for easy access in controller
                    return ADJUSTMENT_TYPE.RECEIVE;
                }
            }
        });
    }
})();
