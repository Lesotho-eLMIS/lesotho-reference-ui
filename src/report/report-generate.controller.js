/*
 * This program is part of the OpenLMIS logistics management information system platform software.
 * Copyright © 2017 VillageReach
 *
 * This program is free software: you can redistribute it and/or modify it under the terms
 * of the GNU Affero General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 */

(function() {

    'use strict';

    angular
        .module('report')
        .controller(
            'ReportGenerateController',
            controller
        );

    controller.$inject = [
        '$scope',
        '$window',
        'report',
        'reportFactory',
        '$timeout',
        'reportParamsOptions',
        'reportUrlFactory',
        'accessTokenFactory',
        'messageService',
        'facilitiesByDistrict'
    ];

    function controller(
        $scope,
        $window,
        report,
        reportFactory,
        $timeout,
        reportParamsOptions,
        reportUrlFactory,
        accessTokenFactory,
        messageService,
        facilitiesByDistrict
    ) {

        var vm = this;

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

        vm.onFacilitySelectionChange =
            onFacilitySelectionChange;

        vm.selectAllFacilities =
            selectAllFacilities;

        vm.clearFacilities =
            clearFacilities;

        vm.paramsInfo = {
            GeographicZone:
                'report.geographicZoneInfo',

            DueDays:
                'report.dueDaysInfo'
        };

        vm.messageService =
            messageService;

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

        vm.paramsOptions =
            reportParamsOptions || {};

        vm.selectedParamsOptions = {};

        vm.selectedParamsDependencies = {};

        /*
         * Object used only by Facility checkboxes.
         */
        vm.selectedFacilityMap = {};

        vm.format = 'pdf';


        /**
         * Generate/download report.
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
         * Existing report dependency handling.
         */
        function watchDependency(
            param,
            dep
        ) {

            var watchProperty =
                'vm.selectedParamsOptions.' +
                dep.dependency;

            $scope.$watch(
                watchProperty,
                function(newVal) {

                    vm.selectedParamsDependencies[
                        dep.dependency
                    ] = newVal;

                    if (!newVal) {
                        return;
                    }

                    reportFactory
                        .getReportParamOptions(
                            param,
                            vm.selectedParamsDependencies
                        )
                        .then(
                            function(items) {

                                vm.paramsOptions[
                                    param.name
                                ] = items || [];
                            }
                        );
                }
            );
        }


        /**
         * Check if this particular report has
         * Facility configured for multiselect.
         */
        function hasFacilityMultiselect() {

            var found = false;

            angular.forEach(
                report.templateParameters || [],
                function(parameter) {

                    if (
                        parameter.name === 'facility' &&
                        parameter.description === 'multipleselect'
                    ) {
                        found = true;
                    }
                }
            );

            return found;
        }


        /**
         * Only show the 10 Lesotho Districts.
         */
        function filterDistrictOptions() {

            if (
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

                        return allowedDistricts
                            .indexOf(
                                districtName
                            ) !== -1;
                    }
                );
        }


        /**
         * Resolve selected District name.
         */
        function getSelectedDistrictName(
            selectedValue
        ) {

            var districtName = null;

            if (!selectedValue) {
                return null;
            }

            if (
                angular.isString(
                    selectedValue
                ) &&
                allowedDistricts.indexOf(
                    selectedValue
                ) !== -1
            ) {

                return selectedValue;
            }

            if (
                angular.isObject(
                    selectedValue
                )
            ) {

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
         * Replace Facility options whenever
         * District changes.
         */
        function updateFacilityOptions(
            selectedDistrict
        ) {

            vm.selectedParamsOptions.facility =
                [];

            vm.selectedFacilityMap =
                {};

            var districtName =
                getSelectedDistrictName(
                    selectedDistrict
                );

            if (!districtName) {

                vm.paramsOptions.facility =
                    [];

                return;
            }

            var facilities =
                facilitiesByDistrict[
                    districtName
                ] || [];

            vm.paramsOptions.facility =
                facilities.map(
                    function(facility) {

                        return {
                            name: facility.name,
                            value: facility.name
                        };
                    }
                );
        }


        /**
         * Watch District only for the report
         * using Facility multiselect.
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
         * Synchronize checkbox map into the
         * actual Facility array sent to Jasper.
         */
        function onFacilitySelectionChange() {

            var selected = [];

            angular.forEach(
                vm.paramsOptions.facility || [],
                function(option) {

                    if (
                        vm.selectedFacilityMap[
                            option.value
                        ]
                    ) {

                        selected.push(
                            option.value
                        );
                    }
                }
            );

            vm.selectedParamsOptions.facility =
                selected;
        }


        /**
         * Select every Facility in current District.
         */
        function selectAllFacilities() {

            vm.selectedFacilityMap = {};

            angular.forEach(
                vm.paramsOptions.facility || [],
                function(option) {

                    vm.selectedFacilityMap[
                        option.value
                    ] = true;
                }
            );

            onFacilitySelectionChange();
        }


        /**
         * Clear selected Facilities.
         */
        function clearFacilities() {

            vm.selectedFacilityMap = {};

            vm.selectedParamsOptions.facility =
                [];
        }


        /**
         * Controller initialization.
         */
        function onInit() {

            angular.forEach(
                report.templateParameters || [],
                function(param) {

                    if (
                        param.description ===
                        'multipleselect'
                    ) {

                        vm.selectedParamsOptions[
                            param.name
                        ] = [];
                    }

                    angular.forEach(
                        param.dependencies || [],
                        function(dependency) {

                            watchDependency(
                                param,
                                dependency
                            );
                        }
                    );
                }
            );

            /*
             * Do District → Facility filtering
             * ONLY for reports configured for it.
             */
            if (
                hasFacilityMultiselect()
            ) {

                if (
                    !vm.paramsOptions.district
                ) {
                    vm.paramsOptions.district =
                        [];
                }

                vm.paramsOptions.facility =
                    [];

                vm.selectedParamsOptions.facility =
                    [];

                filterDistrictOptions();

                watchDistrictSelection();
            }
        }


        /**
         * Existing Select2 handling for
         * normal single-select fields.
         */
        function reinitializeSelect(
            parameterName
        ) {

            
            if (
                parameterName === 'facility' &&
                hasFacilityMultiselect()
            ) {
                return;
            }

            $timeout(
                function() {

                    var element =
                        angular.element(
                            '#' +
                            parameterName
                        );

                    if (!element.length) {
                        return;
                    }

                    if (
                        element.data(
                            'select2'
                        )
                    ) {
                        element.select2(
                            'destroy'
                        );
                    }

                    element.select2({

                        allowClear: true,

                        selectOnClose: true,

                        placeholder:
                            getPlaceholder(
                                element
                            ),

                        language: {

                            noResults:
                                function() {

                                    return messageService.get(
                                        'openlmisForm.selectNoResults'
                                    );
                                }
                        }
                    });

                },
                0
            );
        }


        function getPlaceholder(
            element
        ) {

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