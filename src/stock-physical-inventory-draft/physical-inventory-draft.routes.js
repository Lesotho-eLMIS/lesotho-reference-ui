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
        .module('stock-physical-inventory-draft')
        .config(routes);

    routes.$inject = ['$stateProvider', 'STOCKMANAGEMENT_RIGHTS'];

    function routes($stateProvider, STOCKMANAGEMENT_RIGHTS) {
        $stateProvider.state('openlmis.stockmanagement.physicalInventory.draft', {
            url: '/:id?physicalInventoryType&keyword&includeInactive&page&size&programId&facilityId',
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
                    physicalInventoryDraftCacheService, drafts, $state, $q) {

                    // Cyclic is handled first — it has no server draft and no id.
                    // Both noReload and normal load use the same path: check cache
                    // using a synthetic key (program+facility), then fall back to
                    // getDraft for a fresh server fetch on first load.
                    // Never call getPhysicalInventory for Cyclic — it would load the
                    // Major draft's line items since they share the same server draft id.
                    if ($stateParams.physicalInventoryType === 'Cyclic') {
                        // Cyclic identity comes from two possible sources:
                        // - $stateParams.program / .facility: full objects,
                        //   only ever present via in-app $state.go(...) params
                        //   (normal navigation from the list page).
                        // - $stateParams.programId / .facilityId: plain string
                        //   ids carried in the URL itself (see url pattern
                        //   above), set by navigateToCyclic in
                        //   physical-inventory-list.controller.js. These are
                        //   what survive a real browser refresh, since the
                        //   full objects above are not.
                        // Prefer the objects when present (avoids an extra
                        // lookup on normal navigation); fall back to the URL
                        // ids so a refresh can reconstruct the same session
                        // instead of leaving the page.
                        var cyclicProgramId = $stateParams.program ?
                            $stateParams.program.id : $stateParams.programId;
                        var cyclicFacilityId = $stateParams.facility ?
                            $stateParams.facility.id : $stateParams.facilityId;

                        if (!cyclicProgramId || !cyclicFacilityId) {
                            // Truly unrecoverable - no in-app params and
                            // nothing usable in the URL either (for example
                            // the draft URL was opened directly with no
                            // query params at all). Nothing to render;
                            // send the user to pick a program and facility.
                            $state.go('openlmis.stockmanagement.physicalInventory', {}, {
                                reload: true
                            });
                            return $q.reject();
                        }

                        // Fix: Cyclic has no incremental server save - every
                        // in-progress product/quantity previously lived only
                        // in physicalInventoryDraftCacheService under this
                        // synthetic key, and the old code below restored it
                        // whenever cached.$modified was true. Cyclic's own
                        // add-product flow (selectExistingProductForCyclic,
                        // addProducts, etc. in the controller) never actually
                        // depends on this cache read - it updates
                        // vm.itemsSelectedForCyclic directly in memory - so
                        // this branch was only ever reached via an accidental
                        // refresh or navigate-away-and-back. That made a
                        // refresh silently resurrect old counts instead of
                        // starting fresh. Removed entirely: Cyclic now always
                        // fetches straight from the server below, which
                        // naturally reflects nothing counted yet, since
                        // Cyclic has never saved anything there.
                        //
                        // var cyclicKey = 'cyclic-' + cyclicProgramId + '-' + cyclicFacilityId;
                        // return physicalInventoryDraftCacheService.getDraft(cyclicKey)
                        //     .then(function(cached) {
                        //         if (cached && cached.$modified) {
                        //             return cached;
                        //         }
                        //         return physicalInventoryFactory
                        //             .getDraft(cyclicProgramId, cyclicFacilityId);
                        //     });

                        // Proactively clear any stale cache entry for this
                        // key so no earlier session's data can resurface
                        // through any other path either. Best-effort: a
                        // missing key is not an error worth blocking on.
                        // Defensively checked for .catch support rather than
                        // assumed, since this service's return shape was not
                        // directly available while writing this fix.
                        var cyclicKey = 'cyclic-' + cyclicProgramId + '-' + cyclicFacilityId;
                        var clearCachePromise = physicalInventoryDraftCacheService.removeById(cyclicKey);
                        if (clearCachePromise && typeof clearCachePromise.catch === 'function') {
                            clearCachePromise.catch(function() {
                                // No existing cache entry for this key - nothing to clear.
                            });
                        }

                        // Always a fresh server fetch. Real stock products
                        // are returned so Search Existing Product and Add
                        // from Catalogue still have items to show; none of
                        // them carry isAdded/hasQuantity yet, so the display
                        // filter in displayLineItemsGroup below keeps the
                        // table blank until the user adds something in this
                        // session, exactly like a first visit.
                        return physicalInventoryFactory
                            .getDraft(cyclicProgramId, cyclicFacilityId);
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
            var index = ($stateParams.physicalInventoryType === "Major") ? 0 : 1 ;
            return drafts[index].reduce(function(draft, physicalInventory) {
                if (physicalInventory.id === $stateParams.id) {
                    draft = physicalInventory;                   
                }
                return draft;
            }, {});
        }
    }
})();