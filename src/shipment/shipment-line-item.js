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
        ShipmentLineItem.prototype.updateQuantityShipped = updateQuantityShipped;

        return ShipmentLineItem;

        function ShipmentLineItem(json) {
            this.id = json.id;
            this.orderable = json.orderable;
            this.lot = json.lot;
            this.quantityShipped = json.quantityShipped;
            this.quantityType = json.quantityType || 'PACKS';
            this.stockOnHand = getStockOnHandInUnits(json.canFulfillForMe);
            this.netContent = getNetContent(json);

            // Canonical value: total quantity in dispensing units. quantityShipped is
            // only ever a *view* of this in the currently selected quantityType.
            // Switching quantityType never mutates this value, only how it's
            // displayed/edited - so nothing is lost when toggling back and forth.
            this.totalQuantityInUnits = this.quantityType === 'DISPENSING_UNITS' ?
                (this.quantityShipped || 0) :
                (this.quantityShipped || 0) * this.netContent;
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
            this.quantityType = quantityType || 'PACKS';

            if (this.quantityType === 'DISPENSING_UNITS') {
                this.quantityShipped = this.totalQuantityInUnits || 0;
            } else {
                this.quantityShipped = Math.floor((this.totalQuantityInUnits || 0) / this.netContent);
            }
        }

        function getQuantityShippedInUnits() {
            return this.totalQuantityInUnits || 0;
        }

        function getRemainingSohInUnits() {
            return Math.max(0, this.stockOnHand - this.getQuantityShippedInUnits());
        }

        function updateQuantityShipped() {
            if (this.quantityType === 'DISPENSING_UNITS') {
                this.totalQuantityInUnits = this.quantityShipped || 0;
            } else {
                this.totalQuantityInUnits = (this.quantityShipped || 0) * this.netContent;
            }
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
    }
})();
