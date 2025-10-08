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
     * @name complaint-form-view-modal.complaintFormViewModalService
     *
     * @description
     * This service will pop up a modal window for user to add discrepancies.
     */
    angular
        .module('complaint-form-view-modal')
        .service('complaintFormViewModalService', service);

    service.$inject = ['openlmisModalService', 'STOCKMANAGEMENT_RIGHTS'];

    function service(openlmisModalService, STOCKMANAGEMENT_RIGHTS) {
        this.show = show;

        /**
         * @ngdoc method
         * @methodOf complaint-form-view-modal.complaintFormViewModalService
         * @name show
         *
         * @description
         * Shows modal that allows users to create complaints
         */

        var modalDialog = null;

        function show(lineItems) {
            modalDialog = openlmisModalService.createDialog(
                {
                    controller: 'complaintFormViewModalController',
                    controllerAs: 'vm',
                    templateUrl: 'complaint-form-view-modal/complaint-form-view-modal.html',
                    show: true ,
                    accessRights: [STOCKMANAGEMENT_RIGHTS.STOCK_ADJUST],
                    resolve: {
                        lineItems: function() {
                            // Load lineItems into the controller.
                            return lineItems;
                        
                        },
                    }   
                }
            ).promise.finally(function() {
                angular.element('.openlmis-popover').popover('destroy');
            });
            
            return modalDialog;
        }
    }

})();
