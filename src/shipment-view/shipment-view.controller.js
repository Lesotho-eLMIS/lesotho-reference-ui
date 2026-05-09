(function() {

    'use strict';

    angular
        .module('shipment-view')
        .controller('ShipmentViewController', ShipmentViewController);

    ShipmentViewController.$inject = [
        'shipment', 'loadingModalService', '$state', '$window', 'fulfillmentUrlFactory',
        'messageService', 'accessTokenFactory', 'updatedOrder', 'SHIPMENT_QUANTITY_TYPE', 'tableLineItems',
        'VVM_STATUS'
    ];

    function ShipmentViewController(shipment, loadingModalService, $state, $window,
                                    fulfillmentUrlFactory, messageService, accessTokenFactory,
                                    updatedOrder, SHIPMENT_QUANTITY_TYPE, tableLineItems, VVM_STATUS) {

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

            // Seed the previous type tracker so the first type-switch converts correctly
            vm.tableLineItems.forEach(function(tli) {
                if (tli.shipmentLineItem) {
                    tli.shipmentLineItem._previousQuantityType =
                        tli.shipmentLineItem.quantityType || 'PACKS';
                }
            });
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
            var netContent = getNetContentForLineItem(lineItem);
            var previousType = lineItem._previousQuantityType || 'PACKS';
            var currentQuantityInUnits;

            // Convert whatever was entered previously into a canonical unit count
            if (previousType === 'PACKS') {
                currentQuantityInUnits = (lineItem.quantityShipped || 0) * netContent;
            } else {
                // Was DISPENSING_UNITS — reconstruct from the split packs+units fields
                currentQuantityInUnits =
                    ((lineItem.quantityInPacks || 0) * netContent) +
                    (lineItem.quantityRemainderInUnits || 0);
            }

            // Apply the new quantity type on the domain object
            lineItem.setQuantityType(lineItem.quantityType);
            lineItem._previousQuantityType = lineItem.quantityType;

            if (lineItem.quantityType === 'PACKS') {
                // Convert units → packs (whole packs only; remainder is intentionally dropped
                // because the PACKS field only accepts whole packs)
                lineItem.quantityShipped = Math.floor(currentQuantityInUnits / netContent);
                lineItem.quantityInPacks = undefined;
                lineItem.quantityRemainderInUnits = undefined;
            } else {
                // Convert packs → DISPENSING_UNITS: split into whole packs + leftover units
                lineItem.quantityInPacks = Math.floor(currentQuantityInUnits / netContent);
                lineItem.quantityRemainderInUnits = currentQuantityInUnits % netContent;
                lineItem.updateQuantityShippedFromSplit();
            }
        }

        function onUnitQuantityChanged(lineItem) {
            var netContent = getNetContentForLineItem(lineItem);
            var rawUnits = lineItem.quantityRemainderInUnits || 0;

            // Auto-normalise: if the user typed more units than fit in a pack, carry the
            // overflow into the packs field and leave only the true remainder in units.
            if (rawUnits >= netContent) {
                lineItem.quantityInPacks =
                    (lineItem.quantityInPacks || 0) + Math.floor(rawUnits / netContent);
                lineItem.quantityRemainderInUnits = rawUnits % netContent;
            }

            lineItem.updateQuantityShippedFromSplit();
        }

        // Private helper: find the netContent for a given shipmentLineItem by walking the
        // tableLineItems array (netContent lives on the view line item, not the domain object).
        function getNetContentForLineItem(shipmentLineItem) {
            var owningTableLineItem = vm.tableLineItems.find(function(tli) {
                return tli.shipmentLineItem === shipmentLineItem;
            });
            return owningTableLineItem ? (owningTableLineItem.netContent || 1) : 1;
        }

        function getQuantityTypeOptions() {
            return [
                SHIPMENT_QUANTITY_TYPE.PACKS,
                SHIPMENT_QUANTITY_TYPE.UNITS
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