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

describe('openlmis.requisitions.requisition.nonFullSupply state', function() {

    beforeEach(function() {
        module('requisition-view');
        module('referencedata-facility-type-approved-product');

        inject(function($injector) {
            this.UserDataBuilder = $injector.get('UserDataBuilder');
            this.RequisitionDataBuilder = $injector.get('RequisitionDataBuilder');
            this.RequisitionLineItemDataBuilder = $injector.get('RequisitionLineItemDataBuilder');
            this.RequisitionColumnDataBuilder = $injector.get('RequisitionColumnDataBuilder');
            this.ProgramDataBuilder = $injector.get('ProgramDataBuilder');
            this.FacilityDataBuilder = $injector.get('FacilityDataBuilder');
            this.PeriodDataBuilder = $injector.get('PeriodDataBuilder');
            this.$state = $injector.get('$state');
            this.$rootScope = $injector.get('$rootScope');
            this.$q = $injector.get('$q');
            this.currentUserService = $injector.get('currentUserService');
            this.requisitionViewFactory = $injector.get('requisitionViewFactory');
            this.requisitionService = $injector.get('requisitionService');
            this.$location = $injector.get('$location');
            this.facilityService = $injector.get('facilityService');
            this.programService = $injector.get('programService');
            this.periodService = $injector.get('periodService');
        });

        this.goToUrl = goToUrl;
        this.getResolvedValue = getResolvedValue;

        this.user = new this.UserDataBuilder().build();
        this.$stateParams = {};
        this.program = new this.ProgramDataBuilder().build();
        this.facility = new this.FacilityDataBuilder().build();
        this.period = new this.PeriodDataBuilder().build();

        var requisitionDataBuilder = new this.RequisitionDataBuilder();

        requisitionDataBuilder
            .withProgram(this.program)
            .withFacility(this.facility)
            .withProcessingPeriod(this.period)
            .withRequisitionLineItems([
                new this.RequisitionLineItemDataBuilder()
                    .nonFullSupplyForProgram(requisitionDataBuilder.program)
                    .buildJson(),
                new this.RequisitionLineItemDataBuilder()
                    .fullSupplyForProgram(requisitionDataBuilder.program)
                    .buildJson(),
                new this.RequisitionLineItemDataBuilder()
                    .nonFullSupplyForProgram(requisitionDataBuilder.program)
                    .buildJson(),
                new this.RequisitionLineItemDataBuilder()
                    .fullSupplyForProgram(requisitionDataBuilder.program)
                    .buildJson(),
                new this.RequisitionLineItemDataBuilder()
                    .nonFullSupplyForProgram(requisitionDataBuilder.program)
                    .buildJson(),
                new this.RequisitionLineItemDataBuilder()
                    .nonFullSupplyForProgram(requisitionDataBuilder.program)
                    .buildJson(),
                new this.RequisitionLineItemDataBuilder()
                    .nonFullSupplyForProgram(requisitionDataBuilder.program)
                    .buildJson()
            ]);

        this.requisition = requisitionDataBuilder.build();
        this.lineItems = [
            this.requisition.requisitionLineItems[0],
            this.requisition.requisitionLineItems[2],
            this.requisition.requisitionLineItems[4],
            this.requisition.requisitionLineItems[5],
            this.requisition.requisitionLineItems[6]
        ];

        this.columns = [
            new this.RequisitionColumnDataBuilder().buildProductCodeColumn()
        ];

        spyOn(this.currentUserService, 'getUserInfo').andReturn(this.$q.resolve(this.user));
        spyOn(this.requisitionService, 'get').andReturn(this.$q.resolve(this.requisition));
        spyOn(this.requisitionViewFactory, 'canSubmit').andReturn(this.$q.resolve(true));
        spyOn(this.requisitionViewFactory, 'canAuthorize').andReturn(this.$q.resolve(true));
        spyOn(this.requisitionViewFactory, 'canApproveAndReject').andReturn(this.$q.resolve(true));
        spyOn(this.requisitionViewFactory, 'canDelete').andReturn(this.$q.resolve(true));
        spyOn(this.requisitionViewFactory, 'canSkip').andReturn(this.$q.resolve(true));
        spyOn(this.programService, 'get').andReturn(this.$q.when(this.program));
        spyOn(this.facilityService, 'get').andReturn(this.$q.resolve(this.facility));
        spyOn(this.periodService, 'get').andReturn(this.$q.resolve(this.period));

        this.requisition.template.getColumns.andReturn(this.columns);
    });

    it('should prepare non full supply line items', function() {
        this.goToUrl('/requisition/requisition-id/nonFullSupply?nonFullSupplyListPage=0&nonFullSupplyListSize=2');

        expect(this.getResolvedValue('lineItems')).toEqual(this.lineItems);
    });

    it('should prepare page items', function() {
        this.goToUrl('/requisition/requisition-id/nonFullSupply?nonFullSupplyListPage=1&nonFullSupplyListSize=2');

        expect(this.getResolvedValue('items')).toEqual([
            this.lineItems[2],
            this.lineItems[3]
        ]);
    });

    it('should prepare columns', function() {
        this.goToUrl('/requisition/requisition-id/nonFullSupply?nonFullSupplyListPage=0&nonFullSupplyListSize=2');

        expect(this.getResolvedValue('columns')).toEqual(this.columns);
        expect(this.requisition.template.getColumns).toHaveBeenCalledWith(true);
    });

    it('should set full supply flag to false', function() {
        this.goToUrl('/requisition/requisition-id/nonFullSupply?nonFullSupplyListPage=0&nonFullSupplyListSize=2');

        expect(this.getResolvedValue('fullSupply')).toEqual(false);
    });

    function goToUrl(url) {
        this.$location.url(url);
        this.$rootScope.$apply();
    }

    function getResolvedValue(name) {
        return this.$state.$current.locals.globals[name];
    }

});