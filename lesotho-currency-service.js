/**
 * Lesotho Currency Service
 * Provides currency formatting and utilities for Lesotho Maloti (LSL)
 */

angular.module('lesotho-currency-service', [])
    .service('lesothoCurrencyService', function() {
        
        this.getCurrencySymbol = function() {
            return 'LSL';
        };
        
        this.getCurrencyName = function() {
            return 'Maloti';
        };
        
        this.getCurrencyCode = function() {
            return 'LSL';
        };
        
        this.format = function(amount, showSymbol) {
            if (showSymbol === false) {
                return amount.toLocaleString();
            }
            return 'LSL ' + amount.toLocaleString();
        };
        
        this.formatCurrency = function(amount, symbol, fractionSize) {
            if (symbol === undefined || symbol === true) {
                symbol = 'LSL';
            }
            
            var formattedAmount = amount.toLocaleString(undefined, {
                minimumFractionDigits: fractionSize || 2,
                maximumFractionDigits: fractionSize || 2
            });
            
            return symbol ? symbol + ' ' + formattedAmount : formattedAmount;
        };
    })
    
    .filter('lesothoCurrency', function() {
        return function(amount, showSymbol) {
            if (showSymbol === false) {
                return amount.toLocaleString();
            }
            return 'LSL ' + amount.toLocaleString();
        };
    })
    
    .filter('lslCurrency', function() {
        return function(amount, symbol, fractionSize) {
            var formattedAmount = amount.toLocaleString(undefined, {
                minimumFractionDigits: fractionSize || 2,
                maximumFractionDigits: fractionSize || 2
            });
            
            return (symbol || 'LSL') + ' ' + formattedAmount;
        };
    });
