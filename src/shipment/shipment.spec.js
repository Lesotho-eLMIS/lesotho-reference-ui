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
 * http://www.gnu.org/licenses.  For additional information contact info@OpenLMIS.org. 
 */

describe('Shipment', function() {

    var Shipment, ShipmentLineItem, ShipmentDataBuilder, OrderDataBuilder, json, shipment, $q,
        $rootScope;

    beforeEach(function() {
        module('shipment');

        inject(function($injector) {
            $q = $injector.get('$q');
            Shipment = $injector.get('Shipment');
            $rootScope = $injector.get('$rootScope');
            ShipmentLineItem = $injector.get('ShipmentLineItem');
            ShipmentDataBuilder = $injector.get('ShipmentDataBuilder');
            OrderDataBuilder = $injector.get('OrderDataBuilder');
        });

        json = new ShipmentDataBuilder().buildJson();
        shipment = new ShipmentDataBuilder().build();
    });

    describe('constructor', function() {

        var repositoryMock;

        beforeEach(function() {
            repositoryMock = jasmine.createSpyObj('repository', ['get']);
        });

        it('should set all properties', function() {
            var result = new Shipment(json, repositoryMock);

            expect(result.id).toEqual(json.id);
            expect(result.notes).toEqual(json.notes);
            expect(result.order).toEqual(json.order);
            expect(result.repository).toEqual(repositoryMock);

            expect(result.lineItems.length).toEqual(2);
            expect(result.lineItems[0].id).toEqual(json.lineItems[0].id);
            expect(result.lineItems[0].orderable).toEqual(json.lineItems[0].orderable);
            expect(result.lineItems[0].lot).toEqual(json.lineItems[0].lot);
            expect(result.lineItems[0].quantityShipped).toEqual(json.lineItems[0].quantityShipped);
            expect(result.lineItems[0].stockOnHand)
                .toEqual(json.lineItems[0].canFulfillForMe.stockOnHand);

            expect(result.lineItems[1].id).toEqual(json.lineItems[1].id);
            expect(result.lineItems[1].orderable).toEqual(json.lineItems[1].orderable);
            expect(result.lineItems[1].lot).toEqual(json.lineItems[1].lot);
            expect(result.lineItems[1].quantityShipped).toEqual(json.lineItems[1].quantityShipped);
            expect(result.lineItems[1].stockOnHand)
                .toEqual(json.lineItems[1].canFulfillForMe.stockOnHand);
        });

        it('should create instance of shipment line items', function() {
            var result = new Shipment(json, repositoryMock);

            expect(result.lineItems[0] instanceof ShipmentLineItem).toBe(true);
            expect(result.lineItems[1] instanceof ShipmentLineItem).toBe(true);
        });

    });

    describe('save', function() {

        it('should return updated shipment', function() {
            var updatedShipment = new ShipmentDataBuilder().build();

            shipment.repository.updateDraft.andReturn($q.resolve(updatedShipment));

            var result;
            shipment.save()
                .then(function(response) {
                    result = response;
                });
            $rootScope.$apply();

            expect(result).toEqual(updatedShipment);
        });

        it('should reject if repository rejects', function() {
            shipment.repository.updateDraft.andReturn($q.reject());

            var rejected;
            shipment.save()
                .catch(function() {
                    rejected = true;
                });
            $rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should reject if shipment is not editable', function() {
            spyOn(shipment, 'isEditable').andReturn(false);

            var rejected;
            shipment.save()
                .catch(function() {
                    rejected = true;
                });
            $rootScope.$apply();

            expect(rejected).toBe(true);
        });

    });

    describe('confirm', function() {

        it('should reject if shipment is invalid', function() {
            spyOn(shipment, 'isInvalid');

            shipment.isInvalid.andReturn({
                lineItems: 'invalid'
            });

            var rejected;
            shipment.confirm()
                .catch(function() {
                    rejected = true;
                });
            $rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should reject if repository rejects', function() {
            shipment.repository.create.andReturn($q.reject());

            var rejected;
            shipment.confirm()
                .catch(function() {
                    rejected = true;
                });
            $rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should resolve if shipment has been confirmed', function() {
            spyOn(shipment, 'isInvalid');

            shipment.repository.create.andReturn($q.resolve());
            shipment.isInvalid.andReturn(undefined);

            var confirmed;
            shipment.confirm()
                .then(function() {
                    confirmed = true;
                });
            $rootScope.$apply();

            expect(confirmed).toBe(true);
        });

        it('should reject if shipment is not editable', function() {
            spyOn(shipment, 'isEditable').andReturn(false);

            var rejected;
            shipment.confirm()
                .catch(function() {
                    rejected = true;
                });
            $rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should reject if shipment has no line items', function() {
            shipment.lineItems = [];

            var rejected;
            shipment.confirm()
                .catch(function() {
                    rejected = true;
                });
            $rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should reject with a specific error if no in-stock item has a positive fill quantity',
            function() {
                shipment.lineItems[0].stockOnHand = 10;
                shipment.lineItems[0].quantityShipped = 0;
                shipment.lineItems[1].stockOnHand = 20;
                shipment.lineItems[1].quantityShipped = 0;

                var rejectionReason;
                shipment.confirm()
                    .catch(function(error) {
                        rejectionReason = error;
                    });
                $rootScope.$apply();

                expect(rejectionReason).toBe('shipment.noShippedQuantity');
            });

    });

    describe('delete', function() {

        it('should resolve if shipment was deleted', function() {
            shipment.repository.deleteDraft.andReturn($q.resolve());

            var deleted;
            shipment.delete()
                .then(function() {
                    deleted = true;
                });
            $rootScope.$apply();

            expect(deleted).toBe(true);
        });

        it('should reject if repository rejects', function() {
            shipment.repository.deleteDraft.andReturn($q.reject());

            var rejected;
            shipment.delete()
                .catch(function() {
                    rejected = true;
                });
            $rootScope.$apply();

            expect(rejected).toBe(true);
        });

        it('should reject if shipment is not editable', function() {
            spyOn(shipment, 'isEditable').andReturn(false);

            var rejected;
            shipment.delete()
                .catch(function() {
                    rejected = true;
                });
            $rootScope.$apply();

            expect(rejected).toBe(true);
        });

    });

    describe('isInvalid', function() {

        it('should return undefined if shipment is valid', function() {
            var result = shipment.isInvalid();

            expect(result).toBeUndefined();
        });

        it('should return error if any of the line items is invalid', function() {
            spyOn(shipment.lineItems[0], 'isInvalid').andReturn({
                quantityShipped: 'shipment.required'
            });

            var result = shipment.isInvalid();

            expect(result).toEqual({
                lineItems: [{
                    quantityShipped: 'shipment.required'
                }]
            });
        });

    });

    describe('isEditable', function() {

        it('should return true if order status is ordered', function() {
            shipment = new ShipmentDataBuilder()
                .withOrder(new OrderDataBuilder().buildOrdered())
                .build();

            var result = shipment.isEditable();

            expect(result).toBe(true);
        });

        it('should return true if order status is fulfilling ', function() {
            shipment = new ShipmentDataBuilder()
                .withOrder(new OrderDataBuilder().buildFulfilling())
                .build();

            var result = shipment.isEditable();

            expect(result).toBe(true);
        });

        it('should return false if order status is shipped', function() {
            shipment = new ShipmentDataBuilder()
                .withOrder(new OrderDataBuilder().buildShipped())
                .build();

            var result = shipment.isEditable();

            expect(result).toBe(false);
        });

        it('should return false if order status is past shipped', function() {
            shipment = new ShipmentDataBuilder()
                .withOrder(new OrderDataBuilder().buildReceived())
                .build();

            var result = shipment.isEditable();

            expect(result).toBe(false);
        });

    });

    describe('canBeConfirmed', function() {

        it('should return true if shipment has at least one line item', function() {
            expect(shipment.canBeConfirmed()).toEqual(true);
        });

        it('should return false if shipment does not have any line items', function() {
            shipment = new ShipmentDataBuilder()
                .withoutLineItems()
                .build();

            expect(shipment.canBeConfirmed()).toEqual(false);
        });

        it('should return false if all in-stock items have fill quantity less than or equal to 0', function() {
            shipment.lineItems[0].stockOnHand = 10;
            shipment.lineItems[0].quantityShipped = 0;
            shipment.lineItems[1].stockOnHand = 20;
            shipment.lineItems[1].quantityShipped = 0;

            expect(shipment.canBeConfirmed()).toEqual(false);
        });

        it('should return true if at least one in-stock item has fill quantity greater than 0', function() {
            shipment.lineItems[0].stockOnHand = 10;
            shipment.lineItems[0].quantityShipped = 0;
            shipment.lineItems[1].stockOnHand = 20;
            shipment.lineItems[1].quantityShipped = 1;

            expect(shipment.canBeConfirmed()).toEqual(true);
        });

        it('should return true if no item has stock on hand', function() {
            shipment.lineItems[0].stockOnHand = 0;
            shipment.lineItems[0].quantityShipped = 0;
            shipment.lineItems[1].stockOnHand = 0;
            shipment.lineItems[1].quantityShipped = 0;

            expect(shipment.canBeConfirmed()).toEqual(true);
        });
    });

});
