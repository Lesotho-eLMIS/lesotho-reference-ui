(function() {

    'use strict';

    angular
        .module('proof-of-delivery')
        .factory('ProofOfDeliveryLineItem', ProofOfDeliveryLineItem);

    function ProofOfDeliveryLineItem() {

        ProofOfDeliveryLineItem.prototype.validate = validate;
        ProofOfDeliveryLineItem.prototype.updateQuantityRejected = updateQuantityRejected;

        return ProofOfDeliveryLineItem;

        function ProofOfDeliveryLineItem(json) {
            angular.copy(json, this);
            this.quantityType = this.quantityType || 'PACKS';
            this.updateQuantityRejected();
        }

        function updateQuantityRejected() {
            if (!this.quantityAccepted && this.quantityAccepted !== 0) {
                this.quantityRejected = 0;
            } else {
                var quantityRejected = this.quantityShipped - this.quantityAccepted;

                if (quantityRejected < 0) {
                    this.quantityRejected = 0;
                } else if (quantityRejected > this.quantityShipped) {
                    this.quantityRejected = this.quantityShipped;
                } else {
                    this.quantityRejected = quantityRejected;
                }
            }
        }

        function validate() {
            var errors = {};

            validateQuantityAccepted(this, errors);
            validateRejectionReasonId(this, errors);
            validateVvmStatus(this, errors);

            return angular.equals(errors, {}) ? undefined : errors;
        }

        function validateQuantityAccepted(lineItem, errors) {
            if (lineItem.quantityAccepted === undefined || lineItem.quantityAccepted === null) {
                errors.quantityAccepted = 'proofOfDelivery.required';
            }

            if (lineItem.quantityAccepted < 0) {
                errors.quantityAccepted = 'proofOfDelivery.positive';
            }

            if (lineItem.quantityShipped < lineItem.quantityAccepted) {
                errors.quantityAccepted = 'proofOfDelivery.canNotAcceptMoreThanShipped';
            }
        }

        function validateRejectionReasonId(lineItem, errors) {
            if (lineItem.quantityRejected && !lineItem.rejectionReasonId) {
                errors.rejectionReasonId = 'proofOfDelivery.required';
            }

            if (!lineItem.quantityRejected && lineItem.rejectionReasonId) {
                errors.rejectionReasonId =
                    'proofOfDelivery.canNotSpecifyReasonForRejectionIfNotRejectingAnything';
            }
        }

        function validateVvmStatus(lineItem, errors) {
            if (lineItem.quantityAccepted > 0 && lineItem.useVvm && !lineItem.vvmStatus) {
                errors.vvmStatus = 'proofOfDelivery.vvmStatusIsRequired';
            }

            if (lineItem.quantityAccepted === 0 && lineItem.vvmStatus) {
                errors.vvmStatus = 'proofOfDelivery.cannotSelectVvmStatusWhenNothingAccepted';
            }
        }
    }
})();
