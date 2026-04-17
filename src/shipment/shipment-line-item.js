(function() {

    'use strict';

    angular
        .module('shipment')
        .factory('ShipmentLineItem', ShipmentLineItem);

    function ShipmentLineItem() {

        ShipmentLineItem.prototype.isInvalid = isInvalid;
        ShipmentLineItem.prototype.setQuantityType = setQuantityType;
        ShipmentLineItem.prototype.getQuantityShippedInUnits = getQuantityShippedInUnits;
        ShipmentLineItem.prototype.getRemainingSohInUnits = getRemainingSohInUnits;
        ShipmentLineItem.prototype.updateQuantityShippedFromSplit = updateQuantityShippedFromSplit;
        ShipmentLineItem.prototype.syncSplitFields = syncSplitFields;

        return ShipmentLineItem;

        function ShipmentLineItem(json) {
            this.id = json.id;
            this.orderable = json.orderable;
            this.lot = json.lot;
            this.quantityShipped = json.quantityShipped;
            this.quantityType = json.quantityType || 'PACKS';
            this.stockOnHand = getStockOnHandInUnits(json.canFulfillForMe);
            this.netContent = getNetContent(json);
            this.savedQuantities = {
                PACKS: this.quantityType === 'PACKS' ? (this.quantityShipped || 0) : undefined,
                DISPENSING_UNITS: this.quantityType === 'DISPENSING_UNITS' ? (this.quantityShipped || 0) : undefined
            };
            this.syncSplitFields();
        }

        function isInvalid() {
            var errors = {};

            if (!this.quantityShipped && this.quantityShipped !== 0) {
                errors.quantityShipped = 'shipment.required';
            }

            if (this.getQuantityShippedInUnits() > this.stockOnHand) {
                errors.quantityShipped = 'shipment.fillQuantityCannotExceedStockOnHand';
            }

            return angular.equals(errors, {}) ? undefined : errors;
        }

        function setQuantityType(quantityType) {
            var quantityInUnits = this.getQuantityShippedInUnits();
            var previousQuantityType = this.quantityType;

            this.quantityType = quantityType || 'PACKS';
            this.savedQuantities[previousQuantityType] = this.quantityShipped || 0;

            if (this.quantityType === 'DISPENSING_UNITS') {
                this.quantityShipped = getSavedQuantity(this.savedQuantities.DISPENSING_UNITS, quantityInUnits);
            } else {
                this.quantityShipped = getSavedQuantity(
                    this.savedQuantities.PACKS,
                    Math.floor(quantityInUnits / this.netContent)
                );
            }

            this.syncSplitFields();
        }

        function getQuantityShippedInUnits() {
            if (this.quantityType === 'DISPENSING_UNITS') {
                return this.quantityShipped || 0;
            }

            return (this.quantityShipped || 0) * this.netContent;
        }

        function getRemainingSohInUnits() {
            return Math.max(0, this.stockOnHand - this.getQuantityShippedInUnits());
        }

        function updateQuantityShippedFromSplit() {
            if (this.quantityType === 'DISPENSING_UNITS') {
                this.quantityShipped =
                    ((this.quantityInPacks || 0) * this.netContent) +
                    (this.quantityRemainderInUnits || 0);
                this.savedQuantities.DISPENSING_UNITS = this.quantityShipped;
                return;
            }

            this.quantityRemainderInUnits = 0;
            this.quantityShipped = this.quantityShipped || 0;
            this.savedQuantities.PACKS = this.quantityShipped;
        }

        function syncSplitFields() {
            var quantityInUnits;

            if (this.quantityType === 'DISPENSING_UNITS') {
                quantityInUnits = this.quantityShipped || 0;
                this.quantityInPacks = Math.floor(quantityInUnits / this.netContent);
                this.quantityRemainderInUnits = quantityInUnits % this.netContent;
                return;
            }

            this.quantityInPacks = this.quantityShipped || 0;
            this.quantityRemainderInUnits = 0;
        }

        function getStockOnHandInUnits(canFulfillForMe) {
            return canFulfillForMe ? canFulfillForMe.stockOnHand : 0;
        }

        function getNetContent(json) {
            if (json.canFulfillForMe && json.canFulfillForMe.orderable) {
                return json.canFulfillForMe.orderable.netContent || 1;
            }

            if (json.orderable) {
                return json.orderable.netContent || 1;
            }

            return 1;
        }

        function getSavedQuantity(savedQuantity, fallbackQuantity) {
            if (savedQuantity === undefined || savedQuantity === null) {
                return fallbackQuantity;
            }

            return savedQuantity;
        }
    }
})();
