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

(function () {
  'use strict';

  /**
   * @ngdoc controller
   * @name stock-adjustment-creation.controller:StockAdjustmentCreationController
   *
   * @description
   * Controller for managing stock adjustment creation.
   */
  angular
    .module('stock-adjustment-creation')
    .controller('StockAdjustmentCreationController', controller);

  controller.$inject = ['$scope', '$state', '$stateParams', '$filter', 'confirmDiscardService', 'program', 'facility',
    'orderableGroups', 'reasons', 'confirmService', 'messageService', 'user', 'adjustmentType', 'srcDstAssignments',
    'stockAdjustmentCreationService', 'notificationService', 'offlineService', 'orderableGroupService',
    'MAX_INTEGER_VALUE', 'VVM_STATUS', 'loadingModalService', 'alertService', 'dateUtils', 'displayItems',
    'ADJUSTMENT_TYPE', 'UNPACK_REASONS', 'REASON_TYPES', 'STOCKCARD_STATUS', 'hasPermissionToAddNewLot',
    'LotResource', '$q', 'editLotModalService', 'moment', 'rejectionReasonService', 'receivingAddDiscrepancyModalService',
    'complaintFormModalService', 'suppliers', 'ReferenceNumbers', 'facilityWithType',
    'QUANTITY_UNIT', 'quantityUnitCalculateService'];

  function controller($scope, $state, $stateParams, $filter, confirmDiscardService, program, facility,
    orderableGroups, reasons, confirmService, messageService, user, adjustmentType, srcDstAssignments,
    stockAdjustmentCreationService, notificationService, offlineService, orderableGroupService,
    MAX_INTEGER_VALUE, VVM_STATUS, loadingModalService, alertService, dateUtils, displayItems, ADJUSTMENT_TYPE,
    UNPACK_REASONS, REASON_TYPES, STOCKCARD_STATUS, hasPermissionToAddNewLot, LotResource, $q, editLotModalService,
    moment, rejectionReasonService, receivingAddDiscrepancyModalService, complaintFormModalService,
    suppliers, ReferenceNumbers, facilityWithType, QUANTITY_UNIT, quantityUnitCalculateService) {
    var vm = this,
      previousAdded = {};

    vm.expirationDateChanged = expirationDateChanged;
    vm.newLotCodeChanged = newLotCodeChanged;
    vm.validateExpirationDate = validateExpirationDate;
    vm.lotChanged = lotChanged;
    vm.addProduct = addProduct;
    vm.podReferenceNumbers = undefined;
    vm.hasPermissionToAddNewLot = hasPermissionToAddNewLot;
    vm.formatDate = formatDate;
    vm.showInDoses = showInDoses;
    vm.recalculateSOHQuantity = recalculateSOHQuantity;
    vm.test = test;

    /**
     * @ngdoc property
     * @propertyOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name quantityUnit
     * @type {Object}
     *
     * @description
     * Holds quantity unit.
     */
    vm.quantityUnit = undefined;

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name showInDoses
     *
     * @description
     * Returns whether the screen is showing quantities in doses.
     *
     * @return {boolean} true if the quantities are in doses, false otherwise
     */
    function showInDoses() {
      // console.log("QTY IN Fn", vm.quantityUnit === QUANTITY_UNIT.DOSES);
      return vm.quantityUnit === QUANTITY_UNIT.DOSES;
      // return true;
      
    }
    function test(lineItem){
      console.log("Line Item", lineItem);
    }
    vm.discrepancyOptions = ["Wrong Item", "Wrong Quantity", "Defective Item", "Missing Item", "More..."];
    vm.rejectionReasons = []; // To Store Shipment rejection Reasons
    vm.FromSupplier = false;
    vm.hideColumns = function () {
      vm.addedLineItems[0].assignment.name
      vm.UPrice = $scope.lineItem.assignment.name;
    };
    vm.mergeFacilities = mergeFacilities;
    vm.filteredFacilities = filterFacilities;

    /**
     * @ngdoc property
     * @propertyOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name vvmStatuses
     * @type {Object}
     *
     * @description
     * Holds list of VVM statuses.
     */
    vm.vvmStatuses = VVM_STATUS;

    /**
     * @ngdoc property
     * @propertyOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name showReasonDropdown
     * @type {boolean}
     */
    vm.showReasonDropdown = true;

    /* eLMIS Lesotho : start */
    // vm.showPrepackingAttributes = false;
    vm.showDeliveryNoteAttributes = false;
    vm.showReasonsInAdjustment = false;
    vm.servicePointUser = false;
    /* eLMIS Lesotho : end */

    /**
     * @ngdoc property
     * @propertyOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name showVVMStatusColumn
     * @type {boolean}
     *
     * @description
     * Indicates if VVM Status column should be visible.
     */
    vm.showVVMStatusColumn = false;

    /**
     * @ngdoc property
     * @propertyOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name offline
     * @type {boolean}
     *
     * @description
     * Holds information about internet connection
     */
    vm.offline = offlineService.isOffline;

    vm.addDiscrepancyOnModal = function (itemTimestamp) {
      receivingAddDiscrepancyModalService.show(itemTimestamp).then(function () {
        $stateParams.noReload = true;
        draft.$modified = true;
        vm.cacheDraft();
        //Only reload current state and avoid reloading parent state
        $state.go($state.current.name, $stateParams, {
          reload: $state.current.name
        });
      });
    }

    vm.addComplaintOnModal = function (itemTimestamp) {
      complaintFormModalService.show(itemTimestamp, program, facility, orderableGroups, hasPermissionToAddNewLot).then(function () {
        $stateParams.noReload = true;
        draft.$modified = true;
        vm.cacheDraft();
        //Only reload current state and avoid reloading parent state
        $state.go($state.current.name, $stateParams, {
          reload: $state.current.name
        });
      });
    }

    vm.key = function (secondaryKey) {
      return adjustmentType.prefix + 'Creation.' + secondaryKey;
    };

    /**
     * @ngdoc property
     * @propertyOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name newLot
     * @type {Object}
     *
     * @description
     * Holds new lot object.
     */
    vm.newLot = undefined;

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name search
     *
     * @description
     * It searches from the total line items with given keyword. If keyword is empty then all line
     * items will be shown.
     */
    vm.search = function () {
      vm.displayItems = stockAdjustmentCreationService.search(
        vm.keyword,
        vm.addedLineItems,
        vm.hasLot
      );

      $stateParams.addedLineItems = vm.addedLineItems;
      $stateParams.displayItems = vm.displayItems;
      $stateParams.keyword = vm.keyword;
      $stateParams.page = getPageNumber();
      $state.go($state.current.name, $stateParams, {
        reload: true,
        notify: false,
      });
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name addProduct
     *
     * @description
     * Add a product for stock adjustment.
     */
    function addProduct() {

      console.log('Adding product');
      var selectedItem;
      if (vm.selectedOrderableGroup && vm.selectedOrderableGroup.length) {
        vm.newLot.tradeItemId =
          vm.selectedOrderableGroup[0].orderable.identifiers.tradeItem;
      }

      if (vm.newLot.lotCode) {
        var createdLot = angular.copy(vm.newLot);
        selectedItem = orderableGroupService.findByLotInOrderableGroup(
          vm.selectedOrderableGroup, createdLot, true);
        selectedItem.$isNewItem = true;
      } else {
        selectedItem = orderableGroupService.findByLotInOrderableGroup(
          vm.selectedOrderableGroup, vm.selectedLot);
      }

      vm.newLot.expirationDateInvalid = undefined;
      vm.newLot.lotCodeInvalid = undefined;
      validateExpirationDate();
      validateLotCode(vm.addedLineItems, selectedItem);
      validateLotCode(vm.allItems, selectedItem);
      var noErrors =
        !vm.newLot.expirationDateInvalid && !vm.newLot.lotCodeInvalid;

      if (noErrors) {
        /*Lesotho eLMIS* Autopopulating total number of cartons from POD during stock receive, Start*/
        selectedItem.referenceNumber = vm.referenceNumber;
        if (adjustmentType.state === 'receive') {
          for (var i = 0; i < ReferenceNumbers.length; i++) {
            if (ReferenceNumbers[i].referenceNumber === vm.referenceNumber) {
              selectedItem.totalCartonNumber = ReferenceNumbers[i].cartonsQuantityAccepted;
            };
          }
        }
        var timestamp = new Date().getTime();
        selectedItem.timestamp = timestamp; // Add a time stamp to the selected line item

        //Add requisition extra data when receiving against a requisition
        if(adjustmentType.state === 'receive' && !vm.servicePointUser && !($stateParams.requisitionToReceiveAgainst === undefined)){
          selectedItem.requisition = $stateParams.requisitionToReceiveAgainst.id;
        }



        vm.addedLineItems.unshift(_.extend({
          $errors: {},
          $previewSOH: selectedItem.stockOnHand
        },
          selectedItem, copyDefaultValue()));

        console.log("Added Line Items ", vm.addedLineItems);
        previousAdded = vm.addedLineItems[0];
        vm.search();
      }
    }

    function copyDefaultValue() {
      var defaultDate;
      if (previousAdded.occurredDate) {
        defaultDate = previousAdded.occurredDate;
      } else {
        defaultDate = dateUtils.toStringDate(new Date());
      }

      return {
        assignment: previousAdded.assignment,
        srcDstFreeText: previousAdded.srcDstFreeText,
        reason:
          adjustmentType.state === ADJUSTMENT_TYPE.KIT_UNPACK.state
            ? {
              id: UNPACK_REASONS.KIT_UNPACK_REASON_ID,
            }
            : previousAdded.reason,
        reasonFreeText: previousAdded.reasonFreeText,
        occurredDate: defaultDate
      };
    }

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name remove
     *
     * @description
     * Remove a line item from added products.
     *
     * @param {Object} lineItem line item to be removed.
     */
    vm.remove = function (lineItem) {

      if (lineItem.prepackSize || lineItem.numberOfPrepacks) {
        lineItem.prepackSize = 0;
        lineItem.numberOfPrepacks = 0;
        vm.validatePrepackQuantity(lineItem);
      }
      var index = vm.addedLineItems.indexOf(lineItem);
      vm.addedLineItems.splice(index, 1);

      vm.search();
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name removeDisplayItems
     *
     * @description
     * Remove all displayed line items.
     */
    vm.removeDisplayItems = function () {
      confirmService
        .confirmDestroy(vm.key('clearAll'), vm.key('clear'))
        .then(function () {
          vm.addedLineItems = _.difference(vm.addedLineItems, vm.displayItems);
          vm.displayItems = [];
        });
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name validateQuantity
     *
     * @description
     * Validate line item quantity and returns self.
     *
     * @param {Object} lineItem line item to be validated.
     */
    vm.validateQuantity = function (lineItem) {
      console.log("Validating_1: ", lineItem);
      lineItem = quantityUnitCalculateService.recalculateInputQuantity(
        lineItem, lineItem.orderable.netContent, vm.showInDoses()
      );
      console.log("Validating_2: ", lineItem);
      if (
        lineItem.quantity > lineItem.$previewSOH &&
        lineItem.reason &&
        lineItem.reason.reasonType === REASON_TYPES.DEBIT) {
        lineItem.$errors.quantityInvalid = messageService.get('stockAdjustmentCreation.quantityGreaterThanStockOnHand');
      }
      else if (lineItem.quantity > MAX_INTEGER_VALUE) {
        lineItem.$errors.quantityInvalid = messageService.get('stockmanagement.numberTooLarge');
      }
      // else if (lineItem.quantity > lineItem.deliveryNoteQuantity) {
      //   lineItem.$errors.quantityInvalid = messageService.get(
      //     'stockAdjustmentCreation.acceptedQuantityError');
      // }
      else if (lineItem.quantity >= 0) {
        lineItem.$errors.quantityInvalid = false;
      }
      else {
        lineItem.$errors.quantityInvalid = messageService.get(
          vm.key('positiveInteger'));
      }
      return lineItem;
    };

    vm.validateCartonNumberRange = function (lineItem) {
      if (adjustmentType.state === "receive") {
        if (!lineItem.hasOwnProperty('totalCartonNumber') || lineItem.individualCartonNumberRange > lineItem.totalCartonNumber ||
          isEmpty(lineItem.totalCartonNumber) || lineItem.individualCartonNumberRange === 0) {

          lineItem.$errors.cartonsInvalid = messageService.get('stockAdjustmentCreation.cartonsInvalidError');
        } else if (lineItem.individualCartonNumberRange > 0 && lineItem.individualCartonNumberRange <= lineItem.totalCartonNumber && lineItem.individualCartonNumberRange >= lineItem.individualCartonNumber) {

          lineItem.$errors.cartonsInvalid = false;
          let cartonNumber = lineItem.individualCartonNumber + " to " + lineItem.individualCartonNumberRange + " of " + lineItem.totalCartonNumber;
          lineItem.cartonNumber = cartonNumber;
        }
      }
      return lineItem;
    };

    vm.validateCartonNumber = function (lineItem) {
      lineItem.individualCartonNumberRange = lineItem.individualCartonNumber;
      if (adjustmentType.state === "receive") {
        if (!lineItem.hasOwnProperty('totalCartonNumber') || lineItem.individualCartonNumber > lineItem.totalCartonNumber ||
          isEmpty(lineItem.totalCartonNumber) || lineItem.individualCartonNumber === 0) {

          lineItem.$errors.cartonsInvalid = messageService.get('stockAdjustmentCreation.cartonsInvalidError');
        } else if (lineItem.individualCartonNumber > 0 && lineItem.individualCartonNumber <= lineItem.totalCartonNumber) {

          lineItem.$errors.cartonsInvalid = false;
          let cartonNumber = lineItem.individualCartonNumber + " to " + lineItem.individualCartonNumberRange + " of " + lineItem.totalCartonNumber;
          lineItem.cartonNumber = cartonNumber;
        }
      }
      return lineItem;
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name validateAssignment
     *
     * @description
     * Validate line item assignment and returns self.
     *
     * @param {Object} lineItem line item to be validated.
     */
    vm.validateAssignment = function (lineItem) {
      if (
        adjustmentType.state !== ADJUSTMENT_TYPE.ADJUSTMENT.state &&
        adjustmentType.state !== ADJUSTMENT_TYPE.KIT_UNPACK.state
      ) {
        lineItem.$errors.assignmentInvalid = isEmpty(lineItem.assignment);
      }
      return lineItem;
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name validateReason
     *
     * @description
     * Validate line item reason and returns self.
     *
     * @param {Object} lineItem line item to be validated.
     */
    vm.validateReason = function (lineItem) {
      if (adjustmentType.state === 'adjustment') {
        lineItem.$errors.reasonInvalid = isEmpty(lineItem.reason);
      }
      return lineItem;
    };

    /**
    * @ngdoc method
    * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
    * @name fixQuantityWhenExpired
    *
    * @description
    * Set Quantity Expired As SOH if the adjustment reason = Expired
    *
    * @param {Object} lineItem line item to be validated.
    */
    vm.fixQuantityWhenExpired = function (lineItem) {
      if (adjustmentType.state === 'adjustment') {
        lineItem.$errors.reasonInvalid = isEmpty(lineItem.reason);
        if (lineItem.reason.name === 'Expired') {
          lineItem.quantity = lineItem.$previewSOH;
          lineItem.expired = true;
        }
        else {
          lineItem.quantity = undefined;
          lineItem.expired = false;
        }
      }
      return lineItem;
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name lotChanged
     *
     * @description
     * Allows inputs to add missing lot to be displayed.
     */
    function lotChanged() {
      vm.canAddNewLot =
        vm.selectedLot &&
        vm.selectedLot.lotCode ===
        messageService.get('orderableGroupService.addMissingLot');
      initiateNewLotObject();
    }

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name validateDate
     *
     * @description
     * Validate line item occurred date and returns self.
     *
     * @param {Object} lineItem line item to be validated.
     */
    vm.validateDate = function (lineItem) {
      lineItem.$errors.occurredDateInvalid = isEmpty(lineItem.occurredDate);
      return lineItem;
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name clearFreeText
     *
     * @description
     * remove free text from given object.
     *
     * @param {Object} obj      given target to be changed.
     * @param {String} property given property to be cleared.
     */
    vm.clearFreeText = function (obj, property) {
      obj[property] = null;
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name submit
     *
     * @description
     * Submit all added items.
     */
    vm.submit = function () {

      $scope.$broadcast('openlmis-form-submit');
      if (validateAllAddedItems()) {
        var confirmMessage = messageService.get(vm.key('confirmInfo'), {
          username: user.username,
          number: vm.addedLineItems.length,
        });
        confirmService
          .confirm(confirmMessage, vm.key('confirm'))
          .then(confirmSubmit);
      } else {
        vm.keyword = null;
        reorderItems();
        alertService.error('stockAdjustmentCreation.submitInvalid');
      }

    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name orderableSelectionChanged
     *
     * @description
     * Reset form status and change content inside lots drop down list.
     */
    vm.orderableSelectionChanged = function () {
      //reset selected lot, so that lot field has no default value
      vm.selectedLot = null;

      initiateNewLotObject();
      vm.canAddNewLot = false;

      //same as above
      $scope.productForm.$setUntouched();

      //make form good as new, so errors won't persist
      $scope.productForm.$setPristine();

      vm.lots = orderableGroupService.lotsOf(
        vm.selectedOrderableGroup,
        vm.hasPermissionToAddNewLot
      );
      vm.selectedOrderableHasLots = vm.lots.length > 0;

      /* eLMIS Lesotho : start */
      //Removing no lot defined because all products should have lots/batches
      const removeElement = "No batch defined";
      const index = vm.lots.findIndex(lot => lot.lotCode === removeElement);
      if (index !== -1) {
        vm.lots.splice(index, 1);
        /* eLMIS Lesotho : end */
      };
    }

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name getStatusDisplay
     *
     * @description
     * Returns VVM status display.
     *
     * @param  {String} status VVM status
     * @return {String}        VVM status display name
     */
    vm.getStatusDisplay = function (status) {
      return messageService.get(VVM_STATUS.$getDisplayName(status));
    };

    function isEmpty(value) {
      return _.isUndefined(value) || _.isNull(value);
    }

    function validateAllAddedItems() {
      _.each(vm.addedLineItems, function (item) {
        vm.validateQuantity(item);
        vm.validateDate(item);
        vm.validateAssignment(item);
        vm.validateReason(item);
        if (adjustmentType.state === 'receive' && vm.hasOwnProperty('totalCartonNumber')) {
          vm.validateCartonNumber(item);
        }
      });
      return _.chain(vm.addedLineItems)
        .groupBy(function (item) {
          return item.lot ? item.lot.id : item.orderable.id;
        })
        .values()
        .flatten()
        .all(isItemValid)
        .value();
    }

    function isItemValid(item) {
      return _.chain(item.$errors)
        .keys()
        .all(function (key) {
          return item.$errors[key] === false;
        })
        .value();
    }

    function reorderItems() {
      var sorted = $filter('orderBy')(vm.addedLineItems, [
        'orderable.productCode',
        '-occurredDate',
      ]);

      vm.displayItems = _.chain(sorted)
        .groupBy(function (item) {
          return item.lot ? item.lot.id : item.orderable.id;
        })
        .sortBy(function (group) {
          return _.every(group, function (item) {
            return !item.$errors.quantityInvalid;
          });
        })
        .flatten(true)
        .value();
    }

    function confirmSubmit() {
      loadingModalService.open();

      var addedLineItems = angular.copy(vm.addedLineItems);

      generateKitConstituentLineItem(addedLineItems);

      var lotPromises = [],
        errorLots = [];
      var distinctLots = [];
      var lotResource = new LotResource();
      addedLineItems.forEach(function (lineItem) {
        // if (adjustmentType.state === 'receive') {
        //   // facilityWithType.type.code === 'service_point' ? lineItem.quantity = lineItem.quantity :
        //   //   lineItem.quantity = lineItem.quantity * lineItem.orderable.netContent;
        // }
        if (
          lineItem.lot &&
          lineItem.$isNewItem &&
          _.isUndefined(lineItem.lot.id) &&
          !listContainsTheSameLot(distinctLots, lineItem.lot)
        ) {
          distinctLots.push(lineItem.lot);
        }
      });
      distinctLots.forEach(function (lot) {
        lotPromises.push(
          lotResource
            .create(lot)
            .then(function (createResponse) {
              vm.addedLineItems.forEach(function (item) {
                if (item.lot.lotCode === lot.lotCode) {
                  item.$isNewItem = false;
                  addItemToOrderableGroups(item);
                }
              });
              return createResponse;
            })
            .catch(function (response) {
              if (
                response.data.messageKey ===
                'referenceData.error.lot.lotCode.mustBeUnique' ||
                response.data.messageKey ===
                'referenceData.error.lot.tradeItem.required'
              ) {
                errorLots.push({
                  lotCode: lot.lotCode,
                  error:
                    response.data.messageKey ===
                      'referenceData.error.lot.lotCode.mustBeUnique'
                      ? 'stockPhysicalInventoryDraft.lotCodeMustBeUnique'
                      : 'stockPhysicalInventoryDraft.tradeItemRequuiredToAddLotCode',
                });
              }
            })
        );
      });

      return $q
        .all(lotPromises)
        .then(function (responses) {
          if (errorLots !== undefined && errorLots.length > 0) {
            return $q.reject();
          }
          responses.forEach(function (lot) {
            addedLineItems.forEach(function (lineItem) {
              if (
                lineItem.lot &&
                lineItem.lot.lotCode === lot.lotCode &&
                lineItem.lot.tradeItemId === lot.tradeItemId
              ) {
                lineItem.lot = lot;
                console.log(lineItem);
              }
            });
            return addedLineItems;
          });

          stockAdjustmentCreationService
            .submitAdjustments(
              program.id,
              facility.id,
              addedLineItems,
              adjustmentType
            )
            .then(
              function () {
                if (offlineService.isOffline()) {
                  notificationService.offline(vm.key('submittedOffline'));
                } else {
                  notificationService.success(vm.key('submitted'));
                }
                $state.go('openlmis.stockmanagement.stockCardSummaries', {
                  facility: facility.id,
                  program: program.id,
                  active: STOCKCARD_STATUS.ACTIVE,
                  supervised: $stateParams.supervised
                });
              },
              function (errorResponse) {
                loadingModalService.close();
                alertService.error(errorResponse.data.message);
              }
            );
        })
        .catch(function (errorResponse) {
          loadingModalService.close();
          if (errorLots) {
            var errorLotsReduced = errorLots.reduce(function (
              result,
              currentValue
            ) {
              if (currentValue.error in result) {
                result[currentValue.error].push(currentValue.lotCode);
              } else {
                result[currentValue.error] = [currentValue.lotCode];
              }
              return result;
            },
              {});
            for (var error in errorLotsReduced) {
              alertService.error(error, errorLotsReduced[error].join(', '));
            }
            vm.selectedOrderableGroup = undefined;
            vm.selectedLot = undefined;
            vm.lotChanged();
            return $q.reject(errorResponse.data.message);
          }
          alertService.error(errorResponse.data.message);
        });
    }

    function addItemToOrderableGroups(item) {
      vm.orderableGroups.forEach(function (array) {
        if (array[0].orderable.id === item.orderable.id) {
          array.push(angular.copy(item));
        }
      });
    }

    function listContainsTheSameLot(list, lot) {
      var itemExistsOnList = false;
      list.forEach(function (item) {
        if (
          item.lotCode === lot.lotCode &&
          item.tradeItemId === lot.tradeItemId
        ) {
          itemExistsOnList = true;
        }
      });
      return itemExistsOnList;
    }

    function generateKitConstituentLineItem(addedLineItems) {
      if (adjustmentType.state !== ADJUSTMENT_TYPE.KIT_UNPACK.state) {
        return;
      }

      //CREDIT reason ID
      var creditReason = {
        id: UNPACK_REASONS.UNPACKED_FROM_KIT_REASON_ID,
      };

      var constituentLineItems = [];

      addedLineItems.forEach(function (lineItem) {
        lineItem.orderable.children.forEach(function (constituent) {
          constituent.reason = creditReason;
          constituent.occurredDate = lineItem.occurredDate;
          constituent.quantity = lineItem.quantity * constituent.quantity;
          constituentLineItems.push(constituent);
        });
      });

      addedLineItems.push.apply(addedLineItems, constituentLineItems);
    }

    //Merging Facility Arrays
    function mergeFacilities(...arrays) {
      return arrays.reduce((acc, array) => acc.concat(array), []);
    }

    //Filter facilities so that only necessary facilities or service points are viewed when receiving and issuing
    function filterFacilities() {
      vm.srcDstAssignments = mergeFacilities(vm.srcDstAssignments, vm.suppliers);
      if (adjustmentType.state === 'receive') {
        vm.srcDstAssignments = vm.srcDstAssignments.filter(item => item.type && item.type.name !== "Unserviceable");
      }
      return vm.srcDstAssignments;
    }

    function onInit() {

      vm.srcDstAssignments = srcDstAssignments;
      vm.suppliers = suppliers;
      if (adjustmentType.state === 'receive') {
        vm.references = populateReferenceNumbers(ReferenceNumbers);
      }
      //console.log("QTY: ", QUANTITY_UNIT);
      //console.log("QTY: ", vm.quantityUnit);
      //Getting Rejection Reasons
      var rej = rejectionReasonService.getAll();
      rej.then(function (reasons) {
        reasons.content.forEach(reason => {
          // Load only those of type POD/Point of Delivery
          if (reason.rejectionReasonCategory.code == "POD") {
            vm.rejectionReasons.push(reason.name);
          }
        });
      })
        .catch(function (error) {
          // Handle errors
          console.error('Error getting reasons:', error);
        });

      var copiedOrderableGroups = angular.copy(orderableGroups);
      vm.allItems = _.flatten(copiedOrderableGroups);

      $state.current.label = messageService.get(vm.key('title'), {
        facilityCode: facility.code,
        facilityName: facility.name,
        program: program.name,
      });

      initViewModel();
      initStateParams();

      $scope.$watch(
        function () {
          return vm.addedLineItems;
        },
        function (newValue) {
          $scope.needToConfirm = newValue.length > 0;
          if (!vm.keyword) {
            vm.addedLineItems = vm.displayItems;
          }
          $stateParams.addedLineItems = vm.addedLineItems;
          $stateParams.displayItems = vm.displayItems;
          $stateParams.keyword = vm.keyword;
          $state.go($state.current.name, $stateParams, {
            reload: false,
            notify: false,
          });
        },
        true
      );
      confirmDiscardService.register(
        $scope,
        'openlmis.stockmanagement.stockCardSummaries'
      );

      $scope.$on('$stateChangeStart', function () {
        angular.element('.popover').popover('destroy');
      });
    }

    function populateReferenceNumbers(pods) {

      var referencesArray = [];
      for (var i = 0; i < pods.length; i++) {
        referencesArray.push(pods[i].referenceNumber);

      }
      return referencesArray;
    }

    function initViewModel() {
      //Set the max-date of date picker to the end of the current day.
      vm.maxDate = new Date();
      vm.maxDate.setHours(23, 59, 59, 999);

      vm.program = program;
      vm.facility = facility;
      vm.reasons = reasons;
      vm.showReasonDropdown =
        adjustmentType.state !== ADJUSTMENT_TYPE.KIT_UNPACK.state;

      /* eLMIS Lesotho : start */
      // vm.showPrepackingAttributes =
      //   adjustmentType.state === ADJUSTMENT_TYPE.PREPACK.state;
      vm.showDeliveryNoteAttributes =
        adjustmentType.state === ADJUSTMENT_TYPE.RECEIVE.state;
      vm.showReasonsInAdjustment =
        adjustmentType.state === ADJUSTMENT_TYPE.ADJUSTMENT.state;
      vm.servicePointUser =
        adjustmentType.state === ADJUSTMENT_TYPE.RECEIVE.state && (facilityWithType.type.code === "service_point");//(facility.type.code === "quarantine" || facility.type.code === "unserviceable");
      /* eLMIS Lesotho : end */

      // vm.addedLineItems = $stateParams.addedLineItems || [];
      vm.addedLineItems = [];
      $stateParams.displayItems = displayItems;
      // vm.displayItems = $stateParams.displayItems || [];
      vm.displayItems = [];
      vm.keyword = $stateParams.keyword;

      vm.orderableGroups = orderableGroups;
      vm.hasLot = false;
      vm.orderableGroups.forEach(function (group) {
        vm.hasLot =
          vm.hasLot ||
          orderableGroupService.lotsOf(group, hasPermissionToAddNewLot).length >
          0;
      });
      vm.showVVMStatusColumn = orderableGroupService.areOrderablesUseVvm(
        vm.orderableGroups
      );
      vm.hasPermissionToAddNewLot = hasPermissionToAddNewLot;
      vm.canAddNewLot = false;
      initiateNewLotObject();
    }

    function initiateNewLotObject() {
      vm.newLot = {
        active: true,
      };
    }

    function initStateParams() {
      $stateParams.page = getPageNumber();
      $stateParams.program = program;
      $stateParams.facility = facility;
      $stateParams.reasons = reasons;
      $stateParams.srcDstAssignments = srcDstAssignments;
      $stateParams.orderableGroups = orderableGroups;
    }

    function getPageNumber() {
      var totalPages = Math.ceil(
        vm.displayItems.length / parseInt($stateParams.size)
      );
      var pageNumber = parseInt($state.params.page || 0);
      if (pageNumber > totalPages - 1) {
        return totalPages > 0 ? totalPages - 1 : 0;
      }
      return pageNumber;
    }

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name editLot
     *
     * @description
     * Pops up a modal for users to edit lot for selected line item.
     *
     * @param {Object} lineItem line items to be edited.
     */
    vm.editLot = function (lineItem) {
      var oldLotCode = lineItem.lot.lotCode;
      var oldLotExpirationDate = lineItem.lot.expirationDate;
      editLotModalService
        .show(lineItem, vm.allItems, vm.addedLineItems)
        .then(function () {
          $stateParams.displayItems = vm.displayItems;
          if (
            oldLotCode === lineItem.lot.lotCode &&
            oldLotExpirationDate !== lineItem.lot.expirationDate
          ) {
            vm.addedLineItems.forEach(function (item) {
              if (
                item.lot &&
                item.lot.lotCode === oldLotCode &&
                oldLotExpirationDate === item.lot.expirationDate
              ) {
                item.lot.expirationDate = lineItem.lot.expirationDate;
              }
            });
          }
        });
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name canEditLot
     *
     * @description
     * Checks if user can edit lot.
     *
     * @param {Object} lineItem line item to edit
     */
    vm.canEditLot = function (lineItem) {
      return vm.hasPermissionToAddNewLot && lineItem.lot && lineItem.$isNewItem;
    };

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name validateExpirationDate
     *
     * @description
     * Validate if expirationDate is a future date.
     */
    function validateExpirationDate() {
      var currentDate = moment(new Date()).format('YYYY-MM-DD');

      if (vm.newLot.expirationDate && vm.newLot.expirationDate < currentDate) {
        vm.newLot.expirationDateInvalid = messageService.get(
          'stockEditLotModal.expirationDateInvalid'
        );
      }
    }

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name expirationDateChanged
     *
     * @description
     * Hides the error message if exists after changed expiration date.
     */
    function expirationDateChanged() {
      vm.newLot.expirationDateInvalid = undefined;
    }

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name formatDate
     *
     * @description
     * Format date
     */
    function formatDate(date) {
      return dateUtils.toStringDateWithDefaultFormat(date);
    }

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name newLotCodeChanged
     *
     * @description
     * Hides the error message if exists after changed new lot code.
     */
    function newLotCodeChanged() {
      vm.newLot.lotCodeInvalid = undefined;
    }

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name validateLotCode
     *
     * @description
     * Validate if on line item list exists the same orderable with the same lot code
     */
    function validateLotCode(listItems, selectedItem) {
      if (selectedItem && selectedItem.$isNewItem) {
        listItems.forEach(function (lineItem) {
          if (lineItem.orderable && lineItem.lot && selectedItem.lot &&
            lineItem.orderable.productCode === selectedItem.orderable.productCode &&
            selectedItem.lot.lotCode === lineItem.lot.lotCode &&
            ((!lineItem.$isNewItem) || (lineItem.$isNewItem &&
              selectedItem.lot.expirationDate !== lineItem.lot.expirationDate))) {
            vm.newLot.lotCodeInvalid = messageService.get('stockEditLotModal.lotCodeInvalid');
          }
        });
      }
    }

    /**
     * @ngdoc method
     * @methodOf stock-adjustment-creation.controller:StockAdjustmentCreationController
     * @name recalculateSOHQuantity
     *
     * @description
     * Recalculates the given stockOnHand to packs or doses
     *
     * @param  {number}  stockOnHand  the quantity in doses to be recalculated
     * @param  {number}  netContent   quantity of doses in one pack
     * 
     * @return {String}                the stockOnHand in Doses or Packs
     */
    function recalculateSOHQuantity(stockOnHand, netContent) {
      return quantityUnitCalculateService.recalculateSOHQuantity(stockOnHand, netContent, vm.showInDoses());
    }

    onInit();
  }
})();
