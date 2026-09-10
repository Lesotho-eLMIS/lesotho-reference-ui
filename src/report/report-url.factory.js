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
        .factory(
            'reportUrlFactory',
            reportUrlFactory
        );

    reportUrlFactory.$inject = [
        'openlmisUrlFactory',
        'pathFactory'
    ];

    function reportUrlFactory(
        openlmisUrlFactory,
        pathFactory
    ) {

        var reportUrl =
                '/api/reports/templates',

            factory = {
                buildUrl: buildUrl
            };

        return factory;


        function buildUrl(
            url,
            report,
            selectedValues,
            format
        ) {

            url = pathFactory(
                reportUrl,
                url,
                report.id,
                format
            );

            var requestParameters = [];

            angular.forEach(
                report.templateParameters,
                function(parameter) {

                    var value =
                        selectedValues[
                            parameter.name
                        ];

                    /*
                     * Multiselect:
                     *
                     * [
                     *   Facility A,
                     *   Facility B
                     * ]
                     *
                     * becomes:
                     *
                     * Facility A|Facility B
                     */
                    if (
                        angular.isArray(
                            value
                        )
                    ) {

                        value =
                            value.join('|');
                    }

                    if (
                        angular.isUndefined(value) ||
                        value === null
                    ) {

                        value = '';
                    }

                    requestParameters.push(
                        encodeURIComponent(
                            parameter.name
                        ) +
                        '=' +
                        encodeURIComponent(
                            value
                        )
                    );
                }
            );

            return openlmisUrlFactory(
                url +
                '?' +
                requestParameters.join('&')
            );
        }
    }

})();