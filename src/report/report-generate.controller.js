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
        .controller('ReportGenerateController', controller);

    controller.$inject = [
        '$state', '$scope', '$window', 'report', 'reportFactory', '$timeout',
        'reportParamsOptions', 'reportUrlFactory', 'accessTokenFactory', '$q',
        'messageService', 'facilitiesByDistrict'
    ];

    function controller($state, $scope, $window, report, reportFactory, $timeout,
                        reportParamsOptions, reportUrlFactory, accessTokenFactory, $q,
                        messageService, facilitiesByDistrict) {

        var vm = this;

        // Custom Lesotho district list used to filter geographic-zone options.
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

        vm.booleanOptions = [{
            name: messageService.get('report.boolean.true'),
            value: 'true'
        }, {
            name: messageService.get('report.boolean.false'),
            value: 'false'
        }];

        vm.report = report;

        vm.paramsOptions = reportParamsOptions;

        vm.selectedParamsOptions = {};

        vm.selectedParamsDependencies = {};

        vm.format = 'pdf';

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

        function watchDependency(param, dep) {
            var watchProperty = 'vm.selectedParamsOptions.' + dep.dependency;

            $scope.$watch(watchProperty, function(newVal) {
                vm.selectedParamsDependencies[dep.dependency] = newVal;

                if (newVal) {
                    reportFactory.getReportParamOptions(
                        param,
                        vm.selectedParamsDependencies
                    ).then(function(items) {
                        vm.paramsOptions[param.name] = items;
                    });
                }
            });
        }

        // Keep only the ten administrative districts.
        function filterDistrictOptions() {
            if (!vm.paramsOptions.district ||
                !angular.isArray(vm.paramsOptions.district)) {
                return;
            }

            vm.paramsOptions.district =
                vm.paramsOptions.district.filter(function(option) {

                    var districtName =
                        option.name ||
                        option.displayName ||
                        option.value;

                    return allowedDistricts.indexOf(districtName) !== -1;
                });
        }

        function getSelectedDistrictName(selectedValue) {
            if (!selectedValue) {
                return null;
            }

            if (angular.isString(selectedValue) &&
                allowedDistricts.indexOf(selectedValue) !== -1) {
                return selectedValue;
            }

            if (angular.isObject(selectedValue)) {
                var objectName =
                    selectedValue.name ||
                    selectedValue.displayName ||
                    selectedValue.value;

                if (allowedDistricts.indexOf(objectName) !== -1) {
                    return objectName;
                }
            }

            var districtName = null;

            angular.forEach(vm.paramsOptions.district, function(option) {
                if (districtName) {
                    return;
                }

                if (option.value === selectedValue ||
                    option.id === selectedValue) {

                    districtName =
                        option.name ||
                        option.displayName ||
                        option.value;
                }
            });

            return districtName;
        }

        // Rebuild only the Facility Select2 when district-based options change.
        function refreshFacilitySelect() {
            $timeout(function() {
                var element = angular.element('#facility');

                if (!element.length) {
                    return;
                }

                if (element.data('select2')) {
                    element.select2('destroy');
                }

                $timeout(function() {
                    reinitializeSelect('facility');
                }, 0);

            }, 0);
        }

        // Replace Facility options with facilities from the selected district.
        function updateFacilityOptions(selectedDistrict) {
            vm.selectedParamsOptions.facility = null;

            var districtName =
                getSelectedDistrictName(selectedDistrict);

            if (!districtName) {
                vm.paramsOptions.facility = [];
                refreshFacilitySelect();
                return;
            }

            var facilities =
                facilitiesByDistrict[districtName] || [];

            vm.paramsOptions.facility =
                facilities.map(function(facility) {
                    return {
                        name: facility.name,
                        value: facility.name
                    };
                });

            refreshFacilitySelect();
        }

        // Watch the District parameter and update Facility accordingly.
        function watchDistrictSelection() {
            $scope.$watch(
                'vm.selectedParamsOptions.district',
                function(newDistrict, oldDistrict) {

                    if (newDistrict === oldDistrict &&
                        !newDistrict) {
                        return;
                    }

                    updateFacilityOptions(newDistrict);
                }
            );
        }

        function onInit() {

            // Custom district/facility filtering.
            filterDistrictOptions();

            if (vm.paramsOptions.facility) {
                vm.paramsOptions.facility = [];
            }

            watchDistrictSelection();

            // Original OpenLMIS dependency handling.
            angular.forEach(report.templateParameters, function(param) {
                angular.forEach(param.dependencies, function(dependency) {
                    watchDependency(param, dependency);
                });
            });
        }

        /**
         * Original OpenLMIS Select2 initialization.
         *
         * Important:
         * Do not destroy Select2 here because this function is used
         * by every report dropdown, including Program and District.
         */
        function reinitializeSelect(parameterName) {
            $timeout(function() {
                var element = angular.element('#' + parameterName);

                element.select2({
                    allowClear: true,
                    selectOnClose: true,
                    placeholder: getPlaceholder(element),
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

        function getPlaceholder(element) {
            var placeholderOption =
                element.children('.placeholder:first');

            if (placeholderOption.length === 0) {
                return false;
            }

            return {
                id: placeholderOption.val(),
                text: placeholderOption.text()
            };
        }
    }

})();