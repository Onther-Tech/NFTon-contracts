
   
// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;
pragma abicoder v2;

import "./TransferExecutor.sol";
import "./interfaces/ITransferManager.sol";

import "./lib/LibFill.sol";
import "./lib/LibOrder.sol";
import "./lib/LibTransfer.sol";

import "./OrderValidator.sol";
import "./AssetMatcher.sol";

abstract contract ExchangeCore is Initializable, OwnableUpgradeable, AssetMatcher, TransferExecutor, OrderValidator, ITransferManager {
    using SafeMathUpgradeable for uint;
    using LibTransfer for address;

    uint256 private constant UINT256_MAX = 2 ** 256 - 1;

    //state of the orders
    mapping(bytes32 => uint) public fills;

    //events
    event Cancel(bytes32 hash, address maker, LibAsset.AssetType makeAssetType, LibAsset.AssetType takeAssetType);
    event Match(bytes32 leftHash, bytes32 rightHash, address leftMaker, address rightMaker, uint newLeftFill, uint newRightFill, LibAsset.AssetType leftAsset, LibAsset.AssetType rightAsset);

    function cancel(LibOrder.Order memory order) external {
        require(_msgSender() == order.maker, "not a maker");
        require(order.salt != 0, "0 salt can't be used");
        bytes32 orderKeyHash = LibOrder.hashKey(order);
        fills[orderKeyHash] = UINT256_MAX;
        emit Cancel(orderKeyHash, order.maker, order.makeAsset.assetType, order.takeAsset.assetType);
    }

    /*function matchOrdersWrapper(
        address leftMaker,
        bytes4 leftAssetClass,
        bytes memory leftAssetData,
        uint leftAssetValue,
        uint leftSalt,
        uint leftStart,
        uint leftEnd,
        bytes4 leftDataType,
        bytes memory leftData,
        bytes memory signatureLeft,
        address rightMaker,
        bytes4 rightAssetClass,
        bytes memory rightAssetData,
        uint rightAssetValue,
        uint rightSalt,
        uint rightStart,
        uint rightEnd,
        bytes4 rightDataType,
        bytes memory rightData,
        bytes memory signatureRight
    ) external payable {
        LibOrder.Order memory left = LibOrder.Order(
            leftMaker,
            LibAsset.Asset(LibAsset.AssetType(leftAssetClass, leftAssetData), leftAssetValue),
            rightMaker,
            LibAsset.Asset(LibAsset.AssetType(rightAssetClass, rightAssetData), rightAssetValue),
            leftSalt,
            leftStart,
            leftEnd,
            leftDataType,
            leftData
        );

        LibOrder.Order memory right = LibOrder.Order(
            rightMaker,
            LibAsset.Asset(LibAsset.AssetType(rightAssetClass, rightAssetData), rightAssetValue),
            rightMaker,
            LibAsset.Asset(LibAsset.AssetType(leftAssetClass, leftAssetData), leftAssetValue),
            leftSalt,
            leftStart,
            leftEnd,
            leftDataType,
            leftData
        );
        matchOrders(left, signatureLeft, right, signatureRight);
    }*/

    function matchOrders(
        LibOrder.Order memory orderLeft,
        bytes memory signatureLeft,
        LibOrder.Order memory orderRight,
        bytes memory signatureRight
    ) public payable {
        validateFull(orderLeft, signatureLeft);
        validateFull(orderRight, signatureRight);
        if (orderLeft.taker != address(0)) {
            require(orderRight.maker == orderLeft.taker, "leftOrder.taker verification failed");
        }
        if (orderRight.taker != address(0)) {
            require(orderRight.taker == orderLeft.maker, "rightOrder.taker verification failed");
        }
        matchAndTransfer(orderLeft, orderRight);
    }

    function matchAndTransfer(LibOrder.Order memory orderLeft, LibOrder.Order memory orderRight) internal {
        LibOrder.MatchedAssets memory matchedAssets = matchAssets(orderLeft, orderRight);
        bytes32 leftOrderKeyHash = LibOrder.hashKey(orderLeft);
        bytes32 rightOrderKeyHash = LibOrder.hashKey(orderRight);

        LibOrderDataV2.DataV2 memory leftOrderData = LibOrderData.parse(orderLeft);
        LibOrderDataV2.DataV2 memory rightOrderData = LibOrderData.parse(orderRight);

        LibFill.FillResult memory newFill = getFillSetNew(orderLeft, orderRight, leftOrderKeyHash, rightOrderKeyHash, leftOrderData, rightOrderData);

        (uint totalMakeValue, uint totalTakeValue) = doTransfers(matchedAssets, newFill, orderLeft, orderRight, leftOrderData, rightOrderData);
        if (matchedAssets.makeMatch.assetClass == LibAsset.ETH_ASSET_CLASS) {
            require(matchedAssets.takeMatch.assetClass != LibAsset.ETH_ASSET_CLASS);
            require(msg.value >= totalMakeValue, "not enough eth");
            if (msg.value > totalMakeValue) {
                address(msg.sender).transferEth(msg.value.sub(totalMakeValue));
            }
        } else if (matchedAssets.takeMatch.assetClass == LibAsset.ETH_ASSET_CLASS) {
            require(msg.value >= totalTakeValue, "not enough eth");
            if (msg.value > totalTakeValue) {
                address(msg.sender).transferEth(msg.value.sub(totalTakeValue));
            }
        }
        emit Match(leftOrderKeyHash, rightOrderKeyHash, orderLeft.maker, orderRight.maker, newFill.rightValue, newFill.leftValue, matchedAssets.makeMatch, matchedAssets.takeMatch);
    }

    function getFillSetNew(
        LibOrder.Order memory orderLeft,
        LibOrder.Order memory orderRight,
        bytes32 leftOrderKeyHash,
        bytes32 rightOrderKeyHash,
        LibOrderDataV2.DataV2 memory leftOrderData,
        LibOrderDataV2.DataV2 memory rightOrderData
    ) internal returns (LibFill.FillResult memory) {
        uint leftOrderFill = getOrderFill(orderLeft, leftOrderKeyHash);
        uint rightOrderFill = getOrderFill(orderRight, rightOrderKeyHash);
        LibFill.FillResult memory newFill = LibFill.fillOrder(orderLeft, orderRight, leftOrderFill, rightOrderFill, leftOrderData.isMakeFill, rightOrderData.isMakeFill);

        require(newFill.rightValue > 0 && newFill.leftValue > 0, "nothing to fill");

        if (orderLeft.salt != 0) {
            if (leftOrderData.isMakeFill) {
                fills[leftOrderKeyHash] = leftOrderFill.add(newFill.leftValue);
            } else {
                fills[leftOrderKeyHash] = leftOrderFill.add(newFill.rightValue);
            }
        }

        if (orderRight.salt != 0) {
            if (rightOrderData.isMakeFill) {
                fills[rightOrderKeyHash] = rightOrderFill.add(newFill.rightValue);
            } else {
                fills[rightOrderKeyHash] = rightOrderFill.add(newFill.leftValue);
            }
        }
        return newFill;
    }

    function getOrderFill(LibOrder.Order memory order, bytes32 hash) internal view returns (uint fill) {
        if (order.salt == 0) {
            fill = 0;
        } else {
            fill = fills[hash];
        }
    }

    function matchAssets(LibOrder.Order memory orderLeft, LibOrder.Order memory orderRight) internal view returns (LibOrder.MatchedAssets memory matchedAssets) {
        matchedAssets.makeMatch = matchAssets(orderLeft.makeAsset.assetType, orderRight.takeAsset.assetType);
        require(matchedAssets.makeMatch.assetClass != 0, "assets don't match");
        matchedAssets.takeMatch = matchAssets(orderLeft.takeAsset.assetType, orderRight.makeAsset.assetType);
        require(matchedAssets.takeMatch.assetClass != 0, "assets don't match");
    }

    function validateFull(LibOrder.Order memory order, bytes memory signature) internal view {
        LibOrder.validate(order);
        validate(order, signature);
    }

    uint256[49] private __gap;
}