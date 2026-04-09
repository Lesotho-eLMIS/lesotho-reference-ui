/*
 * This program is part of OpenLMIS logistics management information system platform software.
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
 * http://www.gnu.org/licenses/.  For additional information contact info@OpenLMIS.org. 
 */

(function() {

    'use strict';

    /**
     * @ngdoc service
     * @name lesotho-currency.lesothoCurrencyService
     *
     * @description
     * Service responsible for managing Lesotho Maloti (LSL) currency formatting and display.
     */
    angular
        .module('lesotho-currency')
        .provider('lesothoCurrencyService', lesothoCurrencyServiceProvider);

    function lesothoCurrencyServiceProvider() {
        
        var currency = {
            code: 'LSL',
            symbol: 'LSL',
            name: 'Maloti',
            precision: 2,
            pattern: '%s %v' // Symbol first, then value
        };

        this.$get = ['$filter', 'messageService'];

        function serviceFactory($filter, messageService) {
            
            return {
                /**
                 * @ngdoc method
                 * @methodOf lesotho-currency.lesothoCurrencyService
                 * @name format
                 *
                 * @description
                 * Formats a number as Lesotho Maloti currency.
                 *
                 * @param {Number} amount the amount to format
                 * @param {Number} precision the number of decimal places to use
                 * @return {String} the formatted currency string
                 */
                format: function(amount, precision) {
                    if (isNaN(amount)) {
                        amount = 0;
                    }
                    
                    var decimals = precision !== undefined ? precision : currency.precision;
                    var formattedAmount = $filter('number')(amount, decimals);
                    
                    return currency.pattern
                        .replace('%s', currency.symbol)
                        .replace('%v', formattedAmount);
                },

                /**
                 * @ngdoc method
                 * @methodOf lesotho-currency.lesothoCurrencyService
                 * @name getCurrencyInfo
                 *
                 * @description
                 * Returns the currency information object.
                 *
                 * @return {Object} the currency information object
                 */
                getCurrencyInfo: function() {
                    return angular.copy(currency);
                },

                /**
                 * @ngdoc method
                 * @methodOf lesotho-currency.lesothoCurrencyService
                 * @name getCurrencySymbol
                 *
                 * @description
                 * Returns the currency symbol.
                 *
                 * @return {String} the currency symbol
                 */
                getCurrencySymbol: function() {
                    return currency.symbol;
                },

                /**
                 * @ngdoc method
                 * @methodOf lesotho-currency.lesothoCurrencyService
                 * @name getCurrencyName
                 *
                 * @description
                 * Returns the currency name.
                 *
                 * @return {String} the currency name
                 */
                getCurrencyName: function() {
                    return currency.name;
                },

                /**
                 * @ngdoc method
                 * @methodOf lesotho-currency.lesothoCurrencyService
                 * @name parseAmount
                 *
                 * @description
                 * Parses a formatted currency string back to a number.
                 *
                 * @param {String} formattedAmount the formatted currency string
                 * @return {Number} the parsed amount
                 */
                parseAmount: function(formattedAmount) {
                    if (!formattedAmount) {
                        return 0;
                    }
                    
                    // Remove currency symbol and convert to number
                    var numericString = formattedAmount.replace(new RegExp('\\' + currency.symbol + '\\s*', 'g'), '');
                    return parseFloat(numericString.replace(/,/g, '')) || 0;
                }
            };
        }
    }

})();
