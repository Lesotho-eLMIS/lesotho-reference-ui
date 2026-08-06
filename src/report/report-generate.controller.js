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
        'messageService'
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
        messageService
    ) {
        var vm = this;

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
        vm.booleanOptions = [
            {
                name: messageService.get('report.boolean.true'),
                value: 'true'
            },
            {
                name: messageService.get('report.boolean.false'),
                value: 'false'
            }
        ];

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
         * The parameter options for this report.
         */
        vm.paramsOptions = reportParamsOptions;

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name selectedParamsOptions
         * @type {Object}
         *
         * @description
         * Selected parameter values by parameter name.
         */
        vm.selectedParamsOptions = {};

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name selectedParamsDependencies
         * @type {Object}
         *
         * @description
         * Parameter dependencies and their selected values.
         */
        vm.selectedParamsDependencies = {};

        /**
         * @ngdoc property
         * @propertyOf report.controller:ReportGenerateController
         * @name format
         * @type {String}
         *
         * @description
         * Selected report output format.
         */
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
         * Watches a dependency and reloads dependent parameter options.
         */
        function watchDependency(param, dep) {
            var watchProperty =
                'vm.selectedParamsOptions.' + dep.dependency;

            $scope.$watch(watchProperty, function(newVal) {
                vm.selectedParamsDependencies[dep.dependency] = newVal;

                if (newVal) {
                    reportFactory
                        .getReportParamOptions(
                            param,
                            vm.selectedParamsDependencies
                        )
                        .then(function(items) {
                            vm.paramsOptions[param.name] = items;
                        });
                }
            });
        }

        /**
         * Controller initialization.
         */
        function onInit() {
            angular.forEach(
                report.templateParameters,
                function(param) {
                    angular.forEach(
                        param.dependencies,
                        function(dependency) {
                            watchDependency(param, dependency);
                        }
                    );
                }
            );
        }

        /**
         * Reinitializes select2 for a given parameter.
         */
        function reinitializeSelect(parameterName) {
            $timeout(function() {
                var element =
                    angular.element('#' + parameterName);

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

        /**
         * Returns the placeholder defined in the first placeholder option.
         */
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