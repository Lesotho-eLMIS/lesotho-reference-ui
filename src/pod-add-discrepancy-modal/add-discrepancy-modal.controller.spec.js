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

describe('podAddDiscrepancyModalController', function() {

    beforeEach(function() {
        module('pod-add-discrepancy-modal');

        inject(function($injector) {
            this.$controller = $injector.get('$controller');
        });

        this.damagedReason = {
            name: 'Damaged',
            rejectionReasonCategory: {
                code: 'POD'
            }
        };
        this.missingReason = {
            name: 'Missing',
            rejectionReasonCategory: {
                code: 'POD'
            }
        };
        this.nonPODReason = {
            name: 'Other',
            rejectionReasonCategory: {
                code: 'OTHER'
            }
        };

        this.rejectionReasons = {
            content: [this.damagedReason, this.missingReason, this.nonPODReason]
        };
        this.modalDeferred = jasmine.createSpyObj('modalDeferred', ['resolve']);
        this.notificationService = jasmine.createSpyObj('notificationService', ['error']);

        this.createController = function(discrepancies) {
            this.vm = this.$controller('podAddDiscrepancyModalController', {
                rejectionReasons: this.rejectionReasons,
                shipmentType: 'carton',
                notificationService: this.notificationService,
                modalDeferred: this.modalDeferred,
                discrepancies: discrepancies || []
            });
            this.vm.$onInit();
        };
    });

    it('should prepopulate existing discrepancies for editing', function() {
        this.createController([{
            rejectionReason: this.damagedReason,
            quantityAffected: 4,
            shipmentType: 'carton',
            comments: 'Crushed'
        }]);

        expect(this.vm.discrepancies).toEqual([{
            name: 'Damaged',
            quantity: 4,
            shipmentType: 'carton',
            comments: 'Crushed'
        }]);
    });

    it('should add and remove discrepancy rows', function() {
        this.createController();
        this.vm.selectedDiscrepancy = 'Damaged';

        this.vm.addDiscrepancy();
        expect(this.vm.discrepancies.length).toEqual(1);
        expect(this.vm.discrepancies[0].name).toEqual('Damaged');

        this.vm.removeDispency(0);
        expect(this.vm.discrepancies).toEqual([]);
    });

    it('should resolve saved discrepancies in POD backend shape', function() {
        this.createController();
        this.vm.discrepancies = [{
            name: 'Damaged',
            quantity: 4,
            shipmentType: 'carton',
            comments: 'Crushed'
        }];

        this.vm.confirm();

        expect(this.modalDeferred.resolve).toHaveBeenCalledWith([{
            rejectionReason: this.damagedReason,
            quantityAffected: 4,
            shipmentType: 'carton',
            comments: 'Crushed'
        }]);
    });

    it('should allow saving an empty discrepancy list', function() {
        this.createController();

        this.vm.confirm();

        expect(this.modalDeferred.resolve).toHaveBeenCalledWith([]);
    });
});
