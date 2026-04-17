(function() {

    'use strict';

    angular
        .module('shipment-view')
        .factory('ShipmentViewLineItem', ShipmentViewLineItem);

    function ShipmentViewLineItem() {

        ShipmentViewLineItem.prototype.getAvailableSoh = getAvailableSoh;
        ShipmentViewLineItem.prototype.getAvailableSohInUnits = getAvailableSohInUnits;
        ShipmentViewLineItem.prototype.getFillQuantity = getFillQuantity;
        ShipmentViewLineItem.prototype.getFillQuantityInUnits = getFillQuantityInUnits;
        ShipmentViewLineItem.prototype.getRemainingSoh = getRemainingSoh;
        ShipmentViewLineItem.prototype.getRemainingSohInUnits = getRemainingSohInUnits;
        ShipmentViewLineItem.prototype.getOrderQuantity = getOrderQuantity;
        ShipmentViewLineItem.prototype.getOrderQuantityInUnits = getOrderQuantityInUnits;
        ShipmentViewLineItem.prototype.recalculateQuantity = recalculateQuantity;

        return ShipmentViewLineItem;

        function ShipmentViewLineItem(config) {
            this.productCode = config.productCode;
            this.productName = config.productName;
            this.lot = config.lot;
            this.vvmStatus = config.vvmStatus;
            this.shipmentLineItem = config.shipmentLineItem;
            this.netContent = config.netContent || 1;
            this.isLot = true;
            this.orderQuantity = config.orderQuantity;
        }

        function getAvailableSoh(inUnits) {
            return formatQuantity(this.getAvailableSohInUnits(), this.netContent, inUnits);
        }

        function getAvailableSohInUnits() {
            return this.shipmentLineItem ? this.shipmentLineItem.stockOnHand : 0;
        }

        function getFillQuantity(inUnits) {
            if (!this.shipmentLineItem) {
                return 0;
            }

            if (inUnits === undefined) {
                return this.shipmentLineItem.quantityShipped || 0;
            }

            return inUnits ?
                this.shipmentLineItem.getQuantityShippedInUnits() :
                (this.shipmentLineItem.quantityType === 'DISPENSING_UNITS' ?
                    Math.floor(this.shipmentLineItem.getQuantityShippedInUnits() / this.netContent) :
                    (this.shipmentLineItem.quantityShipped || 0));
        }

        function getFillQuantityInUnits() {
            if (!this.shipmentLineItem) {
                return 0;
            }

            return this.shipmentLineItem.getQuantityShippedInUnits();
        }

        function getRemainingSoh(inUnits) {
            return formatQuantity(this.getRemainingSohInUnits(), this.netContent, inUnits);
        }

        function getRemainingSohInUnits() {
            if (!this.shipmentLineItem) {
                return this.getAvailableSohInUnits();
            }

            return this.shipmentLineItem.getRemainingSohInUnits();
        }

        function getOrderQuantity(inUnits) {
            if (this.orderQuantity === undefined || this.orderQuantity === null) {
                return;
            }

            if (!inUnits) {
                return this.orderQuantity;
            }

            return this.getOrderQuantityInUnits();
        }

        function getOrderQuantityInUnits() {
            if (this.orderQuantity === undefined || this.orderQuantity === null) {
                return;
            }

            return this.orderQuantity * this.netContent;
        }

        function recalculateQuantity(quantity, inUnits) {
            if (inUnits) {
                return quantity * this.netContent;
            }

            return quantity;
        }

        function formatQuantity(quantityInUnits, netContent, inUnits) {
            if (inUnits === undefined) {
                return quantityInUnits;
            }

            if (inUnits) {
                return quantityInUnits;
            }

            return Math.floor(quantityInUnits / netContent);
        }
    }
})();
