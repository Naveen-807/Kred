// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StreamToOwn
 * @dev Pay-as-you-go content streaming with automatic NFT ownership
 * @notice Users stream payments and automatically receive NFT when fully paid
 */
contract StreamToOwn is ERC721, Ownable, ReentrancyGuard {
    struct Content {
        uint256 contentId;
        string title;
        string contentType; // "course", "music", "video", "ebook"
        uint256 fullPrice;
        uint256 streamRate; // PYUSD per minute
        address creator;
        bool isActive;
        uint256 createdAt;
    }

    struct Stream {
        uint256 streamId;
        uint256 contentId;
        address subscriber;
        uint256 streamedAmount;
        uint256 streamRate;
        uint256 startTime;
        uint256 lastStreamTime;
        bool isActive;
        bool ownershipMinted;
    }

    struct OwnershipNFT {
        uint256 tokenId;
        uint256 contentId;
        uint256 totalPaid;
        uint256 mintedAt;
        string metadataURI;
    }

    mapping(uint256 => Content) public contentCatalog;
    mapping(uint256 => Stream) public activeStreams;
    mapping(address => uint256[]) public userStreams;
    mapping(uint256 => OwnershipNFT) public ownershipNFTs;
    mapping(address => uint256[]) public userOwnershipNFTs;
    
    uint256 private _contentCounter;
    uint256 private _streamCounter;
    uint256 private _tokenIdCounter;
    
    string private _baseTokenURI;

    event ContentAdded(
        uint256 indexed contentId,
        address indexed creator,
        string title,
        uint256 fullPrice,
        uint256 streamRate
    );
    event StreamStarted(
        uint256 indexed streamId,
        address indexed subscriber,
        uint256 indexed contentId,
        uint256 streamRate
    );
    event StreamPayment(
        uint256 indexed streamId,
        uint256 amount,
        uint256 totalStreamed,
        uint256 remainingAmount
    );
    event OwnershipMinted(
        uint256 indexed tokenId,
        uint256 indexed streamId,
        address indexed owner,
        uint256 contentId,
        uint256 totalPaid
    );
    event StreamStopped(uint256 indexed streamId, uint256 totalPaid);

    error ContentNotFound();
    error StreamNotFound();
    error StreamNotActive();
    error InsufficientPayment();
    error ContentNotActive();
    error OwnershipAlreadyMinted();
    error InvalidStreamRate();
    error InvalidAmount();

    constructor() ERC721("ContentOwnership", "CO") Ownable(msg.sender) {
        _contentCounter = 1;
        _streamCounter = 1;
        _tokenIdCounter = 1;
    }

    /**
     * @dev Add content to the catalog
     * @param title The content title
     * @param contentType The type of content
     * @param fullPrice The full price of the content
     * @param streamRate The streaming rate per minute
     */
    function addContent(
        string calldata title,
        string calldata contentType,
        uint256 fullPrice,
        uint256 streamRate
    ) external onlyOwner returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(fullPrice > 0, "Price must be positive");
        require(streamRate > 0, "Stream rate must be positive");
        require(streamRate < fullPrice, "Stream rate too high");

        uint256 contentId = _contentCounter++;
        
        contentCatalog[contentId] = Content({
            contentId: contentId,
            title: title,
            contentType: contentType,
            fullPrice: fullPrice,
            streamRate: streamRate,
            creator: msg.sender,
            isActive: true,
            createdAt: block.timestamp
        });

        emit ContentAdded(contentId, msg.sender, title, fullPrice, streamRate);
        return contentId;
    }

    /**
     * @dev Start streaming content
     * @param contentId The content ID to stream
     */
    function startStream(uint256 contentId) external returns (uint256) {
        Content memory content = contentCatalog[contentId];
        if (content.contentId == 0) revert ContentNotFound();
        if (!content.isActive) revert ContentNotActive();

        uint256 streamId = _streamCounter++;
        
        activeStreams[streamId] = Stream({
            streamId: streamId,
            contentId: contentId,
            subscriber: msg.sender,
            streamedAmount: 0,
            streamRate: content.streamRate,
            startTime: block.timestamp,
            lastStreamTime: block.timestamp,
            isActive: true,
            ownershipMinted: false
        });

        userStreams[msg.sender].push(streamId);

        emit StreamStarted(streamId, msg.sender, contentId, content.streamRate);
        return streamId;
    }

    /**
     * @dev Process streaming payment
     * @param streamId The stream ID
     * @param minutes The number of minutes to pay for
     */
    function processStreamPayment(uint256 streamId, uint256 minutes) external payable nonReentrancy {
        Stream storage stream = activeStreams[streamId];
        if (stream.streamId == 0) revert StreamNotFound();
        if (!stream.isActive) revert StreamNotActive();

        Content memory content = contentCatalog[stream.contentId];
        uint256 paymentAmount = stream.streamRate * minutes;
        
        require(msg.value >= paymentAmount, "Insufficient payment");
        require(minutes > 0, "Invalid minutes");

        uint256 previousAmount = stream.streamedAmount;
        stream.streamedAmount += paymentAmount;
        stream.lastStreamTime = block.timestamp;

        uint256 remainingAmount = content.fullPrice - stream.streamedAmount;
        
        emit StreamPayment(streamId, paymentAmount, stream.streamedAmount, remainingAmount);

        // Check if fully paid
        if (stream.streamedAmount >= content.fullPrice && !stream.ownershipMinted) {
            _mintOwnershipNFT(streamId);
        }

        // Refund excess payment
        if (msg.value > paymentAmount) {
            payable(msg.sender).transfer(msg.value - paymentAmount);
        }
    }

    /**
     * @dev Stop streaming
     * @param streamId The stream ID
     */
    function stopStream(uint256 streamId) external {
        Stream storage stream = activeStreams[streamId];
        if (stream.streamId == 0) revert StreamNotFound();
        if (!stream.isActive) revert StreamNotActive();
        if (stream.subscriber != msg.sender) revert("Not stream owner");

        stream.isActive = false;
        
        emit StreamStopped(streamId, stream.streamedAmount);
    }

    /**
     * @dev Mint ownership NFT when content is fully paid
     * @param streamId The stream ID
     */
    function _mintOwnershipNFT(uint256 streamId) internal {
        Stream storage stream = activeStreams[streamId];
        Content memory content = contentCatalog[stream.contentId];
        
        if (stream.ownershipMinted) revert OwnershipAlreadyMinted();

        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(stream.subscriber, tokenId);
        
        ownershipNFTs[tokenId] = OwnershipNFT({
            tokenId: tokenId,
            contentId: stream.contentId,
            totalPaid: stream.streamedAmount,
            mintedAt: block.timestamp,
            metadataURI: string(abi.encodePacked(_baseURI(), _toString(tokenId)))
        });

        userOwnershipNFTs[stream.subscriber].push(tokenId);
        stream.ownershipMinted = true;

        emit OwnershipMinted(tokenId, streamId, stream.subscriber, stream.contentId, stream.streamedAmount);
    }

    /**
     * @dev Get content details
     * @param contentId The content ID
     * @return The content struct
     */
    function getContent(uint256 contentId) external view returns (Content memory) {
        if (contentCatalog[contentId].contentId == 0) revert ContentNotFound();
        return contentCatalog[contentId];
    }

    /**
     * @dev Get stream details
     * @param streamId The stream ID
     * @return The stream struct
     */
    function getStream(uint256 streamId) external view returns (Stream memory) {
        if (activeStreams[streamId].streamId == 0) revert StreamNotFound();
        return activeStreams[streamId];
    }

    /**
     * @dev Get user's active streams
     * @param user The user address
     * @return Array of stream IDs
     */
    function getUserStreams(address user) external view returns (uint256[] memory) {
        return userStreams[user];
    }

    /**
     * @dev Get user's ownership NFTs
     * @param user The user address
     * @return Array of token IDs
     */
    function getUserOwnershipNFTs(address user) external view returns (uint256[] memory) {
        return userOwnershipNFTs[user];
    }

    /**
     * @dev Get ownership NFT details
     * @param tokenId The token ID
     * @return The ownership NFT struct
     */
    function getOwnershipNFT(uint256 tokenId) external view returns (OwnershipNFT memory) {
        if (!_exists(tokenId)) revert("Token not found");
        return ownershipNFTs[tokenId];
    }

    /**
     * @dev Calculate streaming cost for duration
     * @param streamId The stream ID
     * @param minutes The number of minutes
     * @return The cost in wei
     */
    function calculateStreamingCost(uint256 streamId, uint256 minutes) external view returns (uint256) {
        Stream memory stream = activeStreams[streamId];
        if (stream.streamId == 0) revert StreamNotFound();
        
        return stream.streamRate * minutes;
    }

    /**
     * @dev Get remaining amount to own content
     * @param streamId The stream ID
     * @return The remaining amount
     */
    function getRemainingAmount(uint256 streamId) external view returns (uint256) {
        Stream memory stream = activeStreams[streamId];
        if (stream.streamId == 0) revert StreamNotFound();
        
        Content memory content = contentCatalog[stream.contentId];
        uint256 remaining = content.fullPrice - stream.streamedAmount;
        
        return remaining > 0 ? remaining : 0;
    }

    /**
     * @dev Check if content is fully owned
     * @param streamId The stream ID
     * @return True if fully owned
     */
    function isContentOwned(uint256 streamId) external view returns (bool) {
        Stream memory stream = activeStreams[streamId];
        if (stream.streamId == 0) revert StreamNotFound();
        
        return stream.ownershipMinted;
    }

    /**
     * @dev Get content catalog
     * @param offset The offset
     * @param limit The limit
     * @return Array of content IDs
     */
    function getContentCatalog(uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        uint256[] memory contentIds = new uint256[](limit);
        uint256 count = 0;
        
        for (uint256 i = offset + 1; i <= _contentCounter && count < limit; i++) {
            if (contentCatalog[i].isActive) {
                contentIds[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = contentIds[i];
        }
        
        return result;
    }

    /**
     * @dev Get streaming statistics
     * @return totalContent Total content items
     * @return activeStreams Total active streams
     * @return totalOwnershipNFTs Total ownership NFTs minted
     */
    function getStreamingStats() external view returns (
        uint256 totalContent,
        uint256 activeStreams,
        uint256 totalOwnershipNFTs
    ) {
        totalContent = _contentCounter - 1;
        totalOwnershipNFTs = _tokenIdCounter - 1;
        
        for (uint256 i = 1; i <= _streamCounter; i++) {
            if (activeStreams[i].isActive) {
                activeStreams++;
            }
        }
    }

    /**
     * @dev Set base URI for token metadata
     * @param baseURI The base URI
     */
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Get base URI
     * @return The base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Convert uint256 to string
     * @param value The value to convert
     * @return The string representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Withdraw contract balance
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }
}
