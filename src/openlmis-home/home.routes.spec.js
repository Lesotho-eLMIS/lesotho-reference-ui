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

describe('openlmis.home route', function() {

    beforeEach(function() {
        module('openlmis-home');

        inject(function($injector) {
            this.$q = $injector.get('$q');
            this.$location = $injector.get('$location');
            this.$rootScope = $injector.get('$rootScope');
            this.$state = $injector.get('$state');
            this.UserDataBuilder = $injector.get('UserDataBuilder');
            this.SystemNotificationDataBuilder = $injector.get('SystemNotificationDataBuilder');
            this.SystemNotificationResource = $injector.get('SystemNotificationResource');
            this.ReferenceDataUserResource = $injector.get('ReferenceDataUserResource');
            this.ObjectReferenceDataBuilder = $injector.get('ObjectReferenceDataBuilder');
            this.UserObjectReferenceDataBuilder = $injector.get('UserObjectReferenceDataBuilder');
            this.PageDataBuilder = $injector.get('PageDataBuilder');
            this.offlineService = $injector.get('offlineService');
        });

        this.users = [
            new this.UserDataBuilder().buildReferenceDataUserJson(),
            new this.UserDataBuilder().buildReferenceDataUserJson()
        ];

        this.systemNotifications = [
            new this.SystemNotificationDataBuilder()
                .withAuthor(
                    new this.UserObjectReferenceDataBuilder()
                        .withId(this.users[0].id)
                        .withFirstName('Admin')
                        .withLastName('Admin')
                        .build()
                )
                .build(),
            new this.SystemNotificationDataBuilder()
                .withAuthor(
                    new this.ObjectReferenceDataBuilder()
                        .withId(this.users[1].id)
                        .build()
                )
                .build(),
            new this.SystemNotificationDataBuilder()
                .withAuthor(
                    new this.ObjectReferenceDataBuilder()
                        .withId(this.users[1].id)
                        .build()
                )
                .build(),
            new this.SystemNotificationDataBuilder()
                .withAuthor(
                    new this.ObjectReferenceDataBuilder()
                        .withId(this.users[0].id)
                        .build()
                )
                .build()
        ];

        this.systemNotificationsPage = new this.PageDataBuilder()
            .withContent(this.systemNotifications)
            .build();

        spyOn(this.SystemNotificationResource.prototype, 'query')
            .andReturn(this.$q.resolve(this.systemNotificationsPage));
        spyOn(this.offlineService, 'isOffline');

        this.goToUrl = function(url) {
            this.$location.url(url);
            this.$rootScope.$apply();
        };

        this.getResolvedValue = function(name) {
            return this.$state.$current.locals.globals[name];
        };
    });

    it('should resolve system notifications', function() {
        this.goToUrl('/home');

        expect(this.getResolvedValue('homePageSystemNotifications')).toEqual(this.systemNotifications);
    });

    it('should resolve a user with correct first name and last name', function() {
        this.goToUrl('/home');

        expect(this.getResolvedValue('homePageSystemNotifications')[0].author.firstName)
            .toEqual(this.systemNotifications[0].author.firstName);

        expect(this.getResolvedValue('homePageSystemNotifications')[0].author.lastName)
            .toEqual(this.systemNotifications[0].author.lastName);
    });

    it('should not resolve system notifications while offline', function() {
        this.offlineService.isOffline.andReturn(true);
        this.goToUrl('/home');

        expect(this.SystemNotificationResource.prototype.query).not.toHaveBeenCalled();
    });
});
