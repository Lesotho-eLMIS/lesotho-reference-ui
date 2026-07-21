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
        .directive('receiveProductSearch', receiveProductSearch);

    receiveProductSearch.$inject = ['$timeout', '$parse', 'messageService'];

    function receiveProductSearch($timeout, $parse, messageService) {
        return {
            restrict: 'A',
            link: link
        };

        function link(scope, element, attrs) {
            var inputEvent = 'input.receiveProductSearch',
                searchCallback = $parse(attrs.receiveProductSearch),
                placeholderGetter = attrs.receiveProductPlaceholder ?
                    $parse(attrs.receiveProductPlaceholder) : null,
                enabledGetter = attrs.receiveProductSearchEnabled ?
                    $parse(attrs.receiveProductSearchEnabled) : null;

            $timeout(function() {
                if (enabledGetter && !enabledGetter(scope)) {
                    return;
                }

                if (element.data('select2')) {
                    element.select2('destroy');
                }

                updatePlaceholderText();
                element.select2({
                    minimumResultsForSearch: 0,
                    allowClear: true,
                    selectOnClose: false,
                    placeholder: getPlaceholder(element),
                    language: {
                        noResults: function() {
                            return messageService.get('openlmisForm.selectNoResults');
                        }
                    }
                });
            });

            if (!enabledGetter || enabledGetter(scope)) {
                element.on('select2:open', bindSearchInput);
            }
            scope.$watch(function() {
                return isEnabled() && placeholderGetter ? placeholderGetter(scope) : undefined;
            }, updatePlaceholderText);

            scope.$on('$destroy', function() {
                element.off('select2:open', bindSearchInput);
                getOpenSearchInput().off(inputEvent);
            });

            function bindSearchInput() {
                if (!isEnabled()) {
                    return;
                }

                $timeout(function() {
                    getOpenSearchInput()
                        .off(inputEvent)
                        .on(inputEvent, function() {
                            var keyword = this.value;
                            scope.$applyAsync(function() {
                                searchCallback(scope, {
                                    keyword: keyword
                                });
                            });
                        });
                });
            }

            function getOpenSearchInput() {
                return angular.element(document.querySelector(
                    '.select2-container--open .select2-search__field'
                ));
            }

            function updatePlaceholderText() {
                if (!isEnabled()) {
                    return;
                }

                var placeholderText = placeholderGetter ? placeholderGetter(scope) : '';

                if (placeholderText) {
                    element.children('.placeholder:first').text(placeholderText);
                    element.attr('data-placeholder', placeholderText);

                    if (element.data('select2')) {
                        element.trigger('change.select2');
                    }
                }
            }

            function getPlaceholder(selectElement) {
                var placeholderOption = selectElement.children('.placeholder:first');

                if (placeholderOption.length === 0) {
                    return false;
                }
                return {
                    id: placeholderOption.val(),
                    text: placeholderGetter ? placeholderGetter(scope) : placeholderOption.text()
                };
            }

            function isEnabled() {
                return !enabledGetter || !!enabledGetter(scope);
            }
        }
    }
})();
