// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;
pragma abicoder v2;

import "../exchange/TransferManager.sol";
import "../exchange/OrderValidator.sol";

import "../royalties/interfaces/IRoyaltiesProvider.sol";
import "../exchange/interfaces/ITransferExecutor.sol";

contract TransferManagerTest is TransferManager, TransferExecutor, OrderValidator {

    function encode(LibOrderDataV1.DataV1 memory data) pure external returns (bytes memory) {
        return abi.encode(data);
    }

    function encodeV2(LibOrderDataV2.DataV2 memory data) pure external returns (bytes memory) {
        return abi.encode(data);
    }

    function checkDoTransfers(
        LibAsset.AssetType memory makeMatch,
        LibAsset.AssetType memory takeMatch,
        LibFill.FillResult memory fill,
        LibOrder.Order memory leftOrder,
        LibOrder.Order memory rightOrder
    ) payable external {
        doTransfers(makeMatch, takeMatch, fill, leftOrder, rightOrder, LibOrderData.parse(leftOrder), LibOrderData.parse(rightOrder));
    }

    function __TransferManager_init(
        INftTransferProxy _transferProxy,
        IERC20TransferProxy _erc20TransferProxy,
        uint newProtocolFee,
        address newCommunityWallet,
        IRoyaltiesProvider newRoyaltiesProvider
    ) external initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __TransferExecutor_init_unchained(_transferProxy, _erc20TransferProxy);
        __TransferManager_init_unchained(newProtocolFee, newCommunityWallet, newRoyaltiesProvider);
        __OrderValidator_init_unchained();
    }
}