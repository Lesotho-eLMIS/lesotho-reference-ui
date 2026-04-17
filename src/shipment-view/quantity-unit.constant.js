(function() {

    'use strict';

    angular
        .module('shipment-view')
        .constant('QUANTITY_UNIT', units());

    function units() {
        var values = {
            PACKS: 'PACKS',
            UNITS: 'UNITS',
            $getDisplayName: getDisplayName
        };
        var displayNames = {
            PACKS: 'shipmentView.packs',
            UNITS: 'shipmentView.units'
        };

        return values;

        function getDisplayName(name) {
            return displayNames[name];
        }
    }
})();
