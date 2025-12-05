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

    angular
        .module('buq')
        .config(routes);

    routes.$inject = ['$stateProvider', 'BUQ_RIGHTS'];

    function routes($stateProvider, BUQ_RIGHTS) {

        function resolveHasBUQProgram(buqService, $q, alertService) {
            return buqService.userHasBUQProgram()
                .then(function(isBUQProgramAttached) {
                    if (isBUQProgramAttached) {
                        return;
                    }
                    alertService.error('buq.applicationError.title', 'buq.applicationError.message.userProgram');
                    return $q.reject({
                        status: '',
                        statusText: '',
                        data: ''
                    });
                })
                .catch(function() {
                    return $q.reject({
                        status: '',
                        statusText: '',
                        data: ''
                    });
                });
        }

        function resolveDoesSupportBUQProgram(buqService, $q, alertService) {
            return buqService.doesSupportBUQProgram()
                .then(function(isBUQProgramSupported) {
                    if (isBUQProgramSupported) {
                        return;
                    }

                    alertService.error('buq.applicationError.title',
                        'buq.applicationError.message.homeFacilityProgram');
                    return $q.reject({
                        status: '',
                        statusText: '',
                        data: ''
                    });
                })
                .catch(function() {
                    return $q.reject({
                        status: '',
                        statusText: '',
                        data: ''
                    });
                });
        }

        function createResolve(shouldCheckSupport) {
            var resolveObject = {
                hasBUQProgram: ['buqService', '$q', 'alertService', resolveHasBUQProgram]
            };

            if (shouldCheckSupport) {
                resolveObject.doesSupportBUQProgram = ['buqService', '$q', 'alertService',
                    resolveDoesSupportBUQProgram];
            }
            return resolveObject;
        }

        $stateProvider.state('openlmis.buq', {
            url: '/buq',
            label: 'buq.label',
            isOffline: false,
            priority: 995,
            showInNavigation: false,
            accessRights: [
                BUQ_RIGHTS.PREPARE_BUQ,
                BUQ_RIGHTS.CREATE_FORECASTING,
                BUQ_RIGHTS.AUTHORIZE_FORECASTING,
                BUQ_RIGHTS.APPROVE_BUQ,
                BUQ_RIGHTS.MOH_APPROVAL,
                BUQ_RIGHTS.PORALG_APPROVAL
            ],
            views: {
                '@': {
                    templateUrl: 'buq/buq.html'
                }
            }
        })
            .state('openlmis.buq.prepareBuq', {
                label: 'buq.prepareBuq',
                url: '/prepare',
                showInNavigation: false,
                priority: 13,
                accessRights: [BUQ_RIGHTS.PREPARE_BUQ],
                resolve: createResolve(true)
            })
            .state('openlmis.buq.createAuthorizeForecasting', {
                label: 'buq.createAuthorizeForecasting',
                url: '/create',
                showInNavigation: true,
                priority: 12,
                accessRights: [BUQ_RIGHTS.CREATE_FORECASTING, BUQ_RIGHTS.AUTHORIZE_FORECASTING],
                resolve: createResolve(true)
            })
            .state('openlmis.buq.facilityDemandingForecasting', {
                label: 'buq.facilityDemandingForecasting',
                url: '/create/:id',
                showInNavigation: false,
                priority: 12,
                accessRights: [BUQ_RIGHTS.CREATE_FORECASTING, BUQ_RIGHTS.AUTHORIZE_FORECASTING],
                resolve: createResolve(true)
            })
            .state('openlmis.buq.approveBuq', {
                label: 'buq.approveBuq',
                url: '/approve',
                showInNavigation: true,
                priority: 11,
                accessRights: [BUQ_RIGHTS.APPROVE_BUQ],
                resolve: createResolve(false)
            })
            .state('openlmis.buq.ApproveFacilityDemandingForecasting', {
                label: 'buq.facilityDemandingForecasting',
                url: '/approve/:id',
                showInNavigation: false,
                priority: 12,
                accessRights: [BUQ_RIGHTS.APPROVE_BUQ],
                resolve: createResolve(false)
            })
            .state('openlmis.buq.MOHPORALGApprovals', {
                label: 'buq.MOHPORALGApprovals',
                url: '/national-approve',
                showInNavigation: false,
                priority: 10,
                accessRights: [BUQ_RIGHTS.MOH_APPROVAL, BUQ_RIGHTS.PORALG_APPROVAL],
                resolve: createResolve(false)
            })
            .state('openlmis.buq.MOHPORALGApprovalsDistrict', {
                label: 'buq.MOHPORALGApprovals',
                url: '/national-approve/:districtId',
                showInNavigation: false,
                priority: 12,
                accessRights: [BUQ_RIGHTS.MOH_APPROVAL, BUQ_RIGHTS.PORALG_APPROVAL],
                resolve: createResolve(false)
            })
            .state('openlmis.buq.MOHPORALGApprovalsFacility', {
                label: 'buq.MOHPORALGApprovals',
                url: '/national-approve/:districtId/:facilityId',
                showInNavigation: false,
                priority: 12,
                accessRights: [BUQ_RIGHTS.MOH_APPROVAL, BUQ_RIGHTS.PORALG_APPROVAL],
                resolve: createResolve(false)
            })
            .state('openlmis.buq.MOHPORALGApproveFacilityDemandingForecasting', {
                label: 'buq.MOHPORALGApproval',
                url: '/national-approve/:districtId/:facilityId/:id',
                showInNavigation: false,
                accessRights: [BUQ_RIGHTS.MOH_APPROVAL, BUQ_RIGHTS.PORALG_APPROVAL],
                resolve: createResolve(false)
            })
            .state('openlmis.buq.MOHPORALGForFinalApproval', {
                label: 'buq.MOHPORALGApprovals',
                url: '/national-approval',
                showInNavigation: true,
                priority: 10,
                accessRights: [BUQ_RIGHTS.MOH_APPROVAL, BUQ_RIGHTS.PORALG_APPROVAL],
                resolve: createResolve(false)
            })
            .state('openlmis.buq.MOHPORALGBuqApprove', {
                label: 'buq.MOHPORALGApproval',
                url: '/national-approval/:id',
                showInNavigation: false,
                accessRights: [BUQ_RIGHTS.MOH_APPROVAL, BUQ_RIGHTS.PORALG_APPROVAL],
                resolve: createResolve(false)
            });
    }
})();
