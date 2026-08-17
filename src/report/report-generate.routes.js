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
 * http://www.gnu.org/licenses. For additional information contact info@OpenLMIS.org.
 */

(function() {

    'use strict';

    angular
        .module('report')
        .config(config);

    config.$inject = [
        '$stateProvider',
        'REPORT_RIGHTS'
    ];

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

                       
                        facilities: function(facilityService) {
                            return facilityService.search(
                                {
                                    page: 0,
                                    size: 10000
                                },
                                {}
                            ).then(function(facilitiesPage) {
                                return facilitiesPage.content || [];
                            });
                        },

                        /*
                         * Group facilities by their actual district
                         * using the geographic-zone hierarchy.
                         */
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
                                ],
                                grouped = {};

                            /*
                             * Create an empty bucket for each district.
                             */
                            angular.forEach(
                                districts,
                                function(district) {
                                    grouped[district] = [];
                                }
                            );

                            /*
                             * Walk up the geographic-zone hierarchy
                             * until a district-level zone is found.
                             */
                            function findDistrict(geographicZone) {

                                var zone = geographicZone;

                                while (zone) {

                                    if (
                                        zone.level &&
                                        (
                                            zone.level.code === 'district' ||
                                            zone.level.levelNumber === 3
                                        )
                                    ) {
                                        return zone.name;
                                    }

                                    zone = zone.parent;
                                }

                                return null;
                            }

                            /*
                             * Assign each facility to its district.
                             */
                            angular.forEach(
                                facilities,
                                function(facility) {

                                    if (
                                        !facility ||
                                        !facility.geographicZone
                                    ) {
                                        return;
                                    }

                                    var district =
                                        findDistrict(
                                            facility.geographicZone
                                        );

                                    if (
                                        !district ||
                                        !grouped[district]
                                    ) {
                                        return;
                                    }

                                    grouped[district].push(
                                        facility
                                    );
                                }
                            );

                            /*
                             * Sort facilities alphabetically
                             * inside each district.
                             */
                            angular.forEach(
                                districts,
                                function(district) {

                                    grouped[district].sort(
                                        function(a, b) {
                                            return a.name.localeCompare(
                                                b.name
                                            );
                                        }
                                    );
                                }
                            );

                            return grouped;
                        },

                        reportParamsOptions: function(
                            report,
                            reportFactory
                        ) {
                            return reportFactory
                                .getReportParamsOptions(
                                    report
                                );
                        }
                    }
                }
            }
        });
    }

})();