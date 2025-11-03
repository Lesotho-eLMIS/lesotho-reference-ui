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
        .module('openlmis-home')
        .config(routes);

    routes.$inject = ['$stateProvider', '$urlRouterProvider'];

    function routes($stateProvider, $urlRouterProvider) {

        $stateProvider.state('openlmis.home', {
            url: '/home',
            // keep home menu always at the first place
            priority: 999,
            showInNavigation: true,
            showInNavigationInLowResolutions: true,
            label: 'openlmisHome.home',
            isOffline: true,
            views: {
                '@': {
                    controller: 'HomeSystemNotificationsController',
                    controllerAs: 'vm',
                    templateUrl: 'openlmis-home/home.html'
                }
            },
            resolve: {
                user: function(currentUserService) {
                    return currentUserService.getUserInfo();
                },
                homePageSystemNotifications: function(paginationService, SystemNotificationResource, $stateParams,
                    offlineService, systemNotificationService) {
                    if (!offlineService.isOffline()) {
                        return systemNotificationService.getSystemNotifications();
                    }
                }
            }
        });

        $urlRouterProvider
            .when('', '/home')
            .when('/', '/home');
    }

})();
