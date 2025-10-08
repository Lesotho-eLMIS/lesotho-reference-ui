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

describe('RequisitionStockCountDateModalController', function() {

    var $controller, vm, requisition, modalDeferred, moment;

    beforeEach(function() {
        module('requisition-view');

        inject(function($injector) {
            $controller = $injector.get('$controller');
            moment = $injector.get('moment');
        });

        requisition = {
            datePhysicalStockCountCompleted: '2017-08-11'
        };
        modalDeferred = jasmine.createSpyObj('modalDeferred', ['resolve']);

        vm = $controller('RequisitionStockCountDateModalController', {
            requisition: requisition,
            modalDeferred: modalDeferred
        });

        vm.$onInit();
    });

    describe('init', function() {

        it('should expose submit method', function() {
            expect(angular.isFunction(vm.submit)).toBe(true);
        });

        it('should set requisition', function() {
            expect(vm.requisition).toBe(requisition);
        });

        it('should set datePhysicalStockCountCompleted', function() {
            expect(vm.datePhysicalStockCountCompleted).toEqual('2017-08-11');
        });
    });

    describe('submit', function() {

        it('should close modal', function() {
            vm.submit();

            expect(modalDeferred.resolve).toHaveBeenCalled();
        });

        it('should update requisition date', function() {
            var date = moment().toISOString();

            vm.datePhysicalStockCountCompleted = date;

            vm.submit();

            expect(requisition.datePhysicalStockCountCompleted).toEqual(date);
        });
    });

    describe('validateDate', function() {

        it('should return undefined if date is undefined', function() {
            vm.datePhysicalStockCountCompleted = undefined;

            expect(vm.validateDate()).toBeUndefined();
        });

        it('should return error if date is in the future', function() {
            vm.datePhysicalStockCountCompleted = moment().add(1, 'days')
                .toISOString();

            expect(vm.validateDate()).toEqual('requisitionView.datePhysicalStockCountCompleted.inFuture');
        });

        it('should return undefined if date is in the past', function() {
            vm.datePhysicalStockCountCompleted = moment().subtract(1, 'days')
                .toISOString();

            expect(vm.validateDate()).toBeUndefined();
        });

        it('should return undefined for current day', function() {
            vm.datePhysicalStockCountCompleted = moment().toISOString();

            expect(vm.validateDate()).toBeUndefined();
        });

    });

});
