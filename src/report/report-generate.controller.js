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
        '$state', '$scope', '$window', 'report', 'reportFactory', '$timeout',
        'reportParamsOptions', 'reportUrlFactory', 'accessTokenFactory', '$q',
        'messageService', 'facilitiesByDistrict'
    ];

    function controller($state, $scope, $window, report, reportFactory, $timeout,
                        reportParamsOptions, reportUrlFactory, accessTokenFactory, $q,
                        messageService, facilitiesByDistrict) {
        var vm = this;

        // Lesotho administrative districts used by report filtering.
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

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name messageService
         * @type {Object}
         *
         * @description
         * The object representing the message service.
         */
        vm.messageService = messageService;

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name booleanOptions
         *
         * @description
         * The options for the report parameter of type boolean.
         */
        vm.booleanOptions = [{
            name: messageService.get('report.boolean.true'),
            value: 'true'
        }, {
            name: messageService.get('report.boolean.false'),
            value: 'false'
        }];

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name report
         * @type {Object}
         *
         * @description
         * The object representing the selected report.
         */
        vm.report = report;

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name paramsOptions
         * @type {Array}
         *
         * @description
         * The param options for this report, by param. A param can have multiple options.
         */
        vm.paramsOptions = reportParamsOptions;

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name selectedParamsOptions
         * @type {Object}
         *
         * @description
         * The collection of selected options by param name.
         */
        vm.selectedParamsOptions = {};

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name selectedParamsDependencies
         * @type {Object}
         *
         * @description
         * The collection of parameter dependencies and their selected values.
         */
        vm.selectedParamsDependencies = {};

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name format
         * @type {String}
         *
         * @description
         * The format selected for the report.
         */
        vm.format = 'pdf';

        /**
         * @ngdoc method
         * @methodOf report.controller:ReportGenerateController
         * @name downloadReport
         *
         * @description
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
         * @ngdoc method
         * @methodOf report.controller:ReportGenerateController
         * @name watchDependency
         *
         * @description
         * Sets up a watch on report parameter selection to update dependent parameters.
         */
        function watchDependency(param, dep) {
            var watchProperty = 'vm.selectedParamsOptions.' + dep.dependency;

            $scope.$watch(watchProperty, function(newVal) {
                vm.selectedParamsDependencies[dep.dependency] = newVal;

                if (newVal) {
                    reportFactory.getReportParamOptions(param, vm.selectedParamsDependencies)
                        .then(function(items) {
                            vm.paramsOptions[param.name] = items;
                        });
                }
            });
        }

        // Keep only the ten administrative districts in the District parameter.
        function filterDistrictOptions() {
            if (!vm.paramsOptions.district ||
                !angular.isArray(vm.paramsOptions.district)) {
                return;
            }

            vm.paramsOptions.district = vm.paramsOptions.district.filter(function(option) {
                var districtName = option.name || option.displayName || option.value;

                return allowedDistricts.indexOf(districtName) !== -1;
            });
        }

        // Replace Facility options whenever a different district is selected.
        function watchDistrictSelection() {
            $scope.$watch('vm.selectedParamsOptions.district', function(district) {
                vm.selectedParamsOptions.facility = null;

                if (!district) {
                    vm.paramsOptions.facility = [];
                    reinitializeSelect('facility');
                    return;
                }

                vm.paramsOptions.facility = (facilitiesByDistrict[district] || [])
                    .map(function(facility) {
                        return {
                            name: facility.name,
                            value: facility.name
                        };
                    });

                reinitializeSelect('facility');
            });
        }

        /**
         * @ngdoc method
         * @methodOf report.controller:ReportGenerateController
         * @name $onInit
         *
         * @description
         * Initialization method of the ReportGenerateController.
         */
        function onInit() {

            // Configure district-based facility filtering for report parameters.
            filterDistrictOptions();

            if (vm.paramsOptions.facility) {
                vm.paramsOptions.facility = [];
            }

            watchDistrictSelection();

            angular.forEach(report.templateParameters, function(param) {
                angular.forEach(param.dependencies, function(dependency) {
                    watchDependency(param, dependency);
                });
            });
        }

        /**
         * @ngdoc method
         * @methodOf report.controller:ReportGenerateController
         * @name reinitializeSelect
         *
         * @description
         * Reinitializes the select2 plugin for the given parameter name.
         */
        function reinitializeSelect(parameterName) {
            $timeout(function() {
                var element = angular.element('#' + parameterName);

                if (element.data('select2')) {
                    element.select2('destroy');
                }

                element.select2({
                    allowClear: true,
                    selectOnClose: true,
                    placeholder: getPlaceholder(element),
                    language: {
                        noResults: function() {
                            return messageService.get('openlmisForm.selectNoResults');
                        }
                    }
                });
            });
        }

        /**
         * @ngdoc method
         * @methodOf report.controller:ReportGenerateController
         * @name getPlaceholder
         *
         * @description
         * Gets the placeholder text from the first item in the placeholder list.
         */
        function getPlaceholder(element) {
            var placeholderOption = element.children('.placeholder:first');

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