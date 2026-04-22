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
                draft: function($stateParams, physicalInventoryFactory, offlineService,
                    physicalInventoryDraftCacheService, drafts) {

                    // Cyclic is handled first — it has no server draft and no id.
                    // Both noReload and normal load use the same path: check cache
                    // using a synthetic key (program+facility), then fall back to
                    // getDraft for a fresh server fetch on first load.
                    // Never call getPhysicalInventory for Cyclic — it would load the
                    // Major draft's line items since they share the same server draft id.
                    if ($stateParams.physicalInventoryType === 'Cyclic') {
                        if (!$stateParams.program || !$stateParams.facility) {
                            return {
                                programId: undefined,
                                facilityId: undefined,
                                isStarter: true,
                                lineItems: []
                            };
                        }
                        // Synthetic cache key — Cyclic has no server draft id so we
                        // use program+facility as a stable identifier. vm.addProducts
                        // sets draft.id to this same key before calling cacheDraft().
                        var cyclicKey = 'cyclic-' +
                            $stateParams.program.id + '-' +
                            $stateParams.facility.id;
                        return physicalInventoryDraftCacheService.getDraft(cyclicKey)
                            .then(function(cached) {
                                if (cached && cached.$modified) {
                                    return cached;
                                }
                                // No modified cache — fresh load. Call getDraft to get
                                // real stock products for this facility so Search Existing
                                // Product and Add from Catalogue have items to show.
                                return physicalInventoryFactory
                                    .getDraft($stateParams.program.id, $stateParams.facility.id);
                            });
                    }

                    // noReload=true after Add Product or Save for Major — load from cache.
                    if (offlineService.isOffline() || $stateParams.noReload) {
                        return physicalInventoryDraftCacheService.getDraft($stateParams.id);
                    }

                    if ($stateParams.supervised) {
                        // getDraft() is async — chain .then() so getPhysicalInventory
                        // receives the resolved draft object, not the Promise itself.
                        return physicalInventoryFactory
                            .getDraft($stateParams.program.id, $stateParams.facility.id)
                            .then(function(draft) {
                                return physicalInventoryFactory.getPhysicalInventory(draft);
                            });
                    }

                    var currentDraft = getDraftFromParent(drafts, $stateParams);
                    return physicalInventoryFactory.getPhysicalInventory(currentDraft);
                },
                program: function($stateParams, programService, draft) {
                    if ($stateParams.program === undefined) {
                        $stateParams.program = programService.get(draft.programId);
                    }
                    return $stateParams.program;
                },
                facility: function($stateParams, facilityFactory) {
                    if ($stateParams.facility === undefined) {
                        $stateParams.facility = facilityFactory.getUserHomeFacility();
                    }
                    return $stateParams.facility;
                },
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
                reasons: function(facility, program, stockReasonsFactory) {
                    return stockReasonsFactory.getReasons(
                        program.id ? program.id : program,
                        facility.type ? facility.type.id : facility
                    );
                }
            }
        });

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