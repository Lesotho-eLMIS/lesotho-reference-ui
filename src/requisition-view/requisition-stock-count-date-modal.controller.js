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
     * @name requisition-view.controller:RequisitionStockCountDateModalController
     *
     * @description
     * Manages stock count date modal.
     */
    angular
        .module('requisition-view')
        .controller('RequisitionStockCountDateModalController', controller);

    controller.$inject = ['requisition', 'modalDeferred', 'dateUtils'];

    function controller(requisition, modalDeferred, dateUtils) {

        var vm = this;

        vm.$onInit = onInit;
        vm.submit = submit;
        vm.validateDate = validateDate;

        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionStockCountDateModalController
         * @name requisition
         * @type {Object}
         *
         * @description
         * Requisition object which will be updated with new datePhysicalStockCountCompleted.
         */
        vm.requisition = {};

        /**
         * @ngdoc property
         * @propertyOf requisition-view.controller:RequisitionStockCountDateModalController
         * @name datePhysicalStockCountCompleted
         * @type {Object}
         *
         * @description
         * Date object which will be updated with new datePhysicalStockCountCompleted.
         */
        vm.datePhysicalStockCountCompleted = undefined;

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionStockCountDateModalController
         * @name $onInit
         *
         * @description
         * Initialization method of the RequisitionStockCountDateModalController.
         */
        function onInit() {
            vm.requisition = requisition;
            if (vm.requisition.datePhysicalStockCountCompleted) {
                vm.datePhysicalStockCountCompleted = vm.requisition.datePhysicalStockCountCompleted;
            }
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionStockCountDateModalController
         * @name submit
         *
         * @description
         * Closes the modal and and triggers requisition submit.
         */
        function submit() {
            vm.requisition.datePhysicalStockCountCompleted = vm.datePhysicalStockCountCompleted;
            modalDeferred.resolve();
        }

        /**
         * @ngdoc method
         * @methodOf requisition-view.controller:RequisitionStockCountDateModalController
         * @name submit
         * 
         * @description
         * Validates the date and returns a message if the date is after current date.
         * 
         * @return {String} the error message
         */
        function validateDate() {
            if (!vm.datePhysicalStockCountCompleted) {
                return;
            }

            if (!isDateBeforeOrEqualToday(dateUtils.toDate(vm.datePhysicalStockCountCompleted))) {
                return 'requisitionView.datePhysicalStockCountCompleted.inFuture';
            }
        }

        function isDateBeforeOrEqualToday(date) {
            var currentDate = new Date();
            return date.getFullYear() < currentDate.getUTCFullYear() ||
                isMonthInYearBeforeOrEqualCurrentUTCMonth(date, currentDate) ||
                isDayInYearAndMonthBeforeOrEqualCurrentUTCDay(date, currentDate);
        }

        function isMonthInYearBeforeOrEqualCurrentUTCMonth(date, currentDate) {
            return date.getFullYear() === currentDate.getUTCFullYear() &&
            date.getMonth() < currentDate.getUTCMonth();
        }

        function isDayInYearAndMonthBeforeOrEqualCurrentUTCDay(date, currentDate) {
            return date.getFullYear() === currentDate.getUTCFullYear() &&
            date.getMonth() === currentDate.getUTCMonth() &&
            date.getDate() <= currentDate.getUTCDate();
        }
    }
})();
