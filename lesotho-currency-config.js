/**
 * Lesotho Currency Configuration
 * Overrides Angular default currency to LSL (Maloti)
 * 
 * This module configures the OpenLMIS system to use Lesotho Maloti (LSL)
 * instead of the default US Dollar ($) for all currency displays.
 */

(function() {
    'use strict';
    
    // Configuration for Lesotho Maloti
    var lesothoCurrencyConfig = {
        CURRENCY_SYM: 'LSL',
        CURRENCY_NAME: 'Maloti',
        CURRENCY_CODE: 'LSL',
        LOCALE_ID: 'en-ls'
    };
    
    // Override Angular's locale configuration
    if (typeof angular !== 'undefined') {
        angular.module('lesotho-currency-config', [])
            .config(['$provide', function($provide) {
                // Decorate the $locale service to override currency symbol
                $provide.decorator('$locale', ['$delegate', function($delegate) {
                    if ($delegate && $delegate.NUMBER_FORMATS) {
                        $delegate.NUMBER_FORMATS.CURRENCY_SYM = lesothoCurrencyConfig.CURRENCY_SYM;
                    }
                    return $delegate;
                }]);
            }])
            .run(['$rootScope', '$locale', function($rootScope, $locale) {
                // Make currency config available globally
                $rootScope.currencyConfig = lesothoCurrencyConfig;
                
                // Ensure currency symbol is set
                if ($locale && $locale.NUMBER_FORMATS) {
                    $locale.NUMBER_FORMATS.CURRENCY_SYM = lesothoCurrencyConfig.CURRENCY_SYM;
                }
                
                console.log('Lesotho Currency Config Applied:', lesothoCurrencyConfig);
            }]);
    }
    
    // Export configuration for global access
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = lesothoCurrencyConfig;
    }
    
    // Make available globally for immediate use
    if (typeof window !== 'undefined') {
        window.lesothoCurrencyConfig = lesothoCurrencyConfig;
    }
})();
