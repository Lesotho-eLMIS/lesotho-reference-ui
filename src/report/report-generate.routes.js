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
 * http://www.gnu.org/licenses.
 */

(function() {

    'use strict';

    angular
        .module('report')
        .config(config);

    config.$inject = ['$stateProvider', 'REPORT_RIGHTS'];

    function config($stateProvider, REPORT_RIGHTS) {

        $stateProvider.state('openlmis.reports.list.generate', {
            label: 'report.generateReport',

            url: '/:module/:report/options',
            accessRights: [
                REPORT_RIGHTS.REPORTS_VIEW
            ],
            views: {
                '@openlmis': {
                    controller: 'ReportGenerateController',
                    controllerAs: 'vm',
                    templateUrl: 'report/report-generate.html',
                    resolve: {
                        report: function($stateParams, reportFactory) {
                            return reportFactory.getReport(
                                $stateParams.module,
                                $stateParams.report
                            );
                        },

                        // Load raw facility data so geographic-zone relationships are available.
                        facilities: function($http, openlmisUrlFactory) {
                            var url = openlmisUrlFactory('/api/facilities');

                            return $http.get(url, {
                                params: {
                                    page: 0,
                                    size: 10000
                                }
                            }).then(function(response) {
                                if (response.data &&
                                    angular.isArray(response.data.content)) {
                                    return response.data.content;
                                }

                                if (angular.isArray(response.data)) {
                                    return response.data;
                                }

                                return [];
                            });
                        },

                        // Group facilities by their actual district before initializing the controller.
                        facilitiesByDistrict: function(facilities) {
                            var districts = [
                                'Berea',
                                'Butha-Buthe',
                                'Leribe',
                                'Mafeteng',
                                'Maseru',
                                'Mohales Hoek',
                                'Mokhotlong',
                                'Qachas Neck',
                                'Quthing',
                                'Thaba-Tseka'
                            ];

                            var grouped = {};

                            angular.forEach(districts, function(district) {
                                grouped[district] = [];
                            });

                            function findDistrict(geographicZone) {
                                var zone = geographicZone;

                                while (zone) {
                                    if (zone.level &&
                                        (zone.level.code === 'district' ||
                                         zone.level.levelNumber === 3)) {
                                        return zone.name;
                                    }

                                    zone = zone.parent;
                                }

                                return null;
                            }

                            angular.forEach(facilities, function(facility) {
                                if (!facility || !facility.geographicZone) {
                                    return;
                                }

                                var district = findDistrict(
                                    facility.geographicZone
                                );

                                if (!district || !grouped[district]) {
                                    return;
                                }

                                grouped[district].push(facility);
                            });

                            angular.forEach(districts, function(district) {
                                grouped[district].sort(function(a, b) {
                                    return a.name.localeCompare(b.name);
                                });
                            });

                            return grouped;
                        },

                        reportParamsOptions: function(report, reportFactory) {
                            return reportFactory.getReportParamsOptions(report);
                        }
                    }
                }
            }
        });

    }

})();