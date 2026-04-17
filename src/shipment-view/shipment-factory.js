(function() {

    'use strict';

    angular
        .module('shipment-view')
        .factory('ShipmentFactory', ShipmentFactory);

    ShipmentFactory.$inject = ['StockCardSummaryRepositoryImpl'];

    function ShipmentFactory(StockCardSummaryRepositoryImpl) {

        ShipmentFactory.prototype.buildFromOrder = buildFromOrder;

        return ShipmentFactory;

        function ShipmentFactory() {}

        function buildFromOrder(order) {
            var orderableIds = order.orderLineItems.map(function(lineItem) {
                return lineItem.orderable.id;
            });

            return new StockCardSummaryRepositoryImpl().query({
                programId: order.program.id,
                facilityId: order.supplyingFacility.id,
                orderableId: orderableIds
            })
                .then(function(page) {
                    var summaries = page.content,
                        shipmentViewLineItems = summaries.reduce(function(shipmentLineItems, summary) {
                            return shipmentLineItems.concat(
                                summary.canFulfillForMe.map(function(canFulfillForMe) {
                                    return {
                                        orderable: {
                                            id: canFulfillForMe.orderable.id,
                                            versionNumber: canFulfillForMe.orderable.meta.versionNumber
                                        },
                                        lot: canFulfillForMe.lot,
                                        quantityShipped: 0,
                                        quantityType: 'PACKS'
                                    };
                                })
                            );
                        }, []);

                    return {
                        order: order,
                        lineItems: shipmentViewLineItems
                    };
                });
        }
    }
})();
