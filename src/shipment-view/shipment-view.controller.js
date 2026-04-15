(function() {

    'use strict';

    angular
        .module('shipment-view')
        .controller('ShipmentViewController', ShipmentViewController);

    ShipmentViewController.$inject = [
        'shipment', 'loadingModalService', '$state', '$window', 'fulfillmentUrlFactory',
        'messageService', 'accessTokenFactory', 'updatedOrder', 'QUANTITY_UNIT', 'tableLineItems',
        'VVM_STATUS'
    ];

    function ShipmentViewController(shipment, loadingModalService, $state, $window,
                                    fulfillmentUrlFactory, messageService, accessTokenFactory,
                                    updatedOrder, QUANTITY_UNIT, tableLineItems, VVM_STATUS) {

        var vm = this;

        vm.$onInit = onInit;
        vm.getVvmStatusLabel = VVM_STATUS.$getDisplayName;
        vm.printShipment = printShipment;
        vm.getOrderQuantityDisplay = getOrderQuantityDisplay;
        vm.getOrderQuantityHint = getOrderQuantityHint;
        vm.getAvailableSohDisplay = getAvailableSohDisplay;
        vm.getRemainingSohDisplay = getRemainingSohDisplay;
        vm.getFillQuantityDisplay = getFillQuantityDisplay;
        vm.getEditableQuantitySummary = getEditableQuantitySummary;
        vm.onQuantityTypeChanged = onQuantityTypeChanged;
        vm.onUnitQuantityChanged = onUnitQuantityChanged;
        vm.getQuantityTypeOptions = getQuantityTypeOptions;
        vm.getQuantityTypeLabel = getQuantityTypeLabel;

        function onInit() {
            vm.order = updatedOrder;
            vm.shipment = shipment;
            vm.tableLineItems = tableLineItems;
        }

        function getOrderQuantityDisplay(tableLineItem) {
            return tableLineItem.getOrderQuantity(false);
        }

        function getOrderQuantityHint(tableLineItem) {
            var quantityInUnits = tableLineItem.getOrderQuantityInUnits();

            if (!quantityInUnits || tableLineItem.netContent === 1) {
                return '';
            }

            return '(' + quantityInUnits + ' ' + messageService.get('shipmentView.units') + ')';
        }

        function getAvailableSohDisplay(tableLineItem) {
            return formatQuantity(getAvailableSohInUnits(tableLineItem), tableLineItem.netContent);
        }

        function getRemainingSohDisplay(tableLineItem) {
            return formatQuantity(getRemainingSohInUnits(tableLineItem), tableLineItem.netContent);
        }

        function getFillQuantityDisplay(tableLineItem) {
            if (!tableLineItem.shipmentLineItem) {
                return formatQuantity(getFillQuantityInUnits(tableLineItem), tableLineItem.netContent);
            }

            if (tableLineItem.shipmentLineItem.quantityType === 'DISPENSING_UNITS') {
                return (tableLineItem.shipmentLineItem.quantityShipped || 0) + ' ' +
                    messageService.get('shipmentView.units');
            }

            return (tableLineItem.shipmentLineItem.quantityShipped || 0) + ' ' +
                messageService.get('shipmentView.packs');
        }

        function getEditableQuantitySummary(lineItem) {
            var quantityInPacks;
            var quantityRemainderInUnits;
            var quantityShipped;

            if (!lineItem) {
                return '';
            }

            quantityShipped = lineItem.quantityShipped || 0;

            if (lineItem.quantityType === 'DISPENSING_UNITS') {
                quantityInPacks = lineItem.quantityInPacks || 0;
                quantityRemainderInUnits = lineItem.quantityRemainderInUnits || 0;

                return quantityInPacks + ' ' + messageService.get('shipmentView.packs') +
                    ' + ' + quantityRemainderInUnits + ' ' + messageService.get('shipmentView.units') +
                    ' = ' + quantityShipped + ' ' + messageService.get('shipmentView.units');
            }

            return quantityShipped + ' ' + messageService.get('shipmentView.packs');
        }

        function onQuantityTypeChanged(lineItem) {
            lineItem.setQuantityType(lineItem.quantityType);
        }

        function onUnitQuantityChanged(lineItem) {
            lineItem.updateQuantityShippedFromSplit();
        }

        function getQuantityTypeOptions() {
            return [
                QUANTITY_UNIT.PACKS,
                QUANTITY_UNIT.UNITS
            ];
        }

        function getQuantityTypeLabel(quantityType) {
            return quantityType === 'DISPENSING_UNITS' ?
                messageService.get('shipmentView.units') :
                messageService.get('shipmentView.packs');
        }

        function printShipment() {
            var popup = $window.open('', '_blank');
            popup.document.write(messageService.get('shipmentView.saveDraftPending'));

            return shipment.save()
                .then(function(response) {
                    popup.location.href = accessTokenFactory.addAccessToken(getPrintUrl(response.id));
                });
        }

        function getPrintUrl(shipmentId) {
            return fulfillmentUrlFactory(
                '/api/reports/templates/common/583ccc35-88b7-48a8-9193-6c4857d3ff60/pdf?shipmentDraftId=' + shipmentId
            );
        }

        function formatQuantity(quantityInUnits, netContent) {
            var packs;
            var remainder;

            packs = Math.floor(quantityInUnits / netContent);
            remainder = quantityInUnits % netContent;

            if (!remainder) {
                return packs + ' ' + messageService.get('shipmentView.packs');
            }

            return packs + ' + ' + remainder + ' ' + messageService.get('shipmentView.units');
        }

        function getAvailableSohInUnits(tableLineItem) {
            if (tableLineItem.shipmentLineItem) {
                return tableLineItem.getAvailableSohInUnits();
            }

            if (tableLineItem.lineItems) {
                return tableLineItem.lineItems.reduce(function(total, lineItem) {
                    return total + getAvailableSohInUnits(lineItem);
                }, 0);
            }

            return 0;
        }

        function getRemainingSohInUnits(tableLineItem) {
            if (tableLineItem.shipmentLineItem) {
                return tableLineItem.getRemainingSohInUnits();
            }

            if (tableLineItem.lineItems) {
                return tableLineItem.lineItems.reduce(function(total, lineItem) {
                    return total + getRemainingSohInUnits(lineItem);
                }, 0);
            }

            return 0;
        }

        function getFillQuantityInUnits(tableLineItem) {
            if (tableLineItem.shipmentLineItem) {
                return tableLineItem.shipmentLineItem.getQuantityShippedInUnits();
            }

            if (tableLineItem.lineItems) {
                return tableLineItem.lineItems.reduce(function(total, lineItem) {
                    return total + getFillQuantityInUnits(lineItem);
                }, 0);
            }

            return 0;
        }
    }
})();
