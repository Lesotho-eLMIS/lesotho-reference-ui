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

    angular
        .module('stock-physical-inventory-draft')
        .config(routes);

    routes.$inject = ['$stateProvider', 'STOCKMANAGEMENT_RIGHTS'];

    function routes($stateProvider, STOCKMANAGEMENT_RIGHTS) {
        $stateProvider.state('openlmis.stockmanagement.physicalInventory.draft', {
            url: '/:id?physicalInventoryType&keyword&includeInactive&page&size',
            isOffline: true,
            views: {
                '@openlmis': {
                    controller: 'PhysicalInventoryDraftController',
                    templateUrl: 'stock-physical-inventory-draft/physical-inventory-draft.html',
                    controllerAs: 'vm'
                }
            },
            accessRights: [STOCKMANAGEMENT_RIGHTS.INVENTORIES_EDIT],
            parentResolves: ['drafts'],
            params: {
                program: undefined,
                facility: undefined,
                noReload: undefined,
                includeInactive: 'false',
                isSubmitted: false,
                supervised: undefined
            },
            resolve: {
                /**
                 * Resolves the physical inventory draft for the current state.
                 *
                 * noReload path: used after Add Product or Save. For Cyclic, always
                 * fetches fresh stock products via getDraft (no cache, no id). For Major,
                 * loads from local cache, falling back to server on cache miss.
                 *
                 * Cyclic path: calls physicalInventoryFactory.getDraft to get real lineItems
                 * from the facility's stock products so the controller can populate
                 * vm.productsForCyclic (Search Existing Product) and notYetAddedItems
                 * (Add from Catalogue). getPhysicalInventory is NOT called for Cyclic —
                 * that would load the Major draft's line items into the Cyclic table.
                 * The displayLineItemsGroup filter keeps the table blank by only showing
                 * items where isAdded or hasQuantity is true.
                 *
                 * Major path: checks local cache first. If draft was modified ($modified=true),
                 * returns cached version. Otherwise fetches fresh from server via getDraft +
                 * getPhysicalInventory. Works for both home and supervised facilities.
                 */
                draft: function($stateParams, physicalInventoryFactory, offlineService,
                    physicalInventoryDraftCacheService, drafts) {

                    // Cyclic has no server draft and no id. Handle it first in all cases
                    // so we never try to look up a Cyclic draft by id (which would fail).
                    // getDraft fetches real stock products so Search Existing Product and
                    // Add from Catalogue have items to show. Never call getPhysicalInventory
                    // for Cyclic — it would load the Major draft's line items.
                    if ($stateParams.physicalInventoryType === 'Cyclic') {
                        if (!$stateParams.program || !$stateParams.facility) {
                            // Program or facility not set — return empty stub to avoid crash.
                            return {
                                programId: undefined,
                                facilityId: undefined,
                                isStarter: true,
                                lineItems: []
                            };
                        }
                        return physicalInventoryFactory
                            .getDraft($stateParams.program.id, $stateParams.facility.id);
                    }

                    
                    if (offlineService.isOffline() || $stateParams.noReload) {
                        // Works for both Major and Cyclic — Cyclic now has a real id from createDraft.
                        return physicalInventoryDraftCacheService.getDraft($stateParams.id)
                            .then(function(cached) {
                                if (cached) { return cached; }
                                if (!$stateParams.program || !$stateParams.facility) {
                                    return getDraftFromParent(drafts, $stateParams);
                                }
                                return physicalInventoryFactory
                                    .getDraft($stateParams.program.id, $stateParams.facility.id)
                                    .then(function(draft) {
                                        return physicalInventoryFactory.getPhysicalInventory(draft);
                                    });
                            });
                    }

                    
                    return physicalInventoryDraftCacheService.getDraft($stateParams.id)
                        .then(function(cached) {
                            if (cached && cached.$modified) {
                                return cached;
                            }
                            if (!$stateParams.program || !$stateParams.facility) {
                                return getDraftFromParent(drafts, $stateParams);
                            }
                            
                            return physicalInventoryFactory
                                .getDraft($stateParams.program.id, $stateParams.facility.id)
                                .then(function(draft) {
                                    return physicalInventoryFactory.getPhysicalInventory(draft);
                                });
                        });
                },
                /**
                 * Resolves the program for the current physical inventory draft.
                 * Uses stateParams.program if already set, otherwise fetches by draft programId.
                 */
                program: function($stateParams, programService, draft) {
                    if ($stateParams.program === undefined) {
                        $stateParams.program = programService.get(draft.programId);
                    }
                    return $stateParams.program;
                },
                /**
                 * Resolves the facility for the current physical inventory draft.
                 * Uses stateParams.facility if already set (e.g. supervised facility),
                 * otherwise falls back to the user's home facility.
                 */
                facility: function($stateParams, facilityFactory) {
                    if ($stateParams.facility === undefined) {
                        $stateParams.facility = facilityFactory.getUserHomeFacility();
                    }
                    return $stateParams.facility;
                },
                /**
                 * Resolves paginated and grouped line items for display.
                 * For Cyclic counts only shows items explicitly added (isAdded) or
                 * already counted (hasQuantity) so the table starts blank.
                 * For Major counts also shows items with stock on hand (hasSoh).
                 */
                displayLineItemsGroup: function(paginationService, physicalInventoryService, $stateParams, $filter,
                    draft, orderableGroupService) {
                    $stateParams.size = '@@STOCKMANAGEMENT_PAGE_SIZE';

                    var validator = function(items) {
                        return _.chain(items).flatten()
                            .every(function(item) {
                                return !!item.quantityInvalid === false;
                            })
                            .value();
                    };

                    return paginationService.registerList(validator, $stateParams, function() {
                        var searchResult = physicalInventoryService.search($stateParams.keyword,
                            draft.lineItems, $stateParams.includeInactive === 'true');
                        var lineItems = $filter('orderBy')(searchResult, 'orderable.productCode');

                        var isCyclic = $stateParams.physicalInventoryType === 'Cyclic';

                        var groups = _.chain(lineItems).filter(function(item) {
                            var hasQuantity = !(_.isNull(item.quantity) || _.isUndefined(item.quantity));
                            var hasSoh = !_.isNull(item.stockOnHand);
                            // For Cyclic counts the table must start blank — only show items
                            // the user has explicitly added (isAdded) or already counted (hasQuantity).
                            // hasSoh alone would pre-load every product at the facility.
                            return isCyclic
                                ? (item.isAdded || hasQuantity)
                                : (item.isAdded || hasQuantity || hasSoh);
                        })
                            .each(function(lineItem) {
                                if (lineItem.quantity === -1 && !isCyclic) {
                                    lineItem.quantity = null;
                                }
                                lineItem.isAdded = true;
                            })
                            .groupBy(function(lineItem) {
                                return lineItem.orderable.id;
                            })
                            .values()
                            .value();
                        groups.forEach(function(group) {
                            group.forEach(function(lineItem) {
                                orderableGroupService.determineLotMessage(lineItem, group, true);
                            });
                        });
                        return groups;
                    });
                },
                /**
                 * Resolves stock adjustment reasons for the current program and facility type.
                 */
                reasons: function(facility, program, stockReasonsFactory) {
                    return stockReasonsFactory.getReasons(
                        program.id ? program.id : program,
                        facility.type ? facility.type.id : facility
                    );
                }
            }
        });

        /**
         * Finds a draft in the parent state's resolved drafts array by matching the
         * draft id from stateParams. Returns an empty object if no match is found.
         * Index 0 is Major drafts, index 1 is Cyclic drafts.
         */
        function getDraftFromParent(drafts, $stateParams) {
            var index = ($stateParams.physicalInventoryType === "Major") ? 0 : 1;
            return drafts[index].reduce(function(draft, physicalInventory) {
                if (physicalInventory.id === $stateParams.id) {
                    draft = physicalInventory;
                }
                return draft;
            }, {});
        }
    }
})();