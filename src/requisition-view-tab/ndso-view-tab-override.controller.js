(function () {
  'use strict';

  angular.module('requisition-view-tab').controller('ViewTabController', ViewTabController);

  ViewTabController.$inject = [
    '$filter',
    '$state',
    'selectProductsModalService',
    'requisitionValidator',
    'requisition',
    'columns',
    'messageService',
    'lineItems',
    'alertService',
    'canSubmit',
    'canAuthorize',
    'fullSupply',
    'TEMPLATE_COLUMNS',
    '$q',
    'OpenlmisArrayDecorator',
    'canApproveAndReject',
    'items',
    'paginationService',
    '$stateParams',
    'requisitionCacheService',
    'canUnskipRequisitionItemWhenApproving',
    'program',
    'TB_MONTHLY_PROGRAM',
    'homeFacility',
    '$scope'
  ];

  function ViewTabController(
    $filter,
    $state,
    selectProductsModalService,
    requisitionValidator,
    requisition,
    columns,
    messageService,
    lineItems,
    alertService,
    canSubmit,
    canAuthorize,
    fullSupply,
    TEMPLATE_COLUMNS,
    $q,
    OpenlmisArrayDecorator,
    canApproveAndReject,
    items,
    paginationService,
    $stateParams,
    requisitionCacheService,
    canUnskipRequisitionItemWhenApproving,
    program,
    TB_MONTHLY_PROGRAM,
    homeFacility,
    $scope
  ) {
    var vm = this;

    vm.$onInit = onInit;
    vm.deleteLineItem = deleteLineItem;
    vm.addFullSupplyProducts = addFullSupplyProducts;
    vm.addNonFullSupplyProducts = addNonFullSupplyProducts;
    vm.unskipFullSupplyProducts = unskipFullSupplyProducts;
    vm.showDeleteColumn = showDeleteColumn;
    vm.skipCurrentPageFullSupplyLineItems = skipCurrentPageFullSupplyLineItems;
    vm.isLineItemValid = requisitionValidator.isLineItemValid;
    vm.getDescriptionForColumn = getDescriptionForColumn;
    vm.skippedFullSupplyProductCountMessage = skippedFullSupplyProductCountMessage;
    vm.cacheRequisition = cacheRequisition;
    vm.userCanEditColumn = userCanEditColumn;
    vm.monthlyTBColumns = TEMPLATE_COLUMNS.getTbMonthlyColumns();
    vm.disabledRequisitionEdit = disabledRequisitionEdit;
    vm.search = search;

    vm.lineItems = undefined;
    vm.searchKeyword = undefined;
    vm.items = undefined;
    vm.requisition = undefined;
    vm.showAddFullSupplyProductsButton = undefined;
    vm.showAddNonFullSupplyProductsButton = undefined;
    vm.showUnskipFullSupplyProductsButton = undefined;
    vm.showAddFullSupplyProductControls = undefined;
    vm.columns = undefined;
    vm.orderableFilterProperties = {
      name: ''
    };
    vm.filteredItems = undefined;
    vm.showSkippedLineItems = true;
    vm.fullSupply = undefined;
    vm.program = undefined;

    function onInit() {
      angular.forEach(columns, function (column) {
        angular.forEach(lineItems, function (lineItem) {
          lineItem.updateFieldValue(column, requisition);
        });
      });

      vm.lineItems = getVisibleLineItems(lineItems);
      vm.items = getVisibleLineItems(items);
      vm.filteredItems = vm.lineItems;
      vm.requisition = requisition;
      vm.homeFacility = homeFacility;
      vm.columns = columns;
      vm.program = program;
      vm.userCanEdit = canAuthorize || canSubmit || canUnskipRequisitionItemWhenApproving;
      vm.showAddFullSupplyProductsButton = showAddFullSupplyProductsButton();
      vm.showAddNonFullSupplyProductsButton = showAddNonFullSupplyProductsButton();
      vm.showUnskipFullSupplyProductsButton = showUnskipFullSupplyProductsButton();
      vm.showSkipControls = showSkipControls();
      vm.showOrderableFilter = showOrderableFilter();
      vm.noProductsMessage = getNoProductsMessage();
      vm.canApproveAndReject = canApproveAndReject;
      vm.paginationId = fullSupply ? 'fullSupplyList' : 'nonFullSupplyList';
      vm.requisition = disabledRequisitionEdit();
      registerSkippedItemsWatcher();
    }

    function registerSkippedItemsWatcher() {
      $scope.$watchCollection(function () {
        return vm.items ? vm.items.map(function (item) {
          return item.skipped;
        }) : [];
      }, function (newValues, oldValues) {
        if (!angular.equals(newValues, oldValues) && !vm.showSkippedLineItems) {
          for (var i = 0; i < newValues.length; i++) {
            if (newValues[i] !== oldValues[i]) {
              vm.filterByOrderableParams();
              break;
            }
          }
        }
      });
    }

    function search() {
      $stateParams.searchKeyword = vm.searchKeyword;
      $state.go('openlmis.requisitions.requisition.fullSupply', $stateParams, {
        reload: true
      });
    }

    function disabledRequisitionEdit() {
      vm.requisition = requisition;
/*
      if (vm.homeFacility.type.name === 'Warehouse') {
        vm.requisition.requisitionLineItems.forEach(function (lineItem) {
          lineItem.skipped = true;
        });
        return vm.requisition;
      }
*/
      vm.requisition.requisitionLineItems.forEach(function (lineItem) {
        if (isCentralStoreApprovalView()) {
          if (lineItem.requestedQuantity > 0) {
            lineItem.skipped = '';
          }
          return;
        }

        if (lineItem.requestedQuantity > 0) {
          lineItem.skipped = '';
        }
      });

      return vm.requisition;
    }


    function isCentralStoreApprovalView() {
      return !!(
        canApproveAndReject &&
        requisition.status === 'IN_APPROVAL' &&
        !requisition.emergency
      );
    }

    function shouldHideLineItem(lineItem) {
      return isCentralStoreApprovalView() && (lineItem.skipped === true || !(lineItem.requestedQuantity > 0));
    }

    function getVisibleLineItems(sourceItems) {
      if (!sourceItems) {
        return sourceItems;
      }

      return sourceItems.filter(function (lineItem) {
        return !shouldHideLineItem(lineItem);
      });
    }

    function deleteLineItem(lineItem) {
      vm.requisition.deleteLineItem(lineItem);
      refreshLineItems();
    }

    function showDeleteColumn() {
      return !fullSupply && vm.userCanEdit && hasDeletableLineItems();
    }

    function cacheRequisition() {
      requisitionCacheService.cacheRequisition(vm.requisition);
      return $q.resolve();
    }

    function getDescriptionForColumn(column) {
      if (requisition.template.populateStockOnHandFromStockCards &&
          column.name === TEMPLATE_COLUMNS.TOTAL_LOSSES_AND_ADJUSTMENTS) {
        return column.definition + ' ' +
          messageService.get('requisitionViewTab.totalLossesAndAdjustment.disabled');
      }

      return column.definition;
    }

    function addFullSupplyProducts() {
      addProducts(vm.requisition.getAvailableFullSupplyProducts());
    }

    function addNonFullSupplyProducts() {
      addProducts(vm.requisition.getAvailableNonFullSupplyProducts());
    }

    function unskipFullSupplyProducts() {
      selectProducts({
        products: vm.requisition.getSkippedFullSupplyProducts()
      }).then(function (selectedProducts) {
        vm.requisition.unskipFullSupplyProducts(selectedProducts);
        refreshLineItems();
      });
    }

    function skippedFullSupplyProductCountMessage() {
      return messageService.get('requisitionViewTab.fullSupplyProductsSkipped', {
        skippedProductCount: getCountOfSkippedFullSupplyProducts()
      });
    }

    function addProducts(availableProducts) {
      selectProducts({
        products: availableProducts
      }).then(function (selectedProducts) {
        vm.requisition.addLineItems(selectedProducts);
        refreshLineItems();
      });
    }

    function selectProducts(availableProducts) {
      refreshLineItems();
      var decoratedAvailableProducts = new OpenlmisArrayDecorator(availableProducts.products);
      decoratedAvailableProducts.sortBy('fullProductName');

      if (!availableProducts.products.length) {
        alertService.error(
          'requisitionViewTab.noProductsToAdd.label',
          'requisitionViewTab.noProductsToAdd.message'
        );
        return $q.reject();
      }

      return selectProductsModalService.show({
        products: decoratedAvailableProducts
      });
    }

    function refreshLineItems() {
      var filterObject = fullSupply &&
        vm.requisition.template.hasSkipColumn() &&
        vm.requisition.template.hideSkippedLineItems() ? {
          skipped: '!true',
          $program: {
            fullSupply: fullSupply
          }
        } : {
          $program: {
            fullSupply: fullSupply
          }
        };

      var refreshedLineItems = getVisibleLineItems(
        $filter('filter')(vm.requisition.requisitionLineItems, filterObject)
      );

      paginationService.registerList(
        requisitionValidator.isLineItemValid,
        $stateParams,
        function () {
          return refreshedLineItems;
        }
      ).then(function (pagedItems) {
        vm.lineItems = refreshedLineItems;
        vm.items = getVisibleLineItems(pagedItems);
      });
    }

    function showOrderableFilter() {
      return vm.userCanEdit && fullSupply;
    }

    function showSkipControls() {
      return vm.userCanEdit && fullSupply && !requisition.emergency && requisition.template.hasSkipColumn();
    }

    function showAddFullSupplyProductsButton() {
      return vm.userCanEdit && fullSupply && requisition.emergency;
    }

    function showAddNonFullSupplyProductsButton() {
      return vm.userCanEdit && !fullSupply;
    }

    function showUnskipFullSupplyProductsButton() {
      return vm.userCanEdit && fullSupply && !requisition.emergency &&
        requisition.template.hideSkippedLineItems();
    }

    function hasDeletableLineItems() {
      var hasDeletableLineItems = false;

      vm.requisition.requisitionLineItems.forEach(function (lineItem) {
        hasDeletableLineItems = hasDeletableLineItems || lineItem.$deletable;
      });

      return hasDeletableLineItems;
    }

    function isSkippedFullSupply(item) {
      return item.skipped === true && item.$program.fullSupply === true;
    }

    function getCountOfSkippedFullSupplyProducts() {
      return vm.requisition.requisitionLineItems.filter(isSkippedFullSupply).length;
    }

    function getNoProductsMessage() {
      return fullSupply ? 'requisitionViewTab.noFullSupplyProducts' :
        'requisitionViewTab.noNonFullSupplyProducts';
    }

    function skipCurrentPageFullSupplyLineItems() {
      vm.items.forEach(function (lineItem) {
        if (lineItem.canBeSkipped(requisition)) {
          lineItem.skipped = true;
        }
      });

      vm.filterByOrderableParams();
    }

    function userCanEditColumn(column) {
      if (program.name === TB_MONTHLY_PROGRAM && vm.monthlyTBColumns.includes(column.name)) {
        return vm.canApproveAndReject;
      }

      return vm.userCanEdit;
    }

    function orderableHasMatchingName(orderableName, filterValue) {
      return orderableName.toLowerCase().includes(filterValue.toLowerCase());
    }

    function getFilteredLineItems() {
      return getVisibleLineItems(vm.lineItems).filter(function (item) {
        return orderableHasMatchingName(item.orderable.fullProductName, vm.orderableFilterProperties.name) &&
          (vm.showSkippedLineItems ? true : !item.skipped);
      });
    }

    vm.filterByOrderableParams = function () {
      vm.filteredItems = getFilteredLineItems();
    };

    vm.skipAllFullSupplyLineItems = function () {
      vm.requisition.skipAllFullSupplyLineItems();
      vm.filterByOrderableParams();
    };

    vm.unskipAllFullSupplyLineItems = function () {
      vm.requisition.unskipAllFullSupplyLineItems();
      vm.filterByOrderableParams();
    };
  }
})();
