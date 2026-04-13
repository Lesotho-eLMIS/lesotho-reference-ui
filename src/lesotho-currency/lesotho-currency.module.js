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
     * @ngdoc module
     * @name lesotho-currency
     *
     * @description
     * Module responsible for Lesotho Maloti (LSL) currency formatting and display.
     * Provides service and filter for consistent currency representation throughout the UI.
     */
    angular
        .module('lesotho-currency', [])
        .service('lesothoCurrencyService', lesothoCurrencyService);

    lesothoCurrencyService.$inject = ['$filter', 'messageService'];

    function lesothoCurrencyService($filter, messageService) {
        
        var currency = {
            code: 'LSL',
            symbol: 'LSL',
            name: 'Maloti',
            precision: 2,
            pattern: '%s %v' // Symbol first, then value
        };

        /**
         * @ngdoc method
         * @methodOf lesotho-currency.lesothoCurrencyService
         * @name format
         *
         * @description
         * Formats a number as Lesotho Maloti currency.
         *
         * @param {Number} amount the amount to format
         * @param {Number} precision the number of decimal places (optional)
         * @return {String} the formatted currency string
         */
        this.format = function(amount, precision) {
            if (isNaN(amount)) {
                amount = 0;
            }
            
            var decimals = precision !== undefined ? precision : currency.precision;
            var formattedAmount = $filter('number')(amount, decimals);
            
            return currency.pattern
                .replace('%s', currency.symbol)
                .replace('%v', formattedAmount);
        };

        /**
         * @ngdoc method
         * @methodOf lesotho-currency.lesothoCurrencyService
         * @name getCurrencyInfo
         *
         * @description
         * Returns currency information object.
         *
         * @return {Object} currency information
         */
        this.getCurrencyInfo = function() {
            return angular.copy(currency);
        };

        /**
         * @ngdoc method
         * @methodOf lesotho-currency.lesothoCurrencyService
         * @name getCurrencySymbol
         *
         * @description
         * Returns the currency symbol.
         *
         * @return {String} currency symbol
         */
        this.getCurrencySymbol = function() {
            return currency.symbol;
        };

        /**
         * @ngdoc method
         * @methodOf lesotho-currency.lesothoCurrencyService
         * @name getCurrencyName
         *
         * @description
         * Returns the currency name.
         *
         * @return {String} currency name
         */
        this.getCurrencyName = function() {
            return currency.name;
        };

        /**
         * @ngdoc method
         * @methodOf lesotho-currency.lesothoCurrencyService
         * @name parseAmount
         *
         * @description
         * Parses a formatted currency string back to number.
         *
         * @param {String} formattedAmount the formatted currency string
         * @return {Number} the parsed amount
         */
        this.parseAmount = function(formattedAmount) {
            if (!formattedAmount) {
                return 0;
            }
            
            // Remove currency symbol and convert to number
            var numericString = formattedAmount.replace(new RegExp('\\' + currency.symbol + '\\s*', 'g'), '');
            return parseFloat(numericString.replace(/,/g, '')) || 0;
        };
    }

    angular
        .module('lesotho-currency')
        .filter('lesothoCurrency', lesothoCurrencyFilter);

    lesothoCurrencyFilter.$inject = ['lesothoCurrencyService'];

    function lesothoCurrencyFilter(lesothoCurrencyService) {
        
        return function(amount, precision) {
            return lesothoCurrencyService.format(amount, precision);
        };
    }

})();
