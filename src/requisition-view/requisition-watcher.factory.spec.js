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

describe('RequisitionWatcher', function() {

    var requisitionsStorage;

    beforeEach(function() {
        module('requisition-view', function($provide) {
            requisitionsStorage = jasmine.createSpyObj('requisitionsStorage', ['put']);
            var offlineFlag = jasmine.createSpyObj('offlineRequisitions', ['getAll', 'clearAll', 'put']);
            offlineFlag.getAll.andReturn([false]);
            var localStorageFactorySpy = jasmine.createSpy('localStorageFactory').andCallFake(function(name) {
                if (name === 'offlineFlag') {
                    return offlineFlag;
                }
                return requisitionsStorage;
            });
            $provide.service('localStorageFactory', function() {
                return localStorageFactorySpy;
            });
        });

        inject(function($injector) {
            this.RequisitionWatcher = $injector.get('RequisitionWatcher');
            this.$rootScope = $injector.get('$rootScope');
            this.$timeout = $injector.get('$timeout');
            this.RequisitionDataBuilder = $injector.get('RequisitionDataBuilder');
            this.requisitionCacheService = $injector.get('requisitionCacheService');
        });

        spyOn(this.requisitionCacheService, 'cacheRequisitionToStorage').andCallThrough();
        this.scope = this.$rootScope.$new();
        this.requisition = new this.RequisitionDataBuilder().buildJson();

        new this.RequisitionWatcher(this.scope, this.requisition, requisitionsStorage);
        this.scope.$digest();
    });

    describe('line items watcher', function() {

        it('should save requisition after changes', function() {
            this.requisition.requisitionLineItems[0].beginningBalance = 20;
            this.scope.$digest();
            this.$timeout.flush();

            expect(this.requisitionCacheService.cacheRequisitionToStorage).toHaveBeenCalledWith(
                this.requisition, requisitionsStorage
            );

            expect(this.requisition.$modified).toBe(true);
        });

        it('should not save requisition if quantity has not changed', function() {
            this.requisition.requisitionLineItems[0].beginningBalance = 50;
            this.scope.$digest();
            this.$timeout.flush();

            expect(this.requisitionCacheService.cacheRequisitionToStorage).not.toHaveBeenCalled();
            expect(this.requisition.$modified).toBe(undefined);
        });
    });

    describe('comment watcher', function() {

        it('should save requisition after changes', function() {
            this.requisition.draftStatusMessage = 'newMessage';
            this.scope.$digest();
            this.$timeout.flush();

            expect(this.requisitionCacheService.cacheRequisitionToStorage).toHaveBeenCalledWith(
                this.requisition, requisitionsStorage
            );

            expect(this.requisition.$modified).toBe(true);
        });

        it('should not save requisition if value has not changed', function() {
            this.requisition.draftStatusMessage = 'Requisition 1 status message draft';
            this.scope.$digest();
            this.$timeout.flush();

            expect(this.requisitionCacheService.cacheRequisitionToStorage).not.toHaveBeenCalled();
            expect(this.requisition.$modified).toBe(undefined);
        });
    });
});
