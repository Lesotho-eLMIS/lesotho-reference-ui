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

describe('pointOfDeliveryManageController', function() {

    beforeEach(function() {
        module('point-of-delivery-manage');

        inject(function($injector) {
            this.$controller = $injector.get('$controller');
            this.$q = $injector.get('$q');
            this.$rootScope = $injector.get('$rootScope');
        });

        this.facility = {
            id: 'destination-id',
            name: 'Receiving Facility'
        };
        this.facilities = [{
            id: 'source-id',
            name: 'Supplying Facility'
        }];
        this.pointOfDeliveryService = jasmine.createSpyObj('pointOfDeliveryService', ['show']);
        this.offlineService = jasmine.createSpyObj('offlineService', ['isOffline']);
        this.facilityService = jasmine.createSpyObj('facilityService', ['get']);
        this.notificationService = jasmine.createSpyObj('notificationService', ['success', 'error']);
        this.confirmService = jasmine.createSpyObj('confirmService', ['confirm']);
        this.alertService = jasmine.createSpyObj('alertService', ['error']);
        this.$state = jasmine.createSpyObj('$state', ['go']);
        this.$stateParams = {};
        this.$scope = this.$rootScope.$new();
        this.$scope.podManageForm = jasmine.createSpyObj('podManageForm', ['$setPristine', '$setUntouched']);

        this.createController = function() {
            this.vm = this.$controller('pointOfDeliveryManageController', {
                $rootScope: this.$rootScope,
                $state: this.$state,
                $stateParams: this.$stateParams,
                facility: this.facility,
                facilities: this.facilities,
                facilityService: this.facilityService,
                offlineService: this.offlineService,
                pointOfDeliveryService: this.pointOfDeliveryService,
                $scope: this.$scope,
                notificationService: this.notificationService,
                podEvents: {},
                confirmService: this.confirmService,
                alertService: this.alertService
            });
            this.vm.$onInit();
        };
    });

    it('should initialize new POD discrepancies on the page model', function() {
        this.createController();

        expect(this.vm.POD.receivingFacility).toEqual(this.facility);
        expect(this.vm.POD.discrepancies).toEqual([]);
    });

    it('should summarize shipment discrepancies like physical inventory reasons', function() {
        this.createController();

        expect(this.vm.hasShipmentDiscrepancies('carton')).toBe(false);
        expect(this.vm.getDiscrepancySummary('carton')).toEqual('');

        this.vm.POD.discrepancies = [{
            rejectionReason: {
                name: 'Damaged'
            },
            shipmentType: 'carton'
        }];
        expect(this.vm.hasShipmentDiscrepancies('carton')).toBe(true);
        expect(this.vm.getDiscrepancySummary('carton')).toEqual('Damaged');

        this.vm.POD.discrepancies.push({
            rejectionReason: {
                name: 'Missing'
            },
            shipmentType: 'carton'
        });
        this.vm.POD.discrepancies.push({
            rejectionReason: {
                name: 'Wrong Item'
            },
            shipmentType: 'container'
        });

        expect(this.vm.getShipmentDiscrepancies('carton').length).toEqual(2);
        expect(this.vm.getDiscrepancySummary('carton')).toEqual('2 Discrepancies');
    });

    it('should update page discrepancies from the modal result', function() {
        var deferred = this.$q.defer(),
            discrepancies = [{
                rejectionReason: {
                    name: 'Damaged'
                },
                shipmentType: 'carton'
            }];

        this.pointOfDeliveryService.show.andReturn(deferred.promise);
        this.createController();

        this.vm.addDiscrepancyOnModal('carton');
        expect(this.pointOfDeliveryService.show).toHaveBeenCalledWith('carton', []);

        deferred.resolve(discrepancies);
        this.$rootScope.$apply();

        expect(this.vm.POD.discrepancies).toEqual(discrepancies);
    });

    it('should submit payload with current page discrepancies', function() {
        var discrepancy = {
            rejectionReason: {
                name: 'Damaged'
            },
            shipmentType: 'carton'
        };

        this.createController();
        this.vm.POD = {
            supplyingFacility: {
                id: 'source-id'
            },
            receivingFacility: {
                id: 'destination-id'
            },
            referenceNo: 'REF-1',
            receivedDate: '2026-06-15',
            packedBy: 'Packer',
            cartonsQuantityOnWaybill: 5,
            cartonsQuantityAccepted: 4,
            cartonsQuantityRejected: 1,
            discrepancies: [discrepancy]
        };
        spyOn(this.vm, 'submitPOD');

        this.vm.buildPayload();

        expect(this.vm.submitPOD.calls[0].args[0].sourceId).toEqual('source-id');
        expect(this.vm.submitPOD.calls[0].args[0].destinationId).toEqual('destination-id');
        expect(this.vm.submitPOD.calls[0].args[0].discrepancies).toEqual([discrepancy]);
    });
});
