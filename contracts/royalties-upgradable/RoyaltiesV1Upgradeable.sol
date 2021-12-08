// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2 <0.8.0;

import "@openzeppelin/contracts-upgradeable/introspection/ERC165Upgradeable.sol";
import "../royalties/lib/LibRoyaltiesV1.sol";
import "../royalties/RoyaltiesV1.sol";

abstract contract RoyaltiesV1Upgradeable is ERC165Upgradeable, RoyaltiesV1 {
    function __RoyaltiesV1Upgradeable_init_unchained() internal initializer {
        _registerInterface(LibRoyaltiesV1._INTERFACE_ID_FEES);
    }
}
