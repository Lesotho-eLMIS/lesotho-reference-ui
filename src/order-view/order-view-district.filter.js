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
 * http://www.gnu.org/licenses.  For additional information contact info@OpenLMIS.org.
 */

(function() {

    'use strict';

    /**
     * @ngdoc filter
     * @name order-view.filter:district
     *
     * @description
     * Returns the name of the district level geographic zone for the given facility.
     * Facility geographic zones are assigned at the lowest applicable level, so a health
     * facility resolves to its own level 4 zone rather than its district. This filter
     * walks up the zone hierarchy until it reaches the zone whose level code is
     * 'district', which also covers community level facilities and returns immediately
     * for facilities attached directly to a district zone, such as DHMT and district
     * stores.
     *
     * @param   {Object} facility  the facility to get the district name for
     * @return  {String}           the district name, or the facility zone name if no
     *                             district level zone is present in the hierarchy
     */
    angular
        .module('order-view')
        .filter('district', district);

    function district() {
        var DISTRICT_LEVEL_CODE = 'district';

        return function(facility) {
            var zone = facility ? facility.geographicZone : undefined;

            while (zone) {
                if (zone.level && zone.level.code === DISTRICT_LEVEL_CODE) {
                    return zone.name;
                }
                zone = zone.parent;
            }

            return facility && facility.geographicZone ? facility.geographicZone.name : '';
        };
    }

})();
