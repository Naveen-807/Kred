// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ProofOfCommerceSBT is ERC721, AccessControl {
    bytes32 public constant MINT_ROLE = keccak256("MINT_ROLE");
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");

    uint256 private _tokenIdCounter;

    struct TransactionMetadata {
        uint256 fiatAmount;
        string fiatCurrency;
        uint256 pyusdAmount;
        string counterparty;
        uint256 timestamp;
        string commandId;
        string metadataUri;
    }

    mapping(uint256 => TransactionMetadata) private _metadata;
    mapping(uint256 => bool) private _minted;

    event ProofMinted(
        address indexed account,
        uint256 indexed tokenId,
        uint256 fiatAmount,
        string fiatCurrency,
        uint256 pyusdAmount,
        string counterparty,
        string commandId,
        string metadataUri
    );

    event MetadataUpdated(uint256 indexed tokenId, string metadataUri);

    constructor(address admin, address minter) ERC721("ProofOfCommerceSBT", "POCSBT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINT_ROLE, minter);
        _grantRole(METADATA_ROLE, admin);
    }

    function mintProof(address to, TransactionMetadata calldata data)
        external
        onlyRole(MINT_ROLE)
        returns (uint256)
    {
        _tokenIdCounter += 1;
        uint256 tokenId = _tokenIdCounter;

        _mint(to, tokenId);
        _metadata[tokenId] = data;
        _minted[tokenId] = true;

        emit ProofMinted(
            to,
            tokenId,
            data.fiatAmount,
            data.fiatCurrency,
            data.pyusdAmount,
            data.counterparty,
            data.commandId,
            data.metadataUri
        );
        emit MetadataUpdated(tokenId, data.metadataUri);
        return tokenId;
    }

    function updateMetadata(uint256 tokenId, string calldata metadataUri)
        external
        onlyRole(METADATA_ROLE)
    {
        require(_minted[tokenId], "SBT: token does not exist");
        _metadata[tokenId].metadataUri = metadataUri;
        emit MetadataUpdated(tokenId, metadataUri);
    }

    function getMetadata(uint256 tokenId)
        external
        view
        returns (TransactionMetadata memory)
    {
        require(_minted[tokenId], "SBT: token does not exist");
        return _metadata[tokenId];
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address previousOwner = super._update(to, tokenId, auth);
        if (previousOwner != address(0) && to != address(0)) {
            revert("SBT: non-transferable");
        }
        return previousOwner;
    }

    function burn(uint256 tokenId) external onlyRole(METADATA_ROLE) {
        _burn(tokenId);
        delete _metadata[tokenId];
        _minted[tokenId] = false;
    }
}
