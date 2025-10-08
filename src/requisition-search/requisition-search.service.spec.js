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

describe('RequisitionSearchService', function() {

    beforeEach(function() {
        module('requisition-search');

        this.prepareFacilities = prepareFacilities;
        this.prepareRequisitionGroups = prepareRequisitionGroups;
        this.prepareSupervisoryNodes = prepareSupervisoryNodes;
        this.preparePartnerNodes = preparePartnerNodes;
        this.prepareRights = prepareRights;
        this.prepareRoles = prepareRoles;
        this.prepareUser = prepareUser;
        this.prepareUserWithoutHomeFacility = prepareUserWithoutHomeFacility;
        this.prepareUserWithoutPartnerNodes = prepareUserWithoutPartnerNodes;

        inject(function($injector) {
            this.SupervisoryNodeDataBuilder = $injector.get('SupervisoryNodeDataBuilder');
            this.FacilityDataBuilder = $injector.get('FacilityDataBuilder');
            this.RequisitionGroupDataBuilder = $injector.get('RequisitionGroupDataBuilder');
            this.AuthUserDataBuilder = $injector.get('AuthUserDataBuilder');
            this.UserDataBuilder = $injector.get('UserDataBuilder');
            this.RightDataBuilder = $injector.get('RightDataBuilder');
            this.RoleDataBuilder = $injector.get('RoleDataBuilder');
            this.PageDataBuilder = $injector.get('PageDataBuilder');
            this.currentUserService = $injector.get('currentUserService');
            this.SupervisoryNodeResource = $injector.get('SupervisoryNodeResource');
            this.facilityFactory = $injector.get('facilityFactory');
            this.RequisitionGroupResource = $injector.get('RequisitionGroupResource');
            this.authorizationService = $injector.get('authorizationService');
            this.REQUISITION_RIGHTS = $injector.get('REQUISITION_RIGHTS');
            this.$q = $injector.get('$q');
            this.$rootScope = $injector.get('$rootScope');
            this.requisitionSearchService = $injector.get('requisitionSearchService');
            this.RoleResource = $injector.get('RoleResource');
            this.localStorageService = $injector.get('localStorageService');
        });

        this.prepareFacilities();
        this.prepareRequisitionGroups();
        this.prepareSupervisoryNodes();
        this.preparePartnerNodes();
        this.prepareRights();
        this.prepareRoles();
        this.prepareUser();

        spyOn(this.currentUserService, 'getUserInfo').andReturn(this.$q.resolve(this.user));
        spyOn(this.RoleResource.prototype, 'query').andReturn(this.$q.resolve(this.roles));
        spyOn(this.RequisitionGroupResource.prototype, 'query').andReturn(this.$q.resolve([
            this.requisitionGroupA,
            this.requisitionGroupB,
            this.requisitionGroupC
        ]));
        spyOn(this.facilityFactory, 'getAllUserFacilities').andReturn(this.$q.resolve([]));
        spyOn(this.localStorageService, 'get');
        spyOn(this.localStorageService, 'add');
        spyOn(this.localStorageService, 'remove');

        var context = this;
        spyOn(this.SupervisoryNodeResource.prototype, 'query').andCallFake(function(params) {
            var nodes = params.id.map(function(id) {
                return context.nodesMap[id];
            });

            var page = new context.PageDataBuilder()
                .withContent(nodes)
                .build();
            return context.$q.resolve(page);
        });
    });

    describe('getFacilities', function() {

        it('should handle null requisition group', function() {
            this.supervisoryNodeA.requisitionGroup = undefined;

            var result;
            this.requisitionSearchService
                .getFacilities()
                .then(function(facilities) {
                    result = facilities;
                });
            this.$rootScope.$apply();

            expect(result).toEqual([
                this.facilityF
            ]);

        });

        it('should not return duplicated facilities', function() {
            //this facility comes from both permission strings and role assignments
            this.facilityFactory.getAllUserFacilities.andReturn([
                this.facilityF
            ]);

            var result;
            this.requisitionSearchService
                .getFacilities()
                .then(function(facilities) {
                    result = facilities;
                });
            this.$rootScope.$apply();

            expect(result.indexOf(this.facilityF)).toEqual(result.lastIndexOf(this.facilityF));
        });

        it('should return facilities sorted alphabetically', function() {
            var result;
            this.requisitionSearchService
                .getFacilities()
                .then(function(facilities) {
                    result = facilities;
                });
            this.$rootScope.$apply();

            expect(result).toEqual([
                this.facilityA,
                this.facilityB,
                this.facilityC,
                this.facilityF
            ]);
        });

        it('should reject if preparing partner facilities fails', function() {
            this.facilityFactory.getAllUserFacilities.andReturn(this.$q.reject());

            var rejected;
            this.requisitionSearchService
                .getFacilities()
                .catch(function() {
                    rejected = true;
                });
            this.$rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should reject if fetching requisition groups fails', function() {
            this.RequisitionGroupResource.prototype.query.andReturn(this.$q.reject());

            var rejected;
            this.requisitionSearchService
                .getFacilities()
                .catch(function() {
                    rejected = true;
                });
            this.$rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should reject if fetching supervisory nodes fails', function() {
            this.SupervisoryNodeResource.prototype.query.andReturn(this.$q.reject());

            var rejected;
            this.requisitionSearchService
                .getFacilities()
                .catch(function() {
                    rejected = true;
                });
            this.$rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should reject if retrieving user fails', function() {
            this.currentUserService.getUserInfo.andReturn(this.$q.reject());

            var rejected;
            this.requisitionSearchService
                .getFacilities()
                .catch(function() {
                    rejected = true;
                });
            this.$rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should not duplicate calls for subsequent calls', function() {
            this.requisitionSearchService.getFacilities();
            this.requisitionSearchService.getFacilities();

            this.$rootScope.$apply();

            expect(this.currentUserService.getUserInfo.callCount).toEqual(1);
            expect(this.facilityFactory.getAllUserFacilities.callCount).toEqual(1);
            expect(this.RequisitionGroupResource.prototype.query.callCount).toEqual(1);
            expect(this.RoleResource.prototype.query.callCount).toEqual(1);
            expect(this.SupervisoryNodeResource.prototype.query.callCount).toEqual(2);
        });

        it('should fetch data from the local storage after refreshing the page', function() {
            this.localStorageService.get.andReturn(angular.toJson([
                this.facilityA,
                this.facilityF
            ]));

            var result;
            this.requisitionSearchService.getFacilities()
                .then(function(facilities) {
                    result = facilities;
                });
            this.$rootScope.$apply();

            expect(this.localStorageService.get).toHaveBeenCalledWith('requisitionSearchFacilities');
            expect(angular.toJson(result)).toEqual(angular.toJson([
                this.facilityA,
                this.facilityF
            ]));
        });

        it('should not call backend if there is data in the local storage', function() {
            this.localStorageService.get.andReturn(angular.toJson([
                this.facilityA,
                this.facilityF
            ]));

            this.requisitionSearchService.getFacilities();
            this.$rootScope.$apply();

            expect(this.currentUserService.getUserInfo).not.toHaveBeenCalled();
            expect(this.facilityFactory.getAllUserFacilities).not.toHaveBeenCalled();
            expect(this.RequisitionGroupResource.prototype.query).not.toHaveBeenCalled();
            expect(this.RoleResource.prototype.query).not.toHaveBeenCalled();
            expect(this.SupervisoryNodeResource.prototype.query).not.toHaveBeenCalled();
        });

        it('should not call for supervisory nodes if user has no role with any', function() {
            this.prepareUserWithoutHomeFacility();
            this.currentUserService.getUserInfo.andReturn(this.$q.resolve(this.user));

            this.requisitionSearchService.getFacilities();
            this.$rootScope.$apply();

            expect(this.SupervisoryNodeResource.prototype.query).not.toHaveBeenCalled();
        });

        it('should not call for partner supervisory nodes if there is none for the facilities', function() {
            this.prepareUserWithoutPartnerNodes();
            this.currentUserService.getUserInfo.andReturn(this.$q.resolve(this.user));

            this.requisitionSearchService.getFacilities();
            this.$rootScope.$apply();

            expect(this.SupervisoryNodeResource.prototype.query.callCount).toEqual(1);
            expect(this.SupervisoryNodeResource.prototype.query).toHaveBeenCalledWith({
                id: [ this.supervisoryNodeA.id, this.supervisoryNodeC.id ]
            });
        });

        it('should cache facilities in the local storage', function() {
            this.requisitionSearchService.getFacilities();
            this.$rootScope.$apply();

            expect(this.localStorageService.add).toHaveBeenCalledWith('requisitionSearchFacilities', angular.toJson([
                this.facilityA,
                this.facilityB,
                this.facilityC,
                this.facilityF
            ]));
        });

    });

    describe('clearCachedFacilities', function() {

        it('should clear cached facilities', function() {
            this.requisitionSearchService.getFacilities();
            this.$rootScope.$apply();

            expect(this.currentUserService.getUserInfo.callCount).toEqual(1);
            expect(this.facilityFactory.getAllUserFacilities.callCount).toEqual(1);
            expect(this.RequisitionGroupResource.prototype.query.callCount).toEqual(1);
            expect(this.RoleResource.prototype.query.callCount).toEqual(1);
            expect(this.SupervisoryNodeResource.prototype.query.callCount).toEqual(2);

            this.requisitionSearchService.clearCachedFacilities();

            expect(this.localStorageService.remove).toHaveBeenCalledWith('requisitionSearchFacilities');

            this.requisitionSearchService.getFacilities();
            this.$rootScope.$apply();

            expect(this.currentUserService.getUserInfo.callCount).toEqual(2);
            expect(this.facilityFactory.getAllUserFacilities.callCount).toEqual(2);
            expect(this.RequisitionGroupResource.prototype.query.callCount).toEqual(2);
            expect(this.RoleResource.prototype.query.callCount).toEqual(2);
            expect(this.SupervisoryNodeResource.prototype.query.callCount).toEqual(4);
        });

    });

    function prepareFacilities() {
        this.facilityA = new this.FacilityDataBuilder()
            .withName('Facility A')
            .build();

        this.facilityB = new this.FacilityDataBuilder()
            .withName('Facility B')
            .build();

        this.facilityC = new this.FacilityDataBuilder()
            .withName('Facility C')
            .build();

        this.facilityD = new this.FacilityDataBuilder()
            .withName('Facility D')
            .build();

        this.facilityE = new this.FacilityDataBuilder()
            .withName('Facility E')
            .build();

        this.facilityF = new this.FacilityDataBuilder()
            .withName('Facility F')
            .build();

        this.facilityG = new this.FacilityDataBuilder()
            .withName('Facility G')
            .build();

        this.facilityH = new this.FacilityDataBuilder()
            .withName('Facility H')
            .build();
    }

    function prepareRequisitionGroups() {
        this.requisitionGroupA = new this.RequisitionGroupDataBuilder()
            .withMemberFacilities([
                this.facilityC,
                this.facilityA,
                this.facilityB
            ])
            .buildJson();

        this.requisitionGroupB = new this.RequisitionGroupDataBuilder()
            .withMemberFacilities([
                this.facilityF
            ])
            .buildJson();

        this.requisitionGroupC = new this.RequisitionGroupDataBuilder()
            .withMemberFacilities([
                this.facilityD
            ])
            .buildJson();
    }

    function prepareSupervisoryNodes() {
        this.nodesMap = {};

        this.supervisoryNodeA = new this.SupervisoryNodeDataBuilder()
            .withRequisitionGroup(this.requisitionGroupA)
            .build();
        this.nodesMap[this.supervisoryNodeA.id] = this.supervisoryNodeA;

        this.supervisoryNodeB = new this.SupervisoryNodeDataBuilder()
            .withRequisitionGroup(this.requisitionGroupB)
            .build();
        this.nodesMap[this.supervisoryNodeB.id] = this.supervisoryNodeB;

        this.supervisoryNodeC = new this.SupervisoryNodeDataBuilder()
            .withRequisitionGroup(this.requisitionGroupC)
            .build();
        this.nodesMap[this.supervisoryNodeC.id] = this.supervisoryNodeC;
    }

    function preparePartnerNodes() {
        this.partnerNodeA = new this.SupervisoryNodeDataBuilder()
            .withPartnerNodeOf(this.supervisoryNodeA)
            .build();
        this.nodesMap[this.partnerNodeA.id] = this.partnerNodeA;

        this.partnerNodeB = new this.SupervisoryNodeDataBuilder()
            .withPartnerNodeOf(this.supervisoryNodeB)
            .build();
        this.nodesMap[this.partnerNodeB.id] = this.partnerNodeB;

        this.partnerNodeC = new this.SupervisoryNodeDataBuilder()
            .withPartnerNodeOf(this.supervisoryNodeC)
            .build();
        this.nodesMap[this.partnerNodeC.id] = this.partnerNodeC;
    }

    function prepareRights() {
        this.rightA = new this.RightDataBuilder()
            .withName(this.REQUISITION_RIGHTS.REQUISITION_VIEW)
            .build();

        this.rightB = new this.RightDataBuilder()
            .withName(this.REQUISITION_RIGHTS.REQUISITION_CREATE)
            .build();
    }

    function prepareRoles() {
        this.roleA = new this.RoleDataBuilder()
            .withRight(this.rightA)
            .build();

        this.roleB = new this.RoleDataBuilder()
            .withRight(this.rightB)
            .build();

        this.roles = [
            this.roleB,
            this.roleA
        ];
    }

    function prepareUser() {
        this.programId = 'program-id';

        this.user = new this.UserDataBuilder()
            .withSupervisionRoleAssignment(this.roleA.id, this.partnerNodeA.id, this.programId)
            .withSupervisionRoleAssignment(this.roleA.id, this.partnerNodeB.id, this.programId)
            .withSupervisionRoleAssignment(this.roleB.id, this.partnerNodeC.id, this.programId)
            .withSupervisionRoleAssignment(this.roleA.id, this.supervisoryNodeC.id, this.programId)
            .withSupervisionRoleAssignment(this.roleA.id, null, this.programId)
            .buildReferenceDataUserJson();
    }

    function prepareUserWithoutHomeFacility() {
        this.programId = 'program-id';

        this.user = new this.UserDataBuilder()
            .withSupervisionRoleAssignment(this.roleA.id, null, this.programId)
            .withSupervisionRoleAssignment(this.roleB.id, null, this.programId)
            .withoutHomeFacilityId()
            .buildReferenceDataUserJson();
    }

    function prepareUserWithoutPartnerNodes() {
        this.programId = 'program-id';

        this.user = new this.UserDataBuilder()
            .withSupervisionRoleAssignment(this.roleA.id, this.supervisoryNodeA.id, this.programId)
            .withSupervisionRoleAssignment(this.roleA.id, this.supervisoryNodeC.id, this.programId)
            .buildReferenceDataUserJson();
    }

});