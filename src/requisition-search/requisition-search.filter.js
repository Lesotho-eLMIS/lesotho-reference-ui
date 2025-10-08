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

    /**
     * @ngdoc filter
     * @name requisition-search.filter:requisitionSearch
     *
     * @description
     * Filters requisitions by given params.
     *
     * @param  {Array}  input  the list of requisitions to be filtered
     * @param  {Object} params the list of optional parameters and their desired values
     * {
     *      program: 'programID',
     *      facility: 'facilityID',
     *      initiatedDateFrom: 'startDate',
     *      initiatedDateTo: 'endDate',
     *      requisitionStatus: ['status1', 'status2'],
     *      emergency: false
     * }
     * @return {Array}         filtered requisitions
     *
     * @example
     * This filter is mainly used in JS code rather than in HTML markup.
     * ```
     * var filteredRequisition = $filter('requisitionSearch')(requisition, params);
     * ```
     */
    angular
        .module('requisition-search')
        .filter('requisitionSearch', filter);

    filter.$inject = ['dateUtils'];

    function filter(dateUtils) {
        return function(requisitions, params) {
            if (!angular.isObject(requisitions)) {
                return requisitions;
            }

            return requisitions
                .filter(byProgram(params.program))
                .filter(byFacility(params.facility))
                .filter(byInitiatedDateFrom(params.initiatedDateFrom))
                .filter(byInitiatedDateTo(params.initiatedDateTo))
                .filter(byEmergency(params.emergency))
                .filter(byStatus(params.status));
        };

        function byProgram(program) {
            return function(requisition) {
                return !program || program === requisition.program.id;
            };
        }

        function byFacility(facility) {
            return function(requisition) {
                return !facility || facility === requisition.facility.id;
            };
        }

        function byInitiatedDateFrom(initiatedDateFrom) {
            return function(requisition) {
                var createdDate = dateUtils.toDate(requisition.createdDate);
                return !initiatedDateFrom || new Date(initiatedDateFrom) <= new Date(createdDate);
            };
        }

        function byInitiatedDateTo(initiatedDateTo) {
            return function(requisition) {
                var createdDate = dateUtils.toDate(requisition.createdDate);
                return !initiatedDateTo || new Date(initiatedDateTo) >= new Date(createdDate);
            };
        }

        function byEmergency(emergency) {
            return function(requisition) {
                return emergency === undefined || emergency === null || emergency === requisition.emergency;
            };
        }

        function byStatus(status) {
            return function(requisition) {
                return !status || matchStatus(requisition.status, status);
            };
        }

        function matchStatus(requisitionStatus, statuses) {
            var match = false;
            angular.forEach(statuses, function(status) {
                if (requisitionStatus === status) {
                    match = true;
                }
            });
            return match;
        }

    }

})();
