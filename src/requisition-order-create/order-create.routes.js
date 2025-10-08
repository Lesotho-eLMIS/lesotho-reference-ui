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
        .module('requisition-order-create')
        .config(routes);

    routes.$inject = ['$stateProvider', 'ADMINISTRATION_RIGHTS'];

    function routes($stateProvider, ADMINISTRATION_RIGHTS) {
        var showRequisitionLessOrder = '@@SHOW_REQUISITION_LESS_ORDER' !== 'false';

        $stateProvider.state('openlmis.requisitions.orderCreate', {
            url: '/orderCreate',
            label: 'requisition.orderCreate',
            isOffline: false,
            priority: 14,
            showInNavigation: false, //Removing order create for Lesotho eLMIS
            views: {
                '@': {
                    templateUrl: 'requisition-order-create/order-create.html'
                }
            },
            accessRights: [ADMINISTRATION_RIGHTS.ORDER_CREATE]
        })
            .state('openlmis.requisitions.orderCreate.table', {
                url: '/:orderId',
                isOffline: true,
                accessRights: [ADMINISTRATION_RIGHTS.ORDER_CREATE]
            });
    }
})();
