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

    /**
     * @ngdoc service
     * @name requisition-search.requisitionSearchService
     *
     * @description
     * Prepares data for the Requisition Search view.
     */
    angular
        .module('requisition-search')
        .service('requisitionSearchService', requisitionSearchService);

    requisitionSearchService.$inject = [
        'facilityFactory', 'authorizationService', 'currentUserService', 'SupervisoryNodeResource', 'RoleResource',
        'RequisitionGroupResource', '$q', 'OpenlmisArrayDecorator', 'REQUISITION_RIGHTS', 'localStorageService'
    ];

    function requisitionSearchService(facilityFactory, authorizationService, currentUserService,
                                      SupervisoryNodeResource, RoleResource, RequisitionGroupResource, $q,
                                      OpenlmisArrayDecorator, REQUISITION_RIGHTS, localStorageService) {

        var promise,
            REQUISITION_SEARCH_FACILITIES = 'requisitionSearchFacilities';

        this.getFacilities = getFacilities;
        this.clearCachedFacilities = clearCachedFacilities;

        /**
         * @ngdoc method
         * @methodOf requisition-search.requisitionSearchService
         * @name getFacilities
         *
         * @description
         * Prepares the list of facilities to be displayed on the Requisition Search view.
         * 
         * @return {Array}  the list of facilities based on both permission strings and role assignments for partner
         *                  nodes
         */
        function getFacilities() {
            if (promise) {
                return promise;
            }

            var user = authorizationService.getUser();

            var cachedFacilities = localStorageService.get(REQUISITION_SEARCH_FACILITIES);
            if (cachedFacilities) {
                promise = $q.resolve(angular.fromJson(cachedFacilities));
            } else {
                promise = $q
                    .all([
                        facilityFactory.getAllUserFacilities(user.user_id),
                        getFacilitiesBasedOnPartnerNodes()
                    ])
                    .then(mergeFacilityLists)
                    .then(getUniqueSortedByName)
                    .then(cacheFacilities);
            }

            return promise;
        }

        function clearCachedFacilities() {
            promise = undefined;
            localStorageService.remove(REQUISITION_SEARCH_FACILITIES);
        }

        function getFacilitiesBasedOnPartnerNodes() {
            return $q
                .all([
                    fetchSupervisoryNodes(),
                    new RequisitionGroupResource().query()
                ])
                .then(fetchFacilitiesForRequsitionGroupsRelatedWithSupervisoryNodes)
                .then(mergeFacilityLists);
        }

        function fetchSupervisoryNodes() {
            return $q
                .all([
                    getRoleIdsForRolesWithRequisitionViewRight(),
                    currentUserService.getUserInfo()
                ])
                .then(getSupervisoryNodeIdsForMatchingRoleAssignments)
                .then(fetchSupervisoryNodesByIds)
                .then(fetchSupervisoryNodesForPartners);
        }

        function getRoleIdsForRolesWithRequisitionViewRight() {
            return new RoleResource()
                .query()
                .then(function(roles) {
                    return roles
                        .filter(hasRequisitionViewRight)
                        .map(toProperty('id'));
                });
        }

        function hasRequisitionViewRight(role) {
            return role.rights.filter(function(right) {
                return right.name === REQUISITION_RIGHTS.REQUISITION_VIEW;
            }).length > 0;
        }

        function getSupervisoryNodeIdsForMatchingRoleAssignments(responses) {
            var roleIds = responses[0],
                user = responses[1];

            return user.roleAssignments
                .filter(outByUndefinedProperty('supervisoryNodeId'))
                .filter(filterOutNotInBy(roleIds, 'roleId'))
                .map(toProperty('supervisoryNodeId'));
        }

        function fetchSupervisoryNodesByIds(supervisoryNodeIds) {
            if (supervisoryNodeIds.length === 0) {
                return [];
            }

            return new SupervisoryNodeResource().query({
                id: supervisoryNodeIds
            });
        }

        function fetchSupervisoryNodesForPartners(nodesPage) {
            if (nodesPage.content === undefined || nodesPage.content.length === 0) {
                return [];
            }

            var partnerNodeIds = getPartnerOfIdsFromNodes(nodesPage.content);

            if (partnerNodeIds.length === 0) {
                return [];
            }

            return new SupervisoryNodeResource().query({
                id: partnerNodeIds
            });
        }

        function getPartnerOfIdsFromNodes(nodes) {
            return nodes
                .filter(outByUndefinedProperty('partnerNodeOf'))
                .map(toProperty('partnerNodeOf'))
                .map(toProperty('id'));
        }

        function fetchFacilitiesForRequsitionGroupsRelatedWithSupervisoryNodes(responses) {
            var nodes = responses[0].content,
                groups = responses[1],
                requisitionGroupIds;

            if (nodes === undefined) {
                requisitionGroupIds = [];
            } else {
                requisitionGroupIds = getRequisitionGroupIdsFromNodes(nodes);
            }

            return groups
                .filter(filterOutNotInBy(requisitionGroupIds, 'id'))
                .map(toProperty('memberFacilities'));
        }

        function filterOutNotInBy(array, propertyName) {
            return function(item) {
                return array.indexOf(item[propertyName]) > -1;
            };
        }

        function getRequisitionGroupIdsFromNodes(nodes) {
            return nodes
                .filter(outByUndefinedProperty('requisitionGroup'))
                .map(toProperty('requisitionGroup'))
                .map(toProperty('id'));
        }

        function mergeFacilityLists(facilityLists) {
            var facilities = [];

            facilityLists.forEach(function(facilityList) {
                facilityList.forEach(function(facility) {
                    facilities.push(facility);
                });
            });

            return facilities;
        }

        function getUniqueSortedByName(facilities) {
            var decoratedFacilityList = new OpenlmisArrayDecorator(facilities);

            decoratedFacilityList.sortBy('name');

            return decoratedFacilityList.getAllWithUniqueIds();
        }

        function cacheFacilities(facilities) {
            localStorageService.add(REQUISITION_SEARCH_FACILITIES, angular.toJson(facilities));
            return facilities;
        }

        function outByUndefinedProperty(propertyName) {
            return function(item) {
                return item[propertyName];
            };
        }

        function toProperty(propertyName) {
            return function(item) {
                return item[propertyName];
            };
        }

    }

})();