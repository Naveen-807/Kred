
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ProofOfCommerceSBT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    struct TransactionMetadata {
        uint256 amount;
        uint256 timestamp;
        bytes32 counterpartyHash;
    }

    mapping(uint256 => TransactionMetadata) private _transactionMetadata;

    constructor() ERC721("Proof of Commerce SBT", "POCSBT") Ownable(msg.sender) {}

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override
    {
        require(from == address(0), "SBTs are non-transferable");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function safeMint(address to, uint256 amount, bytes32 counterpartyHash) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _transactionMetadata[tokenId] = TransactionMetadata({
            amount: amount,
            timestamp: block.timestamp,
            counterpartyHash: counterpartyHash
        });
    }

    function getTransactionMetadata(uint256 tokenId)
        public
        view
        returns (uint256 amount, uint256 timestamp, bytes32 counterpartyHash)
    {
        TransactionMetadata memory metadata = _transactionMetadata[tokenId];
        return (metadata.amount, metadata.timestamp, metadata.counterpartyHash);
    }

    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        }

        uint256[] memory tokenIds = new uint256[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokenIds;
    }
}
