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

describe('requisitionSearch filter', function() {

    beforeEach(function() {
        module('requisition-search');

        var RequisitionDataBuilder;
        inject(function($injector) {
            this.$filter = $injector.get('$filter');
            this.REQUISITION_STATUS = $injector.get('REQUISITION_STATUS');
            RequisitionDataBuilder = $injector.get('RequisitionDataBuilder');
        });

        this.requisitions = [
            new RequisitionDataBuilder().buildRejected(),
            new RequisitionDataBuilder().buildApproved(),
            new RequisitionDataBuilder().buildEmergency(),
            new RequisitionDataBuilder()
                .withCreatedDate('2018-06-13T00:00:00Z')
                .build(),
            new RequisitionDataBuilder()
                .withCreatedDate('2018-06-14T00:00:00Z')
                .build()
        ];
    });

    it('should filter by program', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            program: this.requisitions[0].program.id
        })).toEqual([
            this.requisitions[0]
        ]);
    });

    it('should not filter by program if program is undefined', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            program: undefined
        })).toEqual(this.requisitions);
    });

    it('should filter by facility', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            facility: this.requisitions[1].facility.id
        })).toEqual([
            this.requisitions[1]
        ]);
    });

    it('should not filter by facility if facility is undefined', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            program: undefined
        })).toEqual(this.requisitions);
    });

    it('should filter by initiated date from', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            initiatedDateFrom: '2018-06-13'
        })).toEqual([
            this.requisitions[3],
            this.requisitions[4]
        ]);
    });

    it('should not filter by initiated date from if it is undefined', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            initiatedDateFrom: undefined
        })).toEqual(this.requisitions);
    });

    it('should filter by initiated date to', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            initiatedDateTo: '2018-06-13'
        })).toEqual([
            this.requisitions[0],
            this.requisitions[1],
            this.requisitions[2],
            this.requisitions[3]
        ]);
    });

    it('should not filter by initiated date to if it is undefined', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            initiatedDateTo: undefined
        })).toEqual(this.requisitions);
    });

    it('should filter by emergency', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            emergency: true
        })).toEqual([
            this.requisitions[2]
        ]);
    });

    it('should filter out emergency requisitions', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            emergency: false
        })).toEqual([
            this.requisitions[0],
            this.requisitions[1],
            this.requisitions[3],
            this.requisitions[4]
        ]);
    });

    it('should not filter by emergency if it is undefined', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            emergency: undefined
        })).toEqual(this.requisitions);
    });

    it('should not filter by emergency if it is null', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            emergency: null
        })).toEqual(this.requisitions);
    });

    it('should filter by multiple statuses', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            status: [this.REQUISITION_STATUS.REJECTED, this.REQUISITION_STATUS.APPROVED]
        })).toEqual([
            this.requisitions[0],
            this.requisitions[1]
        ]);
    });

    it('should filter by singe status', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            status: [this.REQUISITION_STATUS.APPROVED]
        })).toEqual([
            this.requisitions[1]
        ]);
    });

    it('should not filter by status if it is undefined', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            status: undefined
        })).toEqual(this.requisitions);
    });

    it('should filter by multiple conditions', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            status: [this.REQUISITION_STATUS.INITIATED],
            initiatedDateFrom: '2018-06-13',
            initiatedDateTo: '2018-06-13',
            emergency: false
        })).toEqual([
            this.requisitions[3]
        ]);
    });

    it('should return empty list if no matching requisition is found', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            status: [this.REQUISITION_STATUS.INITIATED],
            initiatedDateFrom: '2018-06-13',
            initiatedDateTo: '2018-06-13',
            emergency: true
        })).toEqual([]);
    });

    it('should filter by all conditions', function() {
        expect(this.$filter('requisitionSearch')(this.requisitions, {
            status: [this.REQUISITION_STATUS.INITIATED],
            initiatedDateFrom: '2018-06-13',
            initiatedDateTo: '2018-06-13',
            emergency: false,
            program: this.requisitions[3].program.id,
            facility: this.requisitions[3].facility.id
        })).toEqual([
            this.requisitions[3]
        ]);
    });

});