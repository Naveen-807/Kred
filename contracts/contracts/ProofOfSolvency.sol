// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title ProofOfSolvency
 * @dev Privacy-preserving financial passport using Merkle trees
 * @notice Creates verifiable financial identity without revealing specific transactions
 */
contract ProofOfSolvency is ERC721, Ownable {
    struct FinancialMetrics {
        uint256 averageMonthlyIncome;
        uint256 transactionCount;
        uint256 reliabilityScore;
        uint256 creditScore;
        uint256 lastUpdated;
    }

    struct MerkleProofData {
        bytes32 root;
        bytes32[] proof;
        bytes32 leafHash;
    }

    mapping(uint256 => FinancialMetrics) public financialPassports;
    mapping(uint256 => MerkleProofData) public merkleProofs;
    mapping(address => uint256) public userPassports;
    mapping(bytes32 => bool) public usedRoots;
    
    uint256 private _tokenIdCounter;
    string private _baseTokenURI;

    event FinancialPassportMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 averageMonthlyIncome,
        uint256 creditScore,
        bytes32 merkleRoot
    );
    event PassportVerified(uint256 indexed tokenId, address indexed verifier);
    event MetricsUpdated(uint256 indexed tokenId, uint256 newCreditScore);

    error PassportNotFound();
    error InvalidMerkleProof();
    error RootAlreadyUsed();
    error UnauthorizedAccess();
    error InvalidMetrics();

    constructor() ERC721("FinancialPassport", "FP") Ownable(msg.sender) {
        _tokenIdCounter = 1;
    }

    /**
     * @dev Mint a new financial passport
     * @param to The address to mint the passport to
     * @param metrics The financial metrics
     * @param merkleData The Merkle proof data
     */
    function mintFinancialPassport(
        address to,
        FinancialMetrics calldata metrics,
        MerkleProofData calldata merkleData
    ) external onlyOwner returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(metrics.averageMonthlyIncome > 0, "Invalid income");
        require(metrics.creditScore <= 1000, "Invalid credit score");
        require(!usedRoots[merkleData.root], "Root already used");

        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        
        financialPassports[tokenId] = metrics;
        merkleProofs[tokenId] = merkleData;
        userPassports[to] = tokenId;
        usedRoots[merkleData.root] = true;

        emit FinancialPassportMinted(
            tokenId,
            to,
            metrics.averageMonthlyIncome,
            metrics.creditScore,
            merkleData.root
        );

        return tokenId;
    }

    /**
     * @dev Verify a financial passport using Merkle proof
     * @param tokenId The passport token ID
     * @param leaf The leaf data to verify
     * @param proof The Merkle proof
     * @return True if verification succeeds
     */
    function verifyPassport(
        uint256 tokenId,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool) {
        if (!_exists(tokenId)) revert PassportNotFound();
        
        MerkleProofData memory merkleData = merkleProofs[tokenId];
        
        return MerkleProof.verify(proof, merkleData.root, leaf);
    }

    /**
     * @dev Get financial metrics for a passport
     * @param tokenId The passport token ID
     * @return The financial metrics
     */
    function getFinancialMetrics(uint256 tokenId) external view returns (FinancialMetrics memory) {
        if (!_exists(tokenId)) revert PassportNotFound();
        return financialPassports[tokenId];
    }

    /**
     * @dev Get passport for a user
     * @param user The user address
     * @return The passport token ID
     */
    function getUserPassport(address user) external view returns (uint256) {
        return userPassports[user];
    }

    /**
     * @dev Check if user has a passport
     * @param user The user address
     * @return True if user has a passport
     */
    function hasPassport(address user) external view returns (bool) {
        return userPassports[user] != 0;
    }

    /**
     * @dev Generate verification code for passport sharing
     * @param tokenId The passport token ID
     * @param verifier The verifier address
     * @return The verification code
     */
    function generateVerificationCode(uint256 tokenId, address verifier) external view returns (bytes32) {
        if (!_exists(tokenId)) revert PassportNotFound();
        
        return keccak256(abi.encodePacked(tokenId, verifier, block.timestamp));
    }

    /**
     * @dev Verify passport with code
     * @param tokenId The passport token ID
     * @param verificationCode The verification code
     * @param verifier The verifier address
     * @return True if verification succeeds
     */
    function verifyWithCode(
        uint256 tokenId,
        bytes32 verificationCode,
        address verifier
    ) external view returns (bool) {
        if (!_exists(tokenId)) revert PassportNotFound();
        
        bytes32 expectedCode = keccak256(abi.encodePacked(tokenId, verifier, block.timestamp));
        return verificationCode == expectedCode;
    }

    /**
     * @dev Update financial metrics (only owner)
     * @param tokenId The passport token ID
     * @param newMetrics The new financial metrics
     */
    function updateMetrics(uint256 tokenId, FinancialMetrics calldata newMetrics) external onlyOwner {
        if (!_exists(tokenId)) revert PassportNotFound();
        
        financialPassports[tokenId] = newMetrics;
        
        emit MetricsUpdated(tokenId, newMetrics.creditScore);
    }

    /**
     * @dev Get passport summary for sharing
     * @param tokenId The passport token ID
     * @return income The average monthly income
     * @return creditScore The credit score
     * @return reliability The reliability score
     */
    function getPassportSummary(uint256 tokenId) external view returns (
        uint256 income,
        uint256 creditScore,
        uint256 reliability
    ) {
        if (!_exists(tokenId)) revert PassportNotFound();
        
        FinancialMetrics memory metrics = financialPassports[tokenId];
        return (metrics.averageMonthlyIncome, metrics.creditScore, metrics.reliabilityScore);
    }

    /**
     * @dev Check passport validity
     * @param tokenId The passport token ID
     * @return True if passport is valid
     */
    function isPassportValid(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        
        FinancialMetrics memory metrics = financialPassports[tokenId];
        return metrics.lastUpdated > 0 && metrics.creditScore > 0;
    }

    /**
     * @dev Get passport age
     * @param tokenId The passport token ID
     * @return The age in days
     */
    function getPassportAge(uint256 tokenId) external view returns (uint256) {
        if (!_exists(tokenId)) revert PassportNotFound();
        
        FinancialMetrics memory metrics = financialPassports[tokenId];
        return (block.timestamp - metrics.lastUpdated) / 86400; // Convert to days
    }

    /**
     * @dev Batch verify multiple passports
     * @param tokenIds Array of passport token IDs
     * @return Array of validity results
     */
    function batchVerifyPassports(uint256[] calldata tokenIds) external view returns (bool[] memory) {
        bool[] memory results = new bool[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            results[i] = _exists(tokenIds[i]) && financialPassports[tokenIds[i]].lastUpdated > 0;
        }
        
        return results;
    }

    /**
     * @dev Get passport statistics
     * @return totalPassports Total number of passports
     * @return averageCreditScore Average credit score
     * @return totalIncome Total income across all passports
     */
    function getPassportStatistics() external view returns (
        uint256 totalPassports,
        uint256 averageCreditScore,
        uint256 totalIncome
    ) {
        uint256 sumCreditScore = 0;
        uint256 sumIncome = 0;
        
        for (uint256 i = 1; i < _tokenIdCounter; i++) {
            if (_exists(i)) {
                FinancialMetrics memory metrics = financialPassports[i];
                totalPassports++;
                sumCreditScore += metrics.creditScore;
                sumIncome += metrics.averageMonthlyIncome;
            }
        }
        
        averageCreditScore = totalPassports > 0 ? sumCreditScore / totalPassports : 0;
        return (totalPassports, averageCreditScore, sumIncome);
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
     * @dev Override tokenURI to include financial metrics
     * @param tokenId The token ID
     * @return The token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 
            ? string(abi.encodePacked(baseURI, _toString(tokenId)))
            : "";
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
}
