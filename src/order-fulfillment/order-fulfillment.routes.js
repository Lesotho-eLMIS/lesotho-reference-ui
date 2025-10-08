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
        .module('order-fulfillment')
        .config(config);

    config.$inject = ['$stateProvider', 'FULFILLMENT_RIGHTS'];

    function config($stateProvider, FULFILLMENT_RIGHTS) {

        $stateProvider.state('openlmis.orders.fulfillment', {
            controller: 'OrderFulfillmentController',
            controllerAs: 'vm',
            label: 'orderFulfillment.fulfillOrders',
            showInNavigation: true,
            templateUrl: 'order-fulfillment/order-fulfillment.html',
            url: '/fulfillment?requestingFacilityId&programId&status&page&size',
            params: {
                sort: ['createdDate,desc']
            },
            accessRights: [
                FULFILLMENT_RIGHTS.SHIPMENTS_VIEW,
                FULFILLMENT_RIGHTS.SHIPMENTS_EDIT
            ],
            areAllRightsRequired: false,
            resolve: {
                facility: function(facilityFactory) {
                    return facilityFactory.getUserHomeFacility();
                }, //Lesotho eLMIS
                supervisedFacilities: function(facilityFactory) {
                    return facilityFactory.getSupervisedFacilitiesBasedOnRights([FULFILLMENT_RIGHTS.ORDERS_VIEW]);
                },
                orderingFacilities: function(supervisedFacilities, requestingFacilityFactory) {
                    var ids = supervisedFacilities.map(function(facility) {
                        return facility.id;
                    });
                    return requestingFacilityFactory.loadRequestingFacilities(ids).then(function(requestingFacilities) {
                        return requestingFacilities;
                    });
                },
                programs: function(programService) {
                    return programService.getAll();
                },
                orders: function(paginationService, orderRepository, $stateParams, ORDER_STATUS) {
                    return paginationService.registerUrl($stateParams, function(stateParams) {
                        var availableStatuses = [ORDER_STATUS.FULFILLING, ORDER_STATUS.ORDERED],
                            copy = angular.copy(stateParams);
                        if (stateParams.status instanceof Array) {
                            stateParams.status = stateParams.status.filter(function(status) {
                                return availableStatuses.indexOf(status) >= 0;
                            });
                            copy = angular.copy(stateParams);
                        } else if (!stateParams.status || availableStatuses.indexOf(stateParams.status) < 0) {
                            copy.status = availableStatuses;
                        }
                        return orderRepository.search(copy);
                    });
                }
            }
        });

    }

})();
