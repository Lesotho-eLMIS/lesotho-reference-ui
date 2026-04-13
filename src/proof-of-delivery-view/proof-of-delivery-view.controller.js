(function() {

    'use strict';

    angular
        .module('proof-of-delivery-view')
        .controller('ProofOfDeliveryViewController', ProofOfDeliveryViewController);

    ProofOfDeliveryViewController.$inject = [
        'proofOfDelivery', 'order', 'reasons', 'messageService', 'VVM_STATUS', 'orderLineItems', 'canEdit',
        'ProofOfDeliveryPrinter', '$q'
    ];

    function ProofOfDeliveryViewController(proofOfDelivery, order, reasons, messageService, VVM_STATUS, orderLineItems,
                                           canEdit, ProofOfDeliveryPrinter, $q) {

        var vm = this;

        vm.$onInit = onInit;
        vm.getStatusDisplayName = getStatusDisplayName;
        vm.getReasonName = getReasonName;
        vm.printProofOfDelivery = printProofOfDelivery;
        vm.getQuantityTypeLabel = getQuantityTypeLabel;

        function onInit() {
            vm.order = order;
            vm.reasons = reasons;
            vm.proofOfDelivery = proofOfDelivery;
            vm.orderLineItems = orderLineItems;
            vm.vvmStatuses = VVM_STATUS;
            vm.showVvmColumn = proofOfDelivery.hasProductsUseVvmStatus();
            vm.canEdit = canEdit;
        }

        function getStatusDisplayName(status) {
            return messageService.get(VVM_STATUS.$getDisplayName(status));
        }

        function getReasonName(id) {
            if (!id) {
                return;
            }

            return vm.reasons.filter(function(reason) {
                return reason.id === id;
            })[0].name;
        }

        function getQuantityTypeLabel(lineItem) {
            return lineItem.quantityType === 'DISPENSING_UNITS' ?
                messageService.get('proofOfDeliveryView.units') :
                messageService.get('proofOfDeliveryView.packs');
        }

        function printProofOfDelivery() {
            var printer = new ProofOfDeliveryPrinter();

            printer.openTab();

            (vm.proofOfDelivery.isInitiated() ? vm.proofOfDelivery.save() : $q.resolve(vm.proofOfDelivery))
                .then(function(savedProofOfDelivery) {
                    printer.setId(savedProofOfDelivery.id);
                    printer.print();
                })
                .catch(function() {
                    printer.closeTab();
                });
        }
    }
}());
