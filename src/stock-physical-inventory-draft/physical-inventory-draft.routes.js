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
                        // [DIAGNOSTIC] Temporary - remove once the refresh
                        // param-visibility question is settled.
                        console.log('[DIAGNOSTIC] cyclic draft resolve running', {
                            id: $stateParams.id,
                            hasProgramObject: !!$stateParams.program,
                            hasFacilityObject: !!$stateParams.facility,
                            programId: $stateParams.programId,
                            facilityId: $stateParams.facilityId,
                            noReload: $stateParams.noReload
                        });
                        // Cyclic identity comes from two possible sources:
                        // - $stateParams.program / .facility: full objects,
                        //   only ever present via in-app $state.go(...) params
                        //   (normal navigation, and selectExistingProductForCyclic's
                        //   own soft-reload both set these explicitly).
                        // - $stateParams.programId / .facilityId: plain string
                        //   ids carried in the URL itself (see url pattern
                        //   above), set by navigateToCyclic. These are what
                        //   survive a real browser refresh, since the full
                        //   objects above do not.
                        // Note: checked for a real .id rather than mere
                        // truthiness. The facility resolve below mutates
                        // $stateParams.facility to the PROMISE returned by
                        // facilityFactory.getUserHomeFacility() when it runs
                        // first (it has no dependency on draft, so ui-router
                        // may run it before this resolve; program cannot race
                        // this way because its resolve injects draft). A
                        // pending promise is truthy but has no .id, which
                        // made the previous truthiness check pick the object
                        // branch, get undefined, and wrongly fire the
                        // redirect below even with valid ids in the URL.
                        var cyclicProgramId = ($stateParams.program && $stateParams.program.id) ?
                            $stateParams.program.id : $stateParams.programId;
                        var cyclicFacilityId = ($stateParams.facility && $stateParams.facility.id) ?
                            $stateParams.facility.id : $stateParams.facilityId;

                        if (!cyclicProgramId || !cyclicFacilityId) {
                            // [DIAGNOSTIC] Temporary.
                            console.log('[DIAGNOSTIC] cyclic redirect branch FIRING - ids missing at resolve time');
                            // Truly unrecoverable - no in-app params and
                            // nothing usable in the URL either. Nothing to
                            // render; send the user to pick a program and
                            // facility.
                            $state.go('openlmis.stockmanagement.physicalInventory', {}, {
                                reload: true
                            });
                            return $q.reject();
                        }

                        var cyclicKey = 'cyclic-' + cyclicProgramId + '-' + cyclicFacilityId;

                        // Fix: previously this cache read fired any time a
                        // modified cache entry existed for this key,
                        // regardless of how the page was reached - which
                        // meant a real refresh incorrectly restored old
                        // counts (the earlier bug this session was trying to
                        // fix). But removing it outright (a later attempt)
                        // broke selectExistingProductForCyclic in the
                        // controller, which deliberately does its own
                        // in-app soft-reload after adding a product
                        // (sets $stateParams.noReload = true, then
                        // $state.go(current state)) specifically relying on
                        // this exact cache read to bring back the
                        // just-cached draft with the new product included -
                        // without it, the product vanished from the table
                        // after being "added".
                        // $stateParams.noReload is the right signal to tell
                        // these two cases apart: it is not part of the url
                        // pattern above, so it is only ever true when set
                        // deliberately in JS (as selectExistingProductForCyclic
                        // does) - a real browser refresh always loses it,
                        // coming back undefined. So: restore from cache only
                        // when noReload is explicitly true (the deliberate
                        // add-product case); otherwise - a first visit or a
                        // real refresh - always fetch fresh from the server,
                        // which naturally reflects nothing counted yet since
                        // Cyclic never saves anything there until Submit.
                        if ($stateParams.noReload) {
                            return physicalInventoryDraftCacheService.getDraft(cyclicKey)
                                .then(function(cached) {
                                    if (cached && cached.$modified) {
                                        return cached;
                                    }
                                    return physicalInventoryFactory
                                        .getDraft(cyclicProgramId, cyclicFacilityId);
                                });
                        }

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