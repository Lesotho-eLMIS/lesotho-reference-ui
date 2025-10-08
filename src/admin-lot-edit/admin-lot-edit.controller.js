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
     * @name admin-lot-edit.controller:LotEditController
     *
     * @description
     * Provides methods for Edit Lot modal.
     */
    angular
        .module('admin-lot-edit')
        .controller('LotEditController', LotEditController);

    LotEditController.$inject = [
        '$state',
        'loadingModalService',
        'notificationService',
        'confirmService',
        'stateTrackerService',
        'LotResource',
        'lot'
    ];

    function LotEditController(
        $state,
        loadingModalService,
        notificationService,
        confirmService,
        stateTrackerService,
        LotResource,
        lot
    ) {
        var vm = this;

        vm.$onInit = onInit;
        vm.editLot = editLot;
        vm.goToPreviousState = stateTrackerService.goToPreviousState;

        /**
         * @ngdoc property
         * @methodOf admin-lot-edit.controller:LotEditController
         * @name lot
         * @type {Object}
         *
         * @description
         * Current lot
         */
        vm.lot = undefined;

        /**
         * @ngdoc property
         * @methodOf admin-lot-edit.controller:LotEditController
         * @name lotResource
         * @type {LotResource}
         *
         * @description
         */
        vm.lotResource = undefined;

        /**
         * @ngdoc method
         * @methodOf admin-lot-edit.controller:LotEditController
         * @name $onInit
         *
         * @description
         * Method that is executed on initiating LotEditController.
         */
        function onInit() {
            vm.lot = lot;
            vm.lotResource = new LotResource();
        }

        /**
         * @ngdoc property
         * @methodOf admin-lot-edit.controller:LotEditController
         * @name editLot
         *
         * @description
         */
        function editLot() {
            confirmService.confirm('adminLotEdit.save.confirmationQuestion', 'adminLotEdit.save')
                .then(function() {
                    loadingModalService.open();

                    vm.lotResource.update(vm.lot).then(function() {
                        notificationService.success('adminLotEdit.save.success');
                        loadingModalService.close();
                        stateTrackerService.goToPreviousState();
                    })
                        .catch(function() {
                            loadingModalService.close();
                            notificationService.error('adminLotEdit.save.failure');
                        });
                });
        }
    }
})();