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

(function() {

    'use strict';

    angular
        .module('stock-adjustment-creation')
        .service('receiveOrderableGroupService', service);

    service.$inject = [
        '$q', 'StockCardSummaryRepository', 'FullStockCardSummaryRepositoryImpl',
        'orderableGroupService'
    ];

    function service($q, StockCardSummaryRepository, FullStockCardSummaryRepositoryImpl,
                     orderableGroupService) {

        var SEARCH_PAGE_SIZE = 25,
            ORDERABLE_ID_CHUNK_SIZE = 50;

        this.findByOrderableIds = findByOrderableIds;
        this.search = search;

        function findByOrderableIds(programId, facilityId, orderableIds) {
            var ids = _.chain(orderableIds)
                .compact()
                .uniq()
                .value();

            if (!ids.length) {
                return $q.resolve([]);
            }

            return $q.all(chunk(ids, ORDERABLE_ID_CHUNK_SIZE).map(function(idChunk) {
                return query({
                    programId: programId,
                    facilityId: facilityId,
                    orderableId: idChunk,
                    page: 0,
                    size: idChunk.length
                });
            })).then(function(results) {
                return mergeGroups.apply(null, results);
            });
        }

        function search(programId, facilityId, keyword) {
            keyword = keyword ? keyword.trim() : '';
            if (keyword.length < 2) {
                return $q.resolve([]);
            }

            return $q.all([
                query({
                    programId: programId,
                    facilityId: facilityId,
                    orderableCode: keyword,
                    page: 0,
                    size: SEARCH_PAGE_SIZE
                }),
                query({
                    programId: programId,
                    facilityId: facilityId,
                    orderableName: keyword,
                    page: 0,
                    size: SEARCH_PAGE_SIZE
                })
            ]).then(function(results) {
                return mergeGroups(results[0], results[1]);
            });
        }

        function query(params) {
            return new StockCardSummaryRepository(new FullStockCardSummaryRepositoryImpl())
                .query(params)
                .then(function(page) {
                    return orderableGroupService.groupByOrderableId(page.content.reduce(function(items, summary) {
                        summary.canFulfillForMe.forEach(function(fulfill) {
                            items.push(fulfill);
                        });
                        return items;
                    }, []));
                });
        }

        function mergeGroups() {
            var groupsByOrderableId = {};

            Array.prototype.slice.call(arguments).forEach(function(groups) {
                groups.forEach(function(group) {
                    if (group && group.length && group[0].orderable) {
                        groupsByOrderableId[group[0].orderable.id] = group;
                    }
                });
            });

            return Object.keys(groupsByOrderableId).map(function(orderableId) {
                return groupsByOrderableId[orderableId];
            });
        }

        function chunk(items, size) {
            var chunks = [];
            for (var i = 0; i < items.length; i += size) {
                chunks.push(items.slice(i, i + size));
            }
            return chunks;
        }
    }
})();
