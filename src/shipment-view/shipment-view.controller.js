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
        vm.getQuantityTypeOptions = getQuantityTypeOptions;
        vm.getQuantityTypeLabel = getQuantityTypeLabel;

        function onInit() {
            vm.order = updatedOrder;
            vm.shipment = shipment;
            vm.tableLineItems = tableLineItems;

            // Seed the previous type tracker so the first type-switch converts correctly,
            // and seed the hidden remainder tracker used to preserve units dropped when
            // rounding down to whole Packs.
            vm.tableLineItems.forEach(function(tli) {
                if (tli.shipmentLineItem) {
                    tli.shipmentLineItem._previousQuantityType =
                        tli.shipmentLineItem.quantityType || 'PACKS';
                    tli.shipmentLineItem._packRemainderUnits =
                        tli.shipmentLineItem._packRemainderUnits || 0;
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

            // Route through getFillQuantityInUnits so any hidden remainder units (carried
            // over from a previous Units -> Packs switch) are reflected in the read-only
            // display instead of being silently rounded away.
            return formatQuantity(getFillQuantityInUnits(tableLineItem), tableLineItem.netContent);
        }

        // Computes the "calculated total" summary shown under the editable quantity field.
        // In PACKS mode this echoes the pack count plus any hidden remainder units that were
        // carried over from a previous Units -> Packs switch, so the true fulfilled total is
        // always visible even though the Packs input itself only accepts whole packs. In
        // DISPENSING_UNITS mode the single units input is broken down into a whole-packs +
        // remainder-units summary, using the netContent that lives on the table row (the
        // domain shipmentLineItem doesn't carry it).
        function getEditableQuantitySummary(tableLineItem) {
            var lineItem = tableLineItem.shipmentLineItem;
            var quantityShipped;
            var netContent;
            var packs;
            var remainder;

            if (!lineItem) {
                return '';
            }

            quantityShipped = lineItem.quantityShipped || 0;

            if (lineItem.quantityType === 'DISPENSING_UNITS') {
                netContent = tableLineItem.netContent || 1;
                packs = Math.floor(quantityShipped / netContent);
                remainder = quantityShipped % netContent;

                if (!remainder) {
                    return packs + ' ' + messageService.get('shipmentView.packs');
                }

                return packs + ' ' + messageService.get('shipmentView.packs') +
                    ' + ' + remainder + ' ' + messageService.get('shipmentView.units');
            }

            remainder = lineItem._packRemainderUnits || 0;

            if (!remainder) {
                return quantityShipped + ' ' + messageService.get('shipmentView.packs');
            }

            return quantityShipped + ' ' + messageService.get('shipmentView.packs') +
                ' + ' + remainder + ' ' + messageService.get('shipmentView.units');
        }

        // setQuantityType() only switches the type/state on the domain object — it does not
        // carry the numeric value across (mirroring the original implementation, which always
        // called setQuantityType() first and only afterward assigned the converted quantity).
        // So the controller is responsible for converting quantityShipped to the new type's
        // units, using the _previousQuantityType tracker (not lineItem.quantityType, which
        // ng-model has already overwritten with the new value by the time ng-change fires).
        //
        // Whole Packs can't represent a fractional remainder, so when switching Units -> Packs
        // any leftover units are stashed on _packRemainderUnits (a transient, client-side-only
        // property) instead of being discarded. When switching back Packs -> Units, that
        // remainder is folded back in so the total fulfilled quantity survives the round trip.
        function onQuantityTypeChanged(tableLineItem) {
            var lineItem = tableLineItem.shipmentLineItem;
            var netContent = tableLineItem.netContent || 1;
            var previousType = lineItem._previousQuantityType || 'PACKS';
            var newType = lineItem.quantityType;
            var currentQuantityInUnits;

            // Convert whatever was entered under the previous type into a canonical unit count,
            // folding back in any remainder units that were hidden while in PACKS mode.
            if (previousType === 'PACKS') {
                currentQuantityInUnits = (lineItem.quantityShipped || 0) * netContent +
                    (lineItem._packRemainderUnits || 0);
            } else {
                currentQuantityInUnits = lineItem.quantityShipped || 0;
            }

            lineItem.setQuantityType(newType);
            lineItem._previousQuantityType = newType;

            if (newType === 'PACKS') {
                // Whole packs only in the visible field; keep the leftover units hidden
                // behind the scenes instead of dropping them.
                lineItem.quantityShipped = Math.floor(currentQuantityInUnits / netContent);
                lineItem._packRemainderUnits = currentQuantityInUnits % netContent;
            } else {
                lineItem.quantityShipped = currentQuantityInUnits;
                lineItem._packRemainderUnits = 0;
            }
        }

        // Superseded by the single-field Units input (quantityShipped is now edited
        // directly, so there's no split packs/units state left to normalize).
        // Kept here for reference in case the split-field UX needs to be restored.
        //
        // function onUnitQuantityChanged(lineItem) {
        //     var netContent = getNetContentForLineItem(lineItem);
        //     var rawUnits = lineItem.quantityRemainderInUnits || 0;
        //
        //     // Auto-normalise: if the user typed more units than fit in a pack, carry the
        //     // overflow into the packs field and leave only the true remainder in units.
        //     if (rawUnits >= netContent) {
        //         lineItem.quantityInPacks =
        //             (lineItem.quantityInPacks || 0) + Math.floor(rawUnits / netContent);
        //         lineItem.quantityRemainderInUnits = rawUnits % netContent;
        //     }
        //
        //     lineItem.updateQuantityShippedFromSplit();
        // }

        // Superseded by tableLineItem.netContent being read directly inside
        // getEditableQuantitySummary(). Kept here for reference.
        //
        // function getNetContentForLineItem(shipmentLineItem) {
        //     var owningTableLineItem = vm.tableLineItems.find(function(tli) {
        //         return tli.shipmentLineItem === shipmentLineItem;
        //     });
        //     return owningTableLineItem ? (owningTableLineItem.netContent || 1) : 1;
        // }

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

        // Derived from Available SOH minus the true fill quantity (rather than delegating to
        // the domain object's own getRemainingSohInUnits()), because the domain object has no
        // visibility into units hidden in _packRemainderUnits while in PACKS mode. Routing
        // through getFillQuantityInUnits() keeps this accurate regardless of which quantity
        // type is currently selected.
        function getRemainingSohInUnits(tableLineItem) {
            return getAvailableSohInUnits(tableLineItem) - getFillQuantityInUnits(tableLineItem);
        }

        function getFillQuantityInUnits(tableLineItem) {
            if (tableLineItem.shipmentLineItem) {
                return tableLineItem.shipmentLineItem.getQuantityShippedInUnits() +
                    (tableLineItem.shipmentLineItem._packRemainderUnits || 0);
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