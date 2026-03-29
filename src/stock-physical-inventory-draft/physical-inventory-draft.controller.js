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

(function () {
  "use strict";

  /**
   * @ngdoc controller
   * @name stock-physical-inventory-draft.controller:PhysicalInventoryDraftController
   *
   * @description
   * Controller for managing physical inventory draft.
   */
  angular
    .module("stock-physical-inventory-draft")
    .controller("PhysicalInventoryDraftController", controller);

  controller.$inject = [
    "$scope",
    "$state",
    "$stateParams",
    "addProductsModalService",
    "messageService",
    "physicalInventoryFactory",
    "notificationService",
    "alertService",
    "chooseDateModalService",
    "program",
    "facility",
    "draft",
    "displayLineItemsGroup",
    "confirmService",
    "physicalInventoryService",
    "MAX_INTEGER_VALUE",
    "VVM_STATUS",
    "reasons",
    "stockReasonsCalculations",
    "loadingModalService",
    "$window",
    "stockmanagementUrlFactory",
    "accessTokenFactory",
    "orderableGroupService",
    "$filter",
    "$q",
    "offlineService",
    "physicalInventoryDraftCacheService",
    "stockCardService",
    "LotResource",
    "editLotModalService",
    "dateUtils",
    "QUANTITY_UNIT",
    "quantityUnitCalculateService",
  ];

  function controller(
    $scope,
    $state,
    $stateParams,
    addProductsModalService,
    messageService,
    physicalInventoryFactory,
    notificationService,
    alertService,
    chooseDateModalService,
    program,
    facility,
    draft,
    displayLineItemsGroup,
    confirmService,
    physicalInventoryService,
    MAX_INTEGER_VALUE,
    VVM_STATUS,
    reasons,
    stockReasonsCalculations,
    loadingModalService,
    $window,
    stockmanagementUrlFactory,
    accessTokenFactory,
    orderableGroupService,
    $filter,
    $q,
    offlineService,
    physicalInventoryDraftCacheService,
    stockCardService,
    LotResource,
    editLotModalService,
    dateUtils,
    QUANTITY_UNIT,
    quantityUnitCalculateService,
  ) {
    var vm = this;
    vm.$onInit = onInit;
    vm.cacheDraft = cacheDraft;
    vm.quantityChanged = quantityChanged;
    vm.checkUnaccountedStockAdjustments = checkUnaccountedStockAdjustments;
    vm.formatDate = formatDate;
    vm.showInDoses = showInDoses;
    vm.recalculateQuantity = recalculateQuantity;
    vm.removeGroup = removeGroup;

    vm.quantityUnit = undefined;

    function showInDoses() {
      return vm.quantityUnit === QUANTITY_UNIT.DOSES;
    }

    // ---- Cyclic product selector state ----
    vm.productSelectionMode = null;
    vm.searchText = '';
    vm.searchResults = [];
    vm.isSearching = false;

    // Keep original method for backward compatibility
    vm.selectProductForCyclic = selectProductForCyclic;

    /**
     * Searches for existing products in real-time (facility's existing inventory)
     */
    vm.searchProducts = function() {
      if (!vm.searchText || vm.searchText.length < 2) {
        vm.searchResults = [];
        return;
      }
      vm.isSearching = true;
      setTimeout(function() {
        var searchLower = vm.searchText.toLowerCase();
        vm.searchResults = _.filter(vm.productsForCyclic, function(item) {
          return item.orderable.productCode.toLowerCase().indexOf(searchLower) !== -1 ||
                 item.orderable.fullProductName.toLowerCase().indexOf(searchLower) !== -1;
        });
        vm.isSearching = false;
        $scope.$apply();
      }, 300);
    };

    /**
     * Adds an existing (facility-level) product to cyclic inventory
     */
    vm.selectExistingProductForCyclic = function(productItem) {
      if (!productItem) return;

      var fullGroup = _.find(vm.displayLineItemsGroup, function(group) {
        return group[0].orderable.id === productItem.orderable.id;
      });
      if (!fullGroup) return;

      if (vm.itemsSelectedForCyclic.some(function(g) {
        return g[0].orderable.id === fullGroup[0].orderable.id;
      })) {
        alertService.error('This product is already added to the count');
        return;
      }

      vm.itemsSelectedForCyclic.push(fullGroup);

      vm.productsForCyclic = vm.productsForCyclic.filter(function(p) {
        return p.orderable.id !== fullGroup[0].orderable.id;
      });

      notificationService.success('Product added to cyclic count');

      vm.productSelectionMode = null;
      vm.selectedProductForCyclic = null;
      vm.searchText = '';
      vm.searchResults = [];

      regroupCyclicItems();
    };

    // ---- Main display binding ----
    vm.displayLineItemsGroup = displayLineItemsGroup;

    vm.updateProgress = function () {
      vm.itemsWithQuantity = _.filter(
        vm.displayLineItemsGroup,
        function (lineItems) {
          return _.every(lineItems, function (lineItem) {
            return !isEmpty(lineItem.quantity);
          });
        },
      );
    };

    vm.program = program;
    vm.facility = facility;
    vm.keyword = $stateParams.keyword;
    vm.includeInactive = $stateParams.includeInactive;
    vm.vvmStatuses = VVM_STATUS;
    vm.groupedCategories = false;
    vm.isSubmitted = $stateParams.isSubmitted;
    vm.showVVMStatusColumn = false;
    vm.productsForCyclic = [];
    vm.selectedProductForCyclic = undefined;
    vm.showHideButtonColumn = false;
    vm.offline = offlineService.isOffline;
    vm.draft = draft;
    vm.dataChanged = false;
    vm.itemsSelectedForCyclic = [];

    vm.getStatusDisplay = function (status) {
      return messageService.get(VVM_STATUS.$getDisplayName(status));
    };

    /**
     * Opens the standard "Add Products to Physical Inventory" modal.
     * Works for both Major and Cyclic — after the modal resolves the state
     * reloads and onInit re-partitions all items including newly added ones.
     */
    vm.addProducts = function () {
      var notYetAddedItems = _.chain(draft.lineItems)
        .difference(_.flatten(vm.displayLineItemsGroup))
        .value();

      var orderablesWithoutAvailableLots = draft.lineItems
        .map(function (item) {
          return item.orderable;
        })
        .filter(function (orderable) {
          return !notYetAddedItems.find(function (item) {
            return orderable.id === item.orderable.id;
          });
        })
        .filter(function (orderable, index, filtered) {
          return filtered.indexOf(orderable) === index;
        })
        .map(function (uniqueOrderable) {
          return {
            lot: null,
            orderable: uniqueOrderable,
            quantity: null,
            stockAdjustments: [],
            stockOnHand: null,
            vvmStatus: null,
            $allLotsAdded: true,
          };
        });

      orderablesWithoutAvailableLots.forEach(function (item) {
        notYetAddedItems.push(item);
      });

      addProductsModalService
        .show(notYetAddedItems, draft, vm.showInDoses())
        .then(function () {
          $stateParams.program = vm.program;
          $stateParams.facility = vm.facility;
          $stateParams.noReload = true;

          draft.$modified = true;
          vm.cacheDraft();

          $state.go($state.current.name, $stateParams, {
            reload: $state.current.name,
          });
        });
    };

    vm.editLot = function (lineItem) {
      var addedLineItems = _.flatten(draft.lineItems);
      editLotModalService.show(lineItem, addedLineItems).then(function () {
        $stateParams.draft = draft;
      });
    };

    vm.calculate = function (lineItems, field) {
      var allEmpty = _.every(lineItems, function (lineItem) {
        return isEmpty(lineItem[field]);
      });
      if (allEmpty) {
        return undefined;
      }
      var quantityInDoses = _.chain(lineItems)
        .map(function (lineItem) {
          return lineItem[field];
        })
        .compact()
        .reduce(function (memo, num) {
          return parseInt(num) + memo;
        }, 0)
        .value();
      return recalculateQuantity(
        quantityInDoses,
        lineItems[0].orderable.netContent,
      );
    };

    vm.hideLineItem = function (lineItem) {
      var itemToHide = lineItem;
      confirmService
        .confirm(
          messageService.get("stockPhysicalInventoryDraft.deactivateItem", {
            product: lineItem.orderable.fullProductName,
            lot: lineItem.displayLotMessage,
          }),
          "stockPhysicalInventoryDraft.deactivate",
        )
        .then(function () {
          loadingModalService.open();
          stockCardService
            .deactivateStockCard(lineItem.stockCardId)
            .then(function () {
              draft.lineItems.find(function (item) {
                if (item.stockCardId === itemToHide.stockCardId) {
                  return item;
                }
              }).active = false;
              vm.cacheDraft();
              $state.go($state.current.name, $stateParams, {
                reload: $state.current.name,
              });
              notificationService.success(
                "stockPhysicalInventoryDraft.deactivated",
              );
            })
            .catch(function () {
              loadingModalService.close();
            });
        });
    };

    vm.search = function () {
      $stateParams.page = 0;
      $stateParams.keyword = vm.keyword;
      $stateParams.includeInactive = vm.includeInactive;
      $stateParams.program = vm.program;
      $stateParams.facility = vm.facility;
      $stateParams.noReload = true;
      $state.go($state.current.name, $stateParams, {
        reload: $state.current.name,
      });
    };

    vm.saveDraft = function () {
      confirmService
        .confirmDestroy(
          "stockPhysicalInventoryDraft.saveDraft",
          "stockPhysicalInventoryDraft.save",
        )
        .then(function () {
          loadingModalService.open();

          var originalLineItems = draft.lineItems;
          if (vm.stateParams.physicalInventoryType === 'Cyclic') {
            draft.lineItems = draft.lineItems.filter(function(item) {
              return !item.isNewProduct;
            });
          }

          return saveLots(draft, function () {
            return physicalInventoryFactory.saveDraft(draft).then(
              function () {
                notificationService.success(
                  "stockPhysicalInventoryDraft.saved",
                );
                draft.$modified = undefined;
                draft.lineItems = originalLineItems;
                var hasNewProducts = vm.itemsSelectedForCyclic.some(function(g) {
                  return g[0].isNewProduct;
                });
                if (!hasNewProducts) {
                  vm.cacheDraft();
                }
                $stateParams.isAddProduct = false;
                $stateParams.program = vm.program;
                $stateParams.facility = vm.facility;
                draft.lineItems.forEach(function (lineItem) {
                  if (lineItem.$isNewItem) {
                    lineItem.$isNewItem = false;
                  }
                });
                $stateParams.noReload = true;
                $state.go($state.current.name, $stateParams, {
                  reload: $state.current.name,
                });
              },
              function (errorResponse) {
                draft.lineItems = originalLineItems;
                loadingModalService.close();
                alertService.error(errorResponse.data.message);
              },
            );
          });
        });
    };

    vm.canEditLot = function (lineItem) {
      return lineItem.lot && lineItem.$isNewItem;
    };

    vm.saveOnPageChange = function () {
      var params = {};
      params.noReload = true;
      params.isSubmitted = vm.isSubmitted;
      return $q.resolve(params);
    };

    vm.validateOnPageChange = function () {
      if ($stateParams.isSubmitted === true) {
        validate();
        $scope.$broadcast("openlmis-form-submit");
      }
    };

    vm.delete = function () {
      confirmService
        .confirmDestroy(
          "stockPhysicalInventoryDraft.deleteDraft",
          "stockPhysicalInventoryDraft.delete",
        )
        .then(function () {
          loadingModalService.open();
          physicalInventoryService
            .deleteDraft(draft.id)
            .then(function () {
              $state.go(
                "openlmis.stockmanagement.physicalInventory",
                $stateParams,
                { reload: true },
              );
            })
            .catch(function () {
              loadingModalService.close();
            });
        });
    };

    vm.submit = function () {
      vm.isSubmitted = true;
      var error;
      if (vm.stateParams.physicalInventoryType === "Cyclic") {
        error = validateCyclic();
      } else if (vm.stateParams.physicalInventoryType === "Major") {
        error = validate();
      }

      if (error) {
        $scope.$broadcast("openlmis-form-submit");
        alertService.error(error);
      } else {
        chooseDateModalService.show().then(function (resolvedData) {
          loadingModalService.open();
          draft.occurredDate = resolvedData.occurredDate;
          draft.signature = resolvedData.signature;

          var originalLineItems = draft.lineItems;
          if (vm.stateParams.physicalInventoryType === 'Cyclic') {
            draft.lineItems = draft.lineItems.filter(function(item) {
              return !item.isNewProduct;
            });
          }

          return saveLots(draft, function () {
            physicalInventoryService
              .submitPhysicalInventory(
                draft,
                vm.stateParams.physicalInventoryType,
              )
              .then(
                function () {
                  notificationService.success(
                    "stockPhysicalInventoryDraft.submitted",
                  );
                  confirmService
                    .confirm(
                      "stockPhysicalInventoryDraft.printModal.label",
                      "stockPhysicalInventoryDraft.printModal.yes",
                      "stockPhysicalInventoryDraft.printModal.no",
                    )
                    .then(function () {
                      $window.open(
                        accessTokenFactory.addAccessToken(getPrintUrl(draft.id)),
                        "_blank",
                      );
                    })
                    .finally(function () {
                      $state.go("openlmis.stockmanagement.stockCardSummaries", {
                        program: program.id,
                        facility: draft.facilityId,
                        includeInactive: false,
                        supervised: $stateParams.supervised
                      });
                    });
                },
                function (errorResponse) {
                  draft.lineItems = originalLineItems;
                  loadingModalService.close();
                  alertService.error(errorResponse.data.message);
                  physicalInventoryDraftCacheService.removeById(draft.id);
                },
              );
          });
        });
      }
    };

    function saveLots(draft, submitMethod) {
      var lotPromises = [],
        lotResource = new LotResource(),
        errorLots = [];

      draft.lineItems.forEach(function (lineItem) {
        if (lineItem.lot && lineItem.$isNewItem && !lineItem.lot.id) {
          lotPromises.push(
            lotResource
              .create(lineItem.lot)
              .then(function (createResponse) {
                lineItem.$isNewItem = false;
                return createResponse;
              })
              .catch(function (response) {
                if (
                  response.data.messageKey ===
                    "referenceData.error.lot.lotCode.mustBeUnique" ||
                  response.data.messageKey ===
                    "referenceData.error.lot.tradeItem.required"
                ) {
                  errorLots.push({
                    lotCode: lineItem.lot.lotCode,
                    error:
                      response.data.messageKey ===
                      "referenceData.error.lot.lotCode.mustBeUnique"
                        ? "stockPhysicalInventoryDraft.lotCodeMustBeUnique"
                        : "stockPhysicalInventoryDraft.tradeItemRequuiredToAddLotCode",
                  });
                }
              }),
          );
        }
      });

      return $q
        .all(lotPromises)
        .then(function (responses) {
          if (errorLots !== undefined && errorLots.length > 0) {
            return $q.reject();
          }
          responses.forEach(function (lot) {
            draft.lineItems.forEach(function (lineItem) {
              if (
                lineItem.lot &&
                lineItem.lot.lotCode === lot.lotCode &&
                lineItem.orderable.identifiers["tradeItem"] === lot.tradeItemId
              ) {
                lineItem.lot = lot;
              }
            });
            return draft.lineItems;
          });
          return submitMethod();
        })
        .catch(function (errorResponse) {
          loadingModalService.close();
          if (errorLots) {
            var errorLotsReduced = errorLots.reduce(function (result, currentValue) {
              if (currentValue.error in result) {
                result[currentValue.error].push(currentValue.lotCode);
              } else {
                result[currentValue.error] = [currentValue.lotCode];
              }
              return result;
            }, {});
            for (var error in errorLotsReduced) {
              alertService.error(error, errorLotsReduced[error].join(", "));
            }
            return $q.reject(errorResponse.data.message);
          }
          alertService.error(errorResponse.data.message);
        });
    }

    vm.validateQuantity = function (lineItem) {
      if (lineItem.quantity > MAX_INTEGER_VALUE) {
        lineItem.quantityInvalid = messageService.get(
          "stockmanagement.numberTooLarge",
        );
      } else if (isEmpty(lineItem.quantity)) {
        lineItem.quantityInvalid = messageService.get(
          "stockPhysicalInventoryDraft.required",
        );
      } else {
        lineItem.quantityInvalid = false;
      }
      return lineItem.quantityInvalid;
    };

    vm.validateUnaccountedQuantity = function (lineItem) {
      if (lineItem.unaccountedQuantity === 0) {
        lineItem.unaccountedQuantityInvalid = false;
      } else {
        lineItem.unaccountedQuantityInvalid = messageService.get(
          "stockPhysicalInventoryDraft.unaccountedQuantityError",
        );
      }
      return lineItem.unaccountedQuantityInvalid;
    };

    function isEmpty(value) {
      return value === "" || value === undefined || value === null;
    }

    function validate() {
      var qtyError = false;
      var activeError = false;
      _.chain(displayLineItemsGroup)
        .flatten()
        .each(function (item) {
          if (!item.active && item.stockOnHand === 0) {
            activeError = "stockPhysicalInventoryDraft.submitInvalidActive";
          } else if (
            vm.validateQuantity(item) ||
            vm.validateUnaccountedQuantity(item)
          ) {
            qtyError = "stockPhysicalInventoryDraft.submitInvalid";
          }
        });
      return activeError || qtyError;
    }

    function validateCyclic() {
      var errorMessage = false;
      displayLineItemsGroup.forEach(function (group) {
        vm.itemsSelectedForCyclic.forEach(function (selectedItem) {
          if (
            selectedItem[0].orderable.fullProductName ===
            group[0].orderable.fullProductName
          ) {
            for (var i = 0; i < group.length; i++) {
              var item = group[i];
              if (!item.active) {
                errorMessage = "stockPhysicalInventoryDraft.submitInvalidActive";
                break;
              } else if (
                vm.validateQuantity(item) ||
                vm.validateUnaccountedQuantity(item)
              ) {
                errorMessage = "stockPhysicalInventoryDraft.submitInvalid";
                break;
              }
            }
          }
        });
      });
      return errorMessage;
    }

    function hasValidQuantity(obj) {
      return (
        obj &&
        Object.prototype.hasOwnProperty.call(obj, "quantity") &&
        obj.quantity !== null &&
        obj.quantity !== undefined
      );
    }

    function onInit() {
      $state.current.label = messageService.get(
        "stockPhysicalInventoryDraft.title",
        {
          facilityCode: facility.code,
          facilityName: facility.name,
          program: program.name,
        },
      );
      vm.reasons = reasons;
      vm.stateParams = $stateParams;
      $stateParams.program = undefined;
      $stateParams.facility = undefined;

      // Partition displayLineItemsGroup into selected-for-count vs available-to-select.
      //
      // A group belongs in itemsSelectedForCyclic when ANY of the following is true:
      //   1. It has a real counted quantity (user already entered a number)
      //   2. It has a non-null stockOnHand (it exists on a stock card at this facility)
      //   3. It was flagged isAdded=true by the route resolver — this is the key fix:
      //      products just added via the "Add from Catalogue" modal have quantity=null
      //      and stockOnHand=null but ARE marked isAdded=true, so they must appear in
      //      the table immediately without requiring the user to re-select them.
      //
      if (vm.stateParams.physicalInventoryType === 'Cyclic') {
        displayLineItemsGroup.forEach(function (group) {
          var firstItem = group[0];
          var hasQty      = hasValidQuantity(firstItem);
          var hasSoh      = firstItem.stockOnHand !== null && firstItem.stockOnHand !== undefined;
          var wasAdded    = firstItem.isAdded === true;   // <-- THE FIX

          if (hasQty || hasSoh || wasAdded) {
            vm.itemsSelectedForCyclic.push(group);
          } else {
            vm.productsForCyclic.push(firstItem);
          }
        });
        if (vm.itemsSelectedForCyclic.length > 0) {
          regroupCyclicItems();
        }
      }

      vm.hasLot = _.any(draft.lineItems, function (item) {
        return item.lot;
      });

      draft.lineItems.forEach(function (item) {
        item = quantityUnitCalculateService.recalculateInputQuantity(
          item,
          item.orderable.netContent,
          true,
        );
        item.unaccountedQuantity =
          stockReasonsCalculations.calculateUnaccounted(
            item,
            item.stockAdjustments,
          );
      });

      if (vm.stateParams.physicalInventoryType === "Major") {
        vm.updateProgress();
        var orderableGroups = orderableGroupService.groupByOrderableId(
          draft.lineItems,
        );
        vm.showVVMStatusColumn =
          orderableGroupService.areOrderablesUseVvm(orderableGroups);
        shouldDisplayHideButtonColumn(draft.lineItems);
        $scope.$watchCollection(
          function () {
            return vm.pagedLineItems;
          },
          function (newList) {
            vm.groupedCategories = $filter("groupByProgramProductCategory")(
              newList,
              vm.program.id,
            );
          },
          true,
        );
        if (!$stateParams.noReload) {
          vm.cacheDraft();
        }
      }
    }

    function checkUnaccountedStockAdjustments(lineItem) {
      lineItem.unaccountedQuantity =
        stockReasonsCalculations.calculateUnaccounted(
          lineItem,
          lineItem.stockAdjustments,
        );
      if (!lineItem.isNewProduct) {
        draft.$modified = true;
        vm.cacheDraft();
      }
    }

    function quantityChanged(lineItem) {
      vm.updateProgress();
      vm.validateQuantity(lineItem);
      vm.checkUnaccountedStockAdjustments(lineItem);
      vm.dataChanged = !vm.dataChanged;
    }

    function getPrintUrl(id) {
      return stockmanagementUrlFactory(
        "/api/physicalInventories/" + id + "?format=pdf",
      );
    }

    function cacheDraft() {
      physicalInventoryDraftCacheService.cacheDraft(draft);
    }

    function shouldDisplayHideButtonColumn(lineItems) {
      lineItems.forEach(function (item) {
        if (item.active && item.stockOnHand === 0 && !item.$isNewItem) {
          vm.showHideButtonColumn = true;
        }
      });
    }

    function formatDate(date) {
      return dateUtils.toStringDateWithDefaultFormat(date);
    }

    function recalculateQuantity(quantity, netContent) {
      return quantityUnitCalculateService.recalculateSOHQuantity(
        quantity,
        netContent,
        vm.showInDoses(),
      );
    }

    function selectProductForCyclic() {
      const productId = vm.selectedProductForCyclic.orderable.id;
      const productName = vm.selectedProductForCyclic.orderable.fullProductName;
      displayLineItemsGroup.forEach((group) => {
        if (group[0].orderable.fullProductName === productName) {
          if (
            !vm.itemsSelectedForCyclic.some(
              (value) => value[0].orderable.id === productId,
            )
          ) {
            vm.itemsSelectedForCyclic.push(group);
          }
        }
      });
      vm.groupedCategories = $filter("groupByProgramProductCategory")(
        vm.itemsSelectedForCyclic,
        vm.program.id,
      );
    }

    function regroupCyclicItems() {
      var realItems = vm.itemsSelectedForCyclic.filter(function(g) {
        return !g[0].isNewProduct;
      });
      var newItems = vm.itemsSelectedForCyclic.filter(function(g) {
        return g[0].isNewProduct;
      });
      var grouped = realItems.length > 0
        ? $filter("groupByProgramProductCategory")(realItems, vm.program.id)
        : {};
      if (newItems.length > 0) {
        grouped['New Products'] = newItems;
      }
      vm.groupedCategories = grouped;
    }

    function removeGroup(group) {
      var productName = group[0].orderable.fullProductName;
      confirmService.confirm(
        messageService.get("stockPhysicalInventoryDraft.confirmRemove", {
          productName: productName
        }),
        'Confirm Removal'
      ).then(function() {
        group.forEach(function(batch) {
          batch.quantity = null;
          batch.quantityInPacks = NaN;
          batch.quantityRemainderInDoses = NaN;
          batch.stockAdjustments = [];
        });
        var index = vm.itemsSelectedForCyclic.indexOf(group);
        if (index !== -1) {
          vm.itemsSelectedForCyclic.splice(index, 1);
          if (!group[0].isNewProduct) {
            vm.productsForCyclic.push(group[0]);
            vm.productsForCyclic.sort(function(a, b) {
              return a.orderable.fullProductName.localeCompare(b.orderable.fullProductName);
            });
          }
          notificationService.success(messageService.get("stockPhysicalInventoryDraft.productRemoved", {
            productName: productName
          }));
        }
        regroupCyclicItems();
      });
    }

    vm.toggleProductSelectionMode = function(mode) {
      if (vm.productSelectionMode === mode) {
        vm.productSelectionMode = null;
      } else {
        vm.productSelectionMode = mode;
        vm.selectedProductForCyclic = null;
        vm.searchResults = [];
        vm.searchText = '';
      }
    };

    vm.validateOnPageChange();
  }

})();