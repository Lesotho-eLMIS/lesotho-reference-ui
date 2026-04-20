(function() {

    'use strict';

    angular
        .module('shipment-view')
        .controller('ShipmentQuantityTypeToggleController', ShipmentQuantityTypeToggleController);

    ShipmentQuantityTypeToggleController.$inject = [
        'messageService', 'SHIPMENT_QUANTITY_TYPE', 'localStorageService'
    ];

    var QUANTITY_UNIT_KEY = 'shipmentFillQuantityUnit';

    function ShipmentQuantityTypeToggleController(messageService, SHIPMENT_QUANTITY_TYPE, localStorageService) {

        var vm = this;

        vm.$onInit = onInit;
        vm.getMessage = getMessage;
        vm.onChange = onChange;

        function onInit() {
            vm.quantityUnits = [
                SHIPMENT_QUANTITY_TYPE.PACKS,
                SHIPMENT_QUANTITY_TYPE.UNITS
            ];

            vm.quantityUnit = getCachedQuantityUnit(
                localStorageService.get(QUANTITY_UNIT_KEY),
                SHIPMENT_QUANTITY_TYPE
            );
        }

        function getMessage(unit) {
            return messageService.get(SHIPMENT_QUANTITY_TYPE.$getDisplayName(unit));
        }

        function onChange() {
            localStorageService.add(QUANTITY_UNIT_KEY, vm.quantityUnit);
        }
    }

    function getCachedQuantityUnit(cachedQuantityUnit, SHIPMENT_QUANTITY_TYPE) {
        if (cachedQuantityUnit === SHIPMENT_QUANTITY_TYPE.PACKS ||
            cachedQuantityUnit === SHIPMENT_QUANTITY_TYPE.UNITS) {
            return cachedQuantityUnit;
        }

        return SHIPMENT_QUANTITY_TYPE.PACKS;
    }
})();
