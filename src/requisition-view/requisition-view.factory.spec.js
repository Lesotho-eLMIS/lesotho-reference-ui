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

describe('requisitionViewFactory', function() {

    beforeEach(function() {
        module('requisition-view');

        var UserDataBuilder, RequisitionDataBuilder;
        inject(function($injector) {
            RequisitionDataBuilder = $injector.get('RequisitionDataBuilder');
            UserDataBuilder = $injector.get('UserDataBuilder');

            this.requisitionViewFactory = $injector.get('requisitionViewFactory');
            this.$q = $injector.get('$q');
            this.permissionService = $injector.get('permissionService');
            this.$rootScope = $injector.get('$rootScope');
        });

        this.requisition = new RequisitionDataBuilder().build();

        this.user = new UserDataBuilder()
            .withSupervisionRoleAssignment('1', this.requisition.supervisoryNode, this.requisition.program.id)
            .build();

        spyOn(this.permissionService, 'hasPermission').andReturn(this.$q.when(true));
        spyOn(this.permissionService, 'hasRoleWithRightForProgramAndSupervisoryNode').andReturn(this.$q.resolve(true));

        this.requisition.$isInitiated.andReturn(false);
        this.requisition.$isRejected.andReturn(false);
        this.requisition.$isSubmitted.andReturn(false);
        this.requisition.$isAuthorized.andReturn(false);
        this.requisition.$isInApproval.andReturn(false);
        this.requisition.$isSkipped.andReturn(false);
        this.requisition.$isApproved.andReturn(false);
    });

    describe('canSubmit', function() {

        it('should be true if requisition is initiated and user has right to create (initiate/submit) this requisition',
            function() {
                this.requisition.$isInitiated.andReturn(true);

                var result;
                this.requisitionViewFactory.canSubmit(this.user.id, this.requisition)
                    .then(function(response) {
                        result = response;
                    });
                this.$rootScope.$apply();

                expect(result).toBe(true);
            });

        it('should be true if requisition is rejected and user has right to create (initiate/submit) this requisition',
            function() {
                this.requisition.$isRejected.andReturn(true);

                var result;
                this.requisitionViewFactory.canSubmit(this.user.id, this.requisition)
                    .then(function(response) {
                        result = response;
                    });
                this.$rootScope.$apply();

                expect(result).toBe(true);
            });

        it('should be false if requisition is not initiated or rejected', function() {
            this.requisition.$isSubmitted.andReturn(true);

            var result;
            this.requisitionViewFactory.canSubmit(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);

        });

        it('should be false if user does not have right to create (initiate/submit) this requisition', function() {
            this.permissionService.hasPermission.andReturn(this.$q.resolve(false));

            var result;
            this.requisitionViewFactory.canSubmit(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

    });

    describe('canAuthorize', function() {

        it('should be true if requisition is submitted and user has right to authorize this requisition', function() {
            this.requisition.$isSubmitted.andReturn(true);

            var result;
            this.requisitionViewFactory.canAuthorize(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(true);
        });

        it('should be false if requisition is not submitted', function() {
            this.requisition.$isInitiated.andReturn(true);

            var result;
            this.requisitionViewFactory.canAuthorize(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

        it('should be false if user does not have right to authorize this requisition', function() {
            this.permissionService.hasPermission.andReturn(this.$q.resolve(false));

            var result;
            this.requisitionViewFactory.canAuthorize(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

    });

    describe('canApproveAndReject', function() {

        it('should be true if requisition is authorized and user has right to approve this requisition and has right' +
            ' to supervisory node', function() {
            this.requisition.$isAuthorized.andReturn(true);

            var result;
            this.requisitionViewFactory.canApproveAndReject(this.user, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(true);
        });

        it('should be true if requisition is in approval and user has right to approve this requisition and has right' +
            ' to supervisory node', function() {
            this.requisition.$isInApproval.andReturn(true);

            var result;
            this.requisitionViewFactory.canApproveAndReject(this.user, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(true);
        });

        it('should be false if requisition is not authorized or in approval', function() {
            this.requisition.$isInitiated.andReturn(true);

            var result;
            this.requisitionViewFactory.canApproveAndReject(this.user, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

        it('should be false if user does not have right to approve this requisition', function() {
            this.requisition.$isInApproval.andReturn(true);
            this.permissionService.hasRoleWithRightForProgramAndSupervisoryNode.andReturn(this.$q.resolve(false));

            var result;
            this.requisitionViewFactory.canApproveAndReject(this.user, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

    });

    describe('canDelete', function() {

        it('should be true if requisition is initiated and user has right to create (initiate/submit) and delete this' +
            ' requisition', function() {
            this.requisition.$isInitiated.andReturn(true);

            var result;
            this.requisitionViewFactory.canDelete(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(true);
        });

        it('should be true if requisition is rejected and user has right to create (initiate/submit) and delete this' +
            ' requisition', function() {
            this.requisition.$isRejected.andReturn(true);

            var result;
            this.requisitionViewFactory.canDelete(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(true);
        });

        it('should be true if requisition is skipped and user has right to create (initiate/submit) and delete this' +
            ' requisition', function() {
            this.requisition.$isSkipped.andReturn(true);

            var result;
            this.requisitionViewFactory.canDelete(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(true);
        });

        it('should be true if requisition is submitted and user has right to authorize and delete this requisition',
            function() {
                this.requisition.$isSubmitted.andReturn(true);

                var result;
                this.requisitionViewFactory.canDelete(this.user.id, this.requisition)
                    .then(function(response) {
                        result = response;
                    });
                this.$rootScope.$apply();

                expect(result).toBe(true);
            });

        it('should be false if requisition is initiated and user does not have right to create (initiate/submit) this' +
            ' requisition', function() {
            this.requisition.$isInitiated.andReturn(true);

            var $q = this.$q;
            this.permissionService.hasPermission.andCallFake(function(userId, params) {
                return params.right === 'REQUISITION_CREATE' ? $q.reject() : $q.resolve();
            });

            var result;
            this.requisitionViewFactory.canDelete(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

        it('should be false if requisition is submitted and user does not have right to authorize this requisition',
            function() {
                this.requisition.$isSubmitted.andReturn(true);

                var $q = this.$q;
                this.permissionService.hasPermission.andCallFake(function(userId, params) {
                    return params.right === 'REQUISITION_AUTHORIZE' ? $q.reject() : $q.resolve();
                });

                var result;
                this.requisitionViewFactory.canDelete(this.user.id, this.requisition)
                    .then(function(response) {
                        result = response;
                    });
                this.$rootScope.$apply();

                expect(result).toBe(false);
            });

        it('should be false if user does not have right to delete this requisition', function() {
            this.requisition.$isInitiated.andReturn(true);

            var $q = this.$q;
            this.permissionService.hasPermission.andCallFake(function(userId, params) {
                return params.right === 'REQUISITION_DELETE' ? $q.reject() : $q.resolve();
            });

            var result;
            this.requisitionViewFactory.canDelete(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

        it('should be false if requisition is not initiated, rejected, skipped or submitted', function() {
            this.requisition.$isApproved.andReturn(true);

            var result;
            this.requisitionViewFactory.canDelete(this.user.id, this.requisition)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

    });

    describe('canSkip', function() {

        it('should be true if requisition is initiated, skippable periods are configured, requisition is not' +
            'emergency, and user has right to create (initiate/submit) this requisition', function() {
            this.requisition.$isInitiated.andReturn(true);
            this.requisition.program.periodsSkippable = true;
            this.requisition.emergency = false;

            var result;
            this.requisitionViewFactory.canSkip(this.user.id, this.requisition, this.requisition.program)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(true);
        });

        it('should be true if requisition is rejected, skippable periods are configured, requisition is not' +
            ' emergency, and user has right to create (initiate/submit) this requisition', function() {
            this.requisition.$isRejected.andReturn(true);
            this.requisition.program.periodsSkippable = true;
            this.requisition.emergency = false;

            var result;
            this.requisitionViewFactory.canSkip(this.user.id, this.requisition, this.requisition.program)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(true);
        });

        it('should be false if requisition is not initiated or rejected', function() {
            this.requisition.$isSubmitted.andReturn(true);

            var result;
            this.requisitionViewFactory.canSkip(this.user.id, this.requisition, this.requisition.program)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

        it('should be false if skippable periods are not configured', function() {
            this.requisition.$isInitiated.andReturn(true);
            this.requisition.program.periodsSkippable = false;

            var result;
            this.requisitionViewFactory.canSkip(this.user.id, this.requisition, this.requisition.program)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

        it('should be false if requisition is emergency', function() {
            this.requisition.$isInitiated.andReturn(true);
            this.requisition.program.periodsSkippable = true;
            this.requisition.emergency = true;

            var result;
            this.requisitionViewFactory.canSkip(this.user.id, this.requisition, this.requisition.program)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

        it('should be false if user does not have right to create (initiate/submit) this requisition', function() {
            var $q = this.$q;
            this.permissionService.hasPermission.andCallFake(function(userId, params) {
                return params.right === 'REQUISITION_CREATE' ? $q.reject() : $q.resolve();
            });

            var result;
            this.requisitionViewFactory.canSkip(this.user.id, this.requisition, this.requisition.program)
                .then(function(response) {
                    result = response;
                });
            this.$rootScope.$apply();

            expect(result).toBe(false);
        });

    });

});