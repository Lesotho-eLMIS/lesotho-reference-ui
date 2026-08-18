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
 * http://www.gnu.org/licenses/. For additional information contact info@OpenLMIS.org.
 */

(function() {

    'use strict';

    /**
     * @ngdoc controller
     * @name report.controller:ReportGenerateController
     *
     * @description
     * Controller for report options page.
     */
    angular
        .module('report')
        .controller('ReportGenerateController', controller);

    controller.$inject = [
        '$state',
        '$scope',
        '$window',
        'report',
        'reportFactory',
        '$timeout',
        'reportParamsOptions',
        'reportUrlFactory',
        'accessTokenFactory',
        '$q',
        'messageService',
        'facilitiesByDistrict'
    ];

    function controller(
        $state,
        $scope,
        $window,
        report,
        reportFactory,
        $timeout,
        reportParamsOptions,
        reportUrlFactory,
        accessTokenFactory,
        $q,
        messageService,
        facilitiesByDistrict
    ) {

        var vm = this;

        /*
         * Only these districts should appear
         * in the District dropdown.
         */
        var allowedDistricts = [
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

        vm.$onInit = onInit;
        vm.downloadReport = downloadReport;
        vm.reinitializeSelect = reinitializeSelect;

        vm.paramsInfo = {
            GeographicZone: 'report.geographicZoneInfo',
            DueDays: 'report.dueDaysInfo'
        };

        vm.messageService = messageService;

        vm.booleanOptions = [
            {
                name: messageService.get(
                    'report.boolean.true'
                ),
                value: 'true'
            },
            {
                name: messageService.get(
                    'report.boolean.false'
                ),
                value: 'false'
            }
        ];

        vm.report = report;

        vm.paramsOptions = reportParamsOptions;

        vm.selectedParamsOptions = {};

        vm.selectedParamsDependencies = {};

        vm.format = 'pdf';

        /**
         * Downloads the report.
         */
        function downloadReport() {

            $window.open(
                accessTokenFactory.addAccessToken(
                    reportUrlFactory.buildUrl(
                        vm.report.$module,
                        vm.report,
                        vm.selectedParamsOptions,
                        vm.format
                    )
                ),
                '_blank'
            );
        }

        /**
         * Watches report parameter dependencies.
         */
        function watchDependency(param, dep) {

            var watchProperty =
                'vm.selectedParamsOptions.' +
                dep.dependency;

            $scope.$watch(
                watchProperty,
                function(newVal) {

                    vm.selectedParamsDependencies[
                        dep.dependency
                    ] = newVal;

                    if (newVal) {

                        reportFactory
                            .getReportParamOptions(
                                param,
                                vm.selectedParamsDependencies
                            )
                            .then(function(items) {

                                vm.paramsOptions[
                                    param.name
                                ] = items;
                            });
                    }
                }
            );
        }

        /**
         * Filters the District parameter so only
         * the ten Lesotho districts are displayed.
         */
        function filterDistrictOptions() {

            if (
                !vm.paramsOptions.district ||
                !angular.isArray(
                    vm.paramsOptions.district
                )
            ) {
                return;
            }

            vm.paramsOptions.district =
                vm.paramsOptions.district.filter(
                    function(option) {

                        var districtName =
                            option.name ||
                            option.displayName ||
                            option.value;

                        return allowedDistricts.indexOf(
                            districtName
                        ) !== -1;
                    }
                );
        }

        /**
         * Finds the actual district name
         * represented by the selected value.
         */
        function getSelectedDistrictName(
            selectedValue
        ) {

            var districtName = null;

            if (!selectedValue) {
                return null;
            }

            /*
             * Selected value may already be the district name.
             */
            if (
                angular.isString(selectedValue) &&
                allowedDistricts.indexOf(
                    selectedValue
                ) !== -1
            ) {
                return selectedValue;
            }

            /*
             * Selected value may be an object.
             */
            if (angular.isObject(selectedValue)) {

                districtName =
                    selectedValue.name ||
                    selectedValue.displayName ||
                    selectedValue.value;

                if (
                    allowedDistricts.indexOf(
                        districtName
                    ) !== -1
                ) {
                    return districtName;
                }
            }

            /*
             * Otherwise match the selected value
             * against the existing District options.
             */
            angular.forEach(
                vm.paramsOptions.district || [],
                function(option) {

                    if (districtName) {
                        return;
                    }

                    if (
                        option.value === selectedValue ||
                        option.id === selectedValue
                    ) {

                        districtName =
                            option.name ||
                            option.displayName ||
                            option.value;
                    }
                }
            );

            return districtName;
        }

        /**
         * Rebuilds Select2 after Facility options change.
         */
        function refreshFacilitySelect() {

            $timeout(function() {

                var element =
                    angular.element('#facility');

                if (!element.length) {
                    return;
                }

                if (element.data('select2')) {
                    element.select2('destroy');
                }

                $timeout(
                    function() {
                        reinitializeSelect(
                            'facility'
                        );
                    },
                    0
                );

            }, 0);
        }

        /**
         * Updates Facility options using the
         * selected District.
         */
        function updateFacilityOptions(
            selectedDistrict
        ) {

            /*
             * Clear Facility whenever District changes.
             */
            vm.selectedParamsOptions.facility = null;

            var districtName =
                getSelectedDistrictName(
                    selectedDistrict
                );

            if (!districtName) {

                vm.paramsOptions.facility = [];

                refreshFacilitySelect();

                return;
            }

            var facilities =
                facilitiesByDistrict[
                    districtName
                ] || [];

            /*
             * Convert facilities into the same shape
             * expected by the report select.
             */
            vm.paramsOptions.facility =
                facilities.map(
                    function(facility) {

                        return {
                            name: facility.name,
                            value: facility.name
                        };
                    }
                );

            refreshFacilitySelect();
        }

        /**
         * Watches District selection and updates
         * the Facility dropdown.
         */
        function watchDistrictSelection() {

            $scope.$watch(
                'vm.selectedParamsOptions.district',
                function(
                    newDistrict,
                    oldDistrict
                ) {

                    if (
                        newDistrict === oldDistrict &&
                        !newDistrict
                    ) {
                        return;
                    }

                    updateFacilityOptions(
                        newDistrict
                    );
                }
            );
        }

        /**
         * Controller initialization.
         */
        function onInit() {

            /*
             * Keep only the ten District options.
             */
            filterDistrictOptions();

            /*
             * Facility starts empty.
             * It is populated after District selection.
             */
            vm.paramsOptions.facility = [];

            /*
             * Watch District changes.
             */
            watchDistrictSelection();

            /*
             * Existing dependency handling.
             */
            angular.forEach(
                report.templateParameters,
                function(param) {

                    angular.forEach(
                        param.dependencies,
                        function(dependency) {

                            watchDependency(
                                param,
                                dependency
                            );
                        }
                    );
                }
            );
        }

        /**
         * Reinitializes Select2.
         */
        function reinitializeSelect(
            parameterName
        ) {

            $timeout(function() {

                var element =
                    angular.element(
                        '#' + parameterName
                    );

                if (!element.length) {
                    return;
                }

                if (element.data('select2')) {
                    element.select2('destroy');
                }

                element.select2({

                    allowClear: true,

                    selectOnClose: true,

                    placeholder:
                        getPlaceholder(
                            element
                        ),

                    language: {

                        noResults: function() {

                            return messageService.get(
                                'openlmisForm.selectNoResults'
                            );
                        }
                    }
                });

            });
        }

        /**
         * Gets placeholder text.
         */
        function getPlaceholder(element) {

            var placeholderOption =
                element.children(
                    '.placeholder:first'
                );

            if (
                placeholderOption.length === 0
            ) {
                return false;
            }

            return {
                id:
                    placeholderOption.val(),

                text:
                    placeholderOption.text()
            };
        }
    }

})();