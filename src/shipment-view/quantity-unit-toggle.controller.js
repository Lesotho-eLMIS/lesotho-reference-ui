(function() {

    'use strict';

    angular
        .module('shipment-view')
        .controller('QuantityUnitToggleController', QuantityUnitToggleController);

    QuantityUnitToggleController.$inject = [
        'messageService', 'QUANTITY_UNIT', 'localStorageService'
    ];

    var QUANTITY_UNIT_KEY = 'shipmentFillQuantityUnit';

    function QuantityUnitToggleController(messageService, QUANTITY_UNIT, localStorageService) {

        var vm = this;

        vm.$onInit = onInit;
        vm.getMessage = getMessage;
        vm.onChange = onChange;

        function onInit() {
            vm.quantityUnits = [
                QUANTITY_UNIT.PACKS,
                QUANTITY_UNIT.UNITS
            ];

            vm.quantityUnit = getCachedQuantityUnit(localStorageService.get(QUANTITY_UNIT_KEY), QUANTITY_UNIT);
        }

        function getMessage(unit) {
            return messageService.get(QUANTITY_UNIT.$getDisplayName(unit));
        }

        function onChange() {
            localStorageService.add(QUANTITY_UNIT_KEY, vm.quantityUnit);
        }
    }

    function getCachedQuantityUnit(cachedQuantityUnit, QUANTITY_UNIT) {
        if (cachedQuantityUnit === QUANTITY_UNIT.PACKS || cachedQuantityUnit === QUANTITY_UNIT.UNITS) {
            return cachedQuantityUnit;
        }

        return QUANTITY_UNIT.PACKS;
    }
})();
