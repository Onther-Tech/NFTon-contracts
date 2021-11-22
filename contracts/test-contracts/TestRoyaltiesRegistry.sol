// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;
pragma abicoder v2;

import "../royalties/interfaces/IRoyaltiesProvider.sol";
import "../royalties/lib/LibRoyaltiesV2.sol";
import "../royalties/lib/LibRoyaltiesV1.sol";
import "../royalties/impl/RoyaltiesV1Impl.sol";
import "../royalties/impl/RoyaltiesV2Impl.sol";

contract TestRoyaltiesRegistry is IRoyaltiesProvider {

	struct RoyaltiesSet {
		bool initialized;
		LibPart.Part[] royalties;
	}

	mapping(bytes32 => RoyaltiesSet) public royaltiesByTokenAndTokenId;
	mapping(address => RoyaltiesSet) public royaltiesByToken;

	function setRoyaltiesByToken(address token, LibPart.Part[] memory royalties) external {
		uint sumRoyalties = 0;
		for (uint i = 0; i < royalties.length; i++) {
			require(royalties[i].account != address(0x0), "RoyaltiesByToken recipient should be present");
			require(royalties[i].value != 0, "Fee value for RoyaltiesByToken should be > 0");
			royaltiesByToken[token].royalties.push(royalties[i]);
			sumRoyalties += royalties[i].value;
		}
		require(sumRoyalties < 10000, "Set by token royalties sum more, than 100%");
		royaltiesByToken[token].initialized = true;
	}

	function setRoyaltiesByTokenAndTokenId(address token, uint tokenId, LibPart.Part[] memory royalties) external {
		setRoyaltiesCacheByTokenAndTokenId(token, tokenId, royalties);
	}

	function getRoyalties(address token, uint tokenId) view override external returns (LibPart.Part[] memory) {
		RoyaltiesSet memory royaltiesSet = royaltiesByTokenAndTokenId[keccak256(abi.encode(token, tokenId))];
		if (royaltiesSet.initialized) {
			return royaltiesSet.royalties;
		}
		royaltiesSet = royaltiesByToken[token];
		if (royaltiesSet.initialized) {
			return royaltiesSet.royalties;
		}
		return royaltiesSet.royalties;
	}

	function setRoyaltiesCacheByTokenAndTokenId(address token, uint tokenId, LibPart.Part[] memory royalties) internal {
		uint sumRoyalties = 0;
		bytes32 key = keccak256(abi.encode(token, tokenId));
		for (uint i = 0; i < royalties.length; i++) {
			require(royalties[i].account != address(0x0), "RoyaltiesByTokenAndTokenId recipient should be present");
			require(royalties[i].value != 0, "Fee value for RoyaltiesByTokenAndTokenId should be > 0");
			royaltiesByTokenAndTokenId[key].royalties.push(royalties[i]);
			sumRoyalties += royalties[i].value;
		}
		require(sumRoyalties < 10000, "Set by token and tokenId royalties sum more, than 100%");
		royaltiesByTokenAndTokenId[key].initialized = true;
	}

	uint256[46] private __gap;
}