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

describe('LotEditController', function() {

    beforeEach(function() {
        module('admin-lot-edit');

        inject(function($injector) {
            this.$controller = $injector.get('$controller');
            this.$state = $injector.get('$state');
            this.$rootScope = $injector.get('$rootScope');
            this.$q = $injector.get('$q');
            this.confirmService = $injector.get('confirmService');
            this.loadingModalService = $injector.get('loadingModalService');
            this.notificationService = $injector.get('notificationService');

            this.LotDataBuilder = $injector.get('LotDataBuilder');
            this.LotResource = $injector.get('LotResource');
        });

        this.defaultLot = new this.LotDataBuilder().build();

        spyOn(this.loadingModalService, 'open');
        spyOn(this.loadingModalService, 'close');

        spyOn(this.notificationService, 'success');
        spyOn(this.notificationService, 'error');

        this.vm = this.$controller('LotEditController', {
            loadingModalService: this.loadingModalService,
            notificationService: this.notificationService,
            confirmService: this.confirmService,
            LotResource: this.LotResource,
            lot: this.defaultLot
        });

        this.vm.$onInit();
    });

    describe('onInit', function() {

        it('should expose editLot method', function() {
            expect(typeof this.vm.editLot).toBe('function');

        });

        it('should expose lot', function() {
            expect(this.vm.lot).toEqual(this.defaultLot);
        });
    });

    describe('editLot', function() {

        it('should not perform update if user does not confirm', function() {
            this.confirmDeferred = this.$q.defer();
            spyOn(this.confirmService, 'confirm').andReturn(this.confirmDeferred.promise);

            this.vm.editLot();

            this.confirmDeferred.reject();
            this.$rootScope.$apply();

            expect(this.confirmService.confirm).toHaveBeenCalledWith(
                'adminLotEdit.save.confirmationQuestion',
                'adminLotEdit.save'
            );
        });

        it('should update when user confirms', function() {
            this.confirmDeferred = this.$q.defer();
            this.updateResultDeferred = this.$q.defer();

            spyOn(this.confirmService, 'confirm').andReturn(this.confirmDeferred.promise);
            spyOn(this.vm.lotResource, 'update').andReturn(this.updateResultDeferred.promise);

            this.vm.editLot();

            this.confirmDeferred.resolve();
            this.updateResultDeferred.resolve();
            this.$rootScope.$apply();

            expect(this.confirmService.confirm).toHaveBeenCalledWith(
                'adminLotEdit.save.confirmationQuestion',
                'adminLotEdit.save'
            );

            expect(this.vm.lotResource.update).toHaveBeenCalled();
            expect(this.notificationService.success).toHaveBeenCalledWith('adminLotEdit.save.success');
        });

        it('should show error message on failure', function() {
            this.confirmDeferred = this.$q.defer();
            this.updateResultDeferred = this.$q.defer();

            spyOn(this.confirmService, 'confirm').andReturn(this.confirmDeferred.promise);
            spyOn(this.vm.lotResource, 'update').andReturn(this.updateResultDeferred.promise);

            this.vm.editLot();

            this.confirmDeferred.resolve();
            this.updateResultDeferred.reject();
            this.$rootScope.$apply();

            expect(this.confirmService.confirm).toHaveBeenCalledWith(
                'adminLotEdit.save.confirmationQuestion',
                'adminLotEdit.save'
            );

            expect(this.vm.lotResource.update).toHaveBeenCalled();
            expect(this.notificationService.error).toHaveBeenCalledWith('adminLotEdit.save.failure');
        });
    });
});
