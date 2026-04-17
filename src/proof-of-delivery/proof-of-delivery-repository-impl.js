(function() {

    'use strict';

    angular
        .module('proof-of-delivery')
        .factory('ProofOfDeliveryRepositoryImpl', ProofOfDeliveryRepositoryImpl);

    ProofOfDeliveryRepositoryImpl.$inject = [
        '$q', '$resource', 'fulfillmentUrlFactory', 'LotRepositoryImpl', 'OrderableResource'
    ];

    function ProofOfDeliveryRepositoryImpl($q, $resource, fulfillmentUrlFactory, LotRepositoryImpl, OrderableResource) {

        ProofOfDeliveryRepositoryImpl.prototype.get = get;
        ProofOfDeliveryRepositoryImpl.prototype.update = update;

        return ProofOfDeliveryRepositoryImpl;

        function ProofOfDeliveryRepositoryImpl() {
            this.lotRepositoryImpl = new LotRepositoryImpl();
            this.orderableResource = new OrderableResource();

            this.resource = $resource(fulfillmentUrlFactory('/api/proofsOfDelivery/:id'), {}, {
                update: {
                    method: 'PUT'
                }
            });
        }

        function get(id) {
            var lotRepositoryImpl = this.lotRepositoryImpl,
                orderableResource = this.orderableResource;

            return this.resource.get({
                id: id,
                expand: 'shipment.order'
            }).$promise
                .then(function(proofOfDeliveryJson) {
                    var lotIds = getIdsFromListByObjectName(proofOfDeliveryJson.lineItems, 'lot'),
                        orderableIds = getIdsFromListByObjectName(proofOfDeliveryJson.lineItems, 'orderable');

                    return $q.all([
                        lotRepositoryImpl.query({
                            id: lotIds
                        }),
                        orderableResource.query({
                            id: orderableIds
                        })
                    ])
                        .then(function(responses) {
                            var lotPage = responses[0],
                                orderablePage = responses[1];
                            return combineResponses(proofOfDeliveryJson, lotPage.content, orderablePage.content);
                        });
                });
        }

        function update(proofOfDelivery) {
            return this.resource.update(
                {
                    id: proofOfDelivery.id
                },
                proofOfDelivery
            ).$promise;
        }

        function combineResponses(proofOfDeliveryJson, lotJsons, orderableJsons) {
            proofOfDeliveryJson.lineItems.forEach(function(lineItem) {
                var shipmentLineItem = getShipmentLineItem(lineItem, proofOfDeliveryJson.shipment.lineItems);

                lineItem.quantityShipped = shipmentLineItem.quantityShipped;
                lineItem.quantityType = shipmentLineItem.quantityType || 'PACKS';
                lineItem.lot = getFirstObjectFromListById(lotJsons, lineItem, 'lot');
                lineItem.orderable = getFirstObjectFromListById(orderableJsons, lineItem, 'orderable');
            });

            return proofOfDeliveryJson;
        }

        function getIdsFromListByObjectName(list, objectName) {
            return list.reduce(function(ids, item) {
                if (item[objectName]) {
                    ids.push(item[objectName].id);
                }
                return ids;
            }, []);
        }

        function getFirstObjectFromListById(list, object, propertyName) {
            var filteredList;
            if (object[propertyName] && list.length) {
                filteredList = list.filter(function(item) {
                    return item.id === object[propertyName].id;
                });
            }
            return filteredList && filteredList.length ? filteredList[0] : undefined;
        }

        function getShipmentLineItem(lineItem, shipmentLineItems) {
            return shipmentLineItems.filter(function(shipmentLineItem) {
                return shipmentLineItem.orderable.id === lineItem.orderable.id &&
                    areLotsEqual(shipmentLineItem.lot, lineItem.lot);
            })[0];
        }

        function areLotsEqual(left, right) {
            if (left && right && left.id === right.id) {
                return true;
            } else if (!left && !right)  {
                return true;
            }
            return false;
        }
    }
})();
