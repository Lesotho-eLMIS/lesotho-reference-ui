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
            console.log('[DIAGNOSTIC] shipment-view onInit - order loaded for fulfillment:', vm.order);
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