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

    /**
     * @ngdoc service
     * @name order-fulfillment.orderRepository
     *
     * @description
     * Decorates the orderRepository with the ability to archive an erroneous request.
     */
    angular
        .module('order-fulfillment')
        .config(config);

    config.$inject = ['$provide'];

    function config($provide) {
        $provide.decorator('orderRepository', decorator);
    }

    decorator.$inject = ['$delegate', '$resource', 'fulfillmentUrlFactory'];
    function decorator($delegate, $resource, fulfillmentUrlFactory) {

        var resource = $resource(fulfillmentUrlFactory('/api/orders/:id/archive'), {}, {
            archive: {
                method: 'PUT'
            }
        });

        $delegate.archive = archive;

        return $delegate;

        /**
         * @ngdoc method
         * @methodOf order-fulfillment.orderRepository
         * @name archive
         *
         * @description
         * Archives the given order so that it no longer appears in the request list.
         * The order is retained on the server.
         *
         * @param  {String}  orderId the id of the order to archive
         * @return {Promise}         resolved once the order has been archived
         */
        function archive(orderId) {
            if (!orderId) {
                throw 'Order ID must be defined';
            }

            return resource.archive({
                id: orderId
            }, {}).$promise;
        }
    }

})();
