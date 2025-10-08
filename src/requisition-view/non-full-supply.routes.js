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
        .module('requisition-view')
        .config(routes);

    routes.$inject = ['selectProductsModalStateProvider'];

    function routes(selectProductsModalStateProvider) {

        selectProductsModalStateProvider
            .stateWithAddOrderablesChildState('openlmis.requisitions.requisition.nonFullSupply', {
                url: '/nonFullSupply?nonFullSupplyListPage&nonFullSupplyListSize',
                templateUrl: 'requisition-view-tab/requisition-view-tab.html',
                controller: 'ViewTabController',
                controllerAs: 'vm',
                isOffline: true,
                nonTrackable: true,
                resolve: {
                    lineItems: function($filter, requisition) {
                        return $filter('filter')(requisition.requisitionLineItems, {
                            $program: {
                                fullSupply: false
                            }
                        });
                    },
                    items: function(paginationService, lineItems, $stateParams, requisitionValidator,
                        paginationFactory) {
                        return paginationService.registerList(
                            requisitionValidator.isLineItemValid, $stateParams, function(params) {
                                return paginationFactory.getPage(lineItems, parseInt(params.page),
                                    parseInt(params.size));
                            }, {
                                paginationId: 'nonFullSupplyList'
                            }
                        );
                    },
                    columns: function(requisition, fullSupply) {
                        return requisition.template.getColumns(!fullSupply);
                    },
                    fullSupply: function() {
                        return false;
                    }
                }
            });

    }

})();
