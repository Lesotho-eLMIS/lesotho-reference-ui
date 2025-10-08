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
     * @ngdoc controller
     * @name pod-view-discrepancy-modal.controller:podViewDiscrepancyModalController
     *
     * @description
     * Manages View Discrepancy Modal.
     */
    angular
        .module('pod-view-discrepancy-modal')
        .controller('podViewDiscrepancyModalController', controller);

    controller.$inject = ['pointOfDeliveryService','discrepancies', 'referenceNumber'];

    function controller( pointOfDeliveryService, discrepancies, referenceNumber) {
        var vm = this;

        vm.$onInit = onInit;
        vm.discrepancies = discrepancies;
        vm.referenceNumber = referenceNumber;        
       
        /**
         * @ngdoc method
         * @methodOf pod-add-discrepancy-modal.controller:podAddDiscrepancyModalController
         * @name $onInit
         *
         * @description
         * Initialization method called after the controller has been created. Responsible for
         * setting data to be available on the view.
         */        
        function onInit() {
                   
        }
                     
    }
})();
