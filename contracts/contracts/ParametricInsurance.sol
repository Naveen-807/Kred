// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ParametricInsurance
 * @dev Automated parametric insurance with oracle integration
 * @notice Provides automatic payouts based on predefined conditions
 */
contract ParametricInsurance is Ownable, ReentrancyGuard {
    struct InsurancePolicy {
        uint256 policyId;
        address policyholder;
        string policyType; // "crop_drought", "crop_flood", "livestock", "weather"
        uint256 coverageAmount;
        uint256 premium;
        uint256 startDate;
        uint256 endDate;
        bool isActive;
        bool claimed;
        uint256 createdAt;
    }

    struct Claim {
        uint256 claimId;
        uint256 policyId;
        uint256 amount;
        uint256 triggerData;
        uint256 createdAt;
        bool processed;
        bool approved;
        string reason;
    }

    struct OracleData {
        address oracle;
        string feedId;
        uint256 lastUpdate;
        uint256 threshold;
        string condition; // "less_than", "greater_than", "equals"
    }

    mapping(uint256 => InsurancePolicy) public policies;
    mapping(uint256 => Claim) public claims;
    mapping(uint256 => OracleData) public policyOracles;
    mapping(address => uint256[]) public userPolicies;
    mapping(string => uint256) public policyTypeRates; // Premium rates by type
    
    uint256 private _policyCounter;
    uint256 private _claimCounter;
    uint256 public totalPolicies;
    uint256 public totalClaims;
    uint256 public totalPayouts;
    uint256 public insurancePool;

    event PolicyCreated(
        uint256 indexed policyId,
        address indexed policyholder,
        string policyType,
        uint256 coverageAmount,
        uint256 premium,
        uint256 endDate
    );
    event ClaimFiled(
        uint256 indexed claimId,
        uint256 indexed policyId,
        uint256 amount,
        uint256 triggerData
    );
    event ClaimProcessed(
        uint256 indexed claimId,
        bool approved,
        uint256 payoutAmount,
        string reason
    );
    event PolicyExpired(uint256 indexed policyId);
    event OracleDataUpdated(uint256 indexed policyId, uint256 newValue, uint256 timestamp);

    error PolicyNotFound();
    error PolicyNotActive();
    error PolicyExpired();
    error ClaimNotFound();
    error ClaimAlreadyProcessed();
    error InsufficientPool();
    error InvalidAmount();
    error InvalidPolicyType();
    error UnauthorizedOracle();
    error InvalidTriggerData();

    constructor() Ownable(msg.sender) {
        // Set default premium rates (in basis points, e.g., 1000 = 10%)
        policyTypeRates["crop_drought"] = 1000; // 10%
        policyTypeRates["crop_flood"] = 1200;   // 12%
        policyTypeRates["livestock"] = 800;     // 8%
        policyTypeRates["weather"] = 600;      // 6%
    }

    /**
     * @dev Create a new insurance policy
     * @param policyType The type of insurance
     * @param coverageAmount The coverage amount
     * @param duration The policy duration in days
     * @param oracle The oracle address
     * @param feedId The oracle feed ID
     * @param threshold The trigger threshold
     * @param condition The trigger condition
     */
    function createPolicy(
        string calldata policyType,
        uint256 coverageAmount,
        uint256 duration,
        address oracle,
        string calldata feedId,
        uint256 threshold,
        string calldata condition
    ) external payable returns (uint256) {
        require(bytes(policyType).length > 0, "Policy type required");
        require(coverageAmount > 0, "Coverage amount must be positive");
        require(duration > 0, "Duration must be positive");
        require(oracle != address(0), "Invalid oracle");
        require(bytes(feedId).length > 0, "Feed ID required");

        uint256 premiumRate = policyTypeRates[policyType];
        require(premiumRate > 0, "Invalid policy type");

        uint256 premium = (coverageAmount * premiumRate) / 10000;
        require(msg.value >= premium, "Insufficient premium payment");

        uint256 policyId = ++_policyCounter;
        uint256 startDate = block.timestamp;
        uint256 endDate = startDate + (duration * 1 days);

        policies[policyId] = InsurancePolicy({
            policyId: policyId,
            policyholder: msg.sender,
            policyType: policyType,
            coverageAmount: coverageAmount,
            premium: premium,
            startDate: startDate,
            endDate: endDate,
            isActive: true,
            claimed: false,
            createdAt: block.timestamp
        });

        policyOracles[policyId] = OracleData({
            oracle: oracle,
            feedId: feedId,
            lastUpdate: block.timestamp,
            threshold: threshold,
            condition: condition
        });

        userPolicies[msg.sender].push(policyId);
        totalPolicies++;
        insurancePool += premium;

        // Refund excess payment
        if (msg.value > premium) {
            payable(msg.sender).transfer(msg.value - premium);
        }

        emit PolicyCreated(policyId, msg.sender, policyType, coverageAmount, premium, endDate);
        return policyId;
    }

    /**
     * @dev File a claim for a policy
     * @param policyId The policy ID
     * @param triggerData The oracle data that triggered the claim
     */
    function fileClaim(uint256 policyId, uint256 triggerData) external {
        InsurancePolicy storage policy = policies[policyId];
        
        if (policy.policyId == 0) revert PolicyNotFound();
        if (!policy.isActive) revert PolicyNotActive();
        if (policy.claimed) revert ClaimAlreadyProcessed();
        if (block.timestamp > policy.endDate) revert PolicyExpired();
        if (policy.policyholder != msg.sender) revert("Not policy owner");

        uint256 claimId = ++_claimCounter;
        
        claims[claimId] = Claim({
            claimId: claimId,
            policyId: policyId,
            amount: policy.coverageAmount,
            triggerData: triggerData,
            createdAt: block.timestamp,
            processed: false,
            approved: false,
            reason: ""
        });

        totalClaims++;
        policy.claimed = true;

        emit ClaimFiled(claimId, policyId, policy.coverageAmount, triggerData);
    }

    /**
     * @dev Process a claim (oracle or admin)
     * @param claimId The claim ID
     * @param approved Whether the claim is approved
     * @param reason The reason for approval/rejection
     */
    function processClaim(
        uint256 claimId,
        bool approved,
        string calldata reason
    ) external nonReentrancy {
        Claim storage claim = claims[claimId];
        if (claim.claimId == 0) revert ClaimNotFound();
        if (claim.processed) revert ClaimAlreadyProcessed();

        InsurancePolicy memory policy = policies[claim.policyId];
        
        // Only oracle or owner can process claims
        OracleData memory oracleData = policyOracles[claim.policyId];
        require(
            msg.sender == oracleData.oracle || msg.sender == owner(),
            "Unauthorized processor"
        );

        claim.processed = true;
        claim.approved = approved;
        claim.reason = reason;

        if (approved) {
            require(insurancePool >= claim.amount, "Insufficient pool");
            require(address(this).balance >= claim.amount, "Insufficient contract balance");
            
            insurancePool -= claim.amount;
            totalPayouts += claim.amount;
            
            payable(policy.policyholder).transfer(claim.amount);
        }

        emit ClaimProcessed(claimId, approved, approved ? claim.amount : 0, reason);
    }

    /**
     * @dev Update oracle data for a policy
     * @param policyId The policy ID
     * @param newValue The new oracle value
     */
    function updateOracleData(uint256 policyId, uint256 newValue) external {
        OracleData storage oracleData = policyOracles[policyId];
        require(oracleData.oracle == msg.sender, "Unauthorized oracle");

        oracleData.lastUpdate = block.timestamp;
        
        emit OracleDataUpdated(policyId, newValue, block.timestamp);
    }

    /**
     * @dev Check if claim condition is met
     * @param policyId The policy ID
     * @param currentValue The current oracle value
     * @return True if condition is met
     */
    function isClaimConditionMet(uint256 policyId, uint256 currentValue) external view returns (bool) {
        OracleData memory oracleData = policyOracles[policyId];
        
        if (keccak256(bytes(oracleData.condition)) == keccak256(bytes("less_than"))) {
            return currentValue < oracleData.threshold;
        } else if (keccak256(bytes(oracleData.condition)) == keccak256(bytes("greater_than"))) {
            return currentValue > oracleData.threshold;
        } else if (keccak256(bytes(oracleData.condition)) == keccak256(bytes("equals"))) {
            return currentValue == oracleData.threshold;
        }
        
        return false;
    }

    /**
     * @dev Get policy details
     * @param policyId The policy ID
     * @return The policy struct
     */
    function getPolicy(uint256 policyId) external view returns (InsurancePolicy memory) {
        if (policies[policyId].policyId == 0) revert PolicyNotFound();
        return policies[policyId];
    }

    /**
     * @dev Get claim details
     * @param claimId The claim ID
     * @return The claim struct
     */
    function getClaim(uint256 claimId) external view returns (Claim memory) {
        if (claims[claimId].claimId == 0) revert ClaimNotFound();
        return claims[claimId];
    }

    /**
     * @dev Get user's policies
     * @param user The user address
     * @return Array of policy IDs
     */
    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }

    /**
     * @dev Get oracle data for a policy
     * @param policyId The policy ID
     * @return The oracle data struct
     */
    function getOracleData(uint256 policyId) external view returns (OracleData memory) {
        return policyOracles[policyId];
    }

    /**
     * @dev Check if policy is claimable
     * @param policyId The policy ID
     * @return True if policy can be claimed
     */
    function isPolicyClaimable(uint256 policyId) external view returns (bool) {
        InsurancePolicy memory policy = policies[policyId];
        
        return policy.isActive && 
               !policy.claimed && 
               block.timestamp <= policy.endDate &&
               policy.policyId != 0;
    }

    /**
     * @dev Get insurance statistics
     * @return totalPolicies Total number of policies
     * @return totalClaims Total number of claims
     * @return totalPayouts Total amount paid out
     * @return insurancePool Current pool balance
     */
    function getInsuranceStats() external view returns (
        uint256 totalPolicies,
        uint256 totalClaims,
        uint256 totalPayouts,
        uint256 insurancePool
    ) {
        return (totalPolicies, totalClaims, totalPayouts, insurancePool);
    }

    /**
     * @dev Set premium rate for a policy type
     * @param policyType The policy type
     * @param rate The rate in basis points
     */
    function setPremiumRate(string calldata policyType, uint256 rate) external onlyOwner {
        require(rate > 0 && rate <= 5000, "Invalid rate"); // Max 50%
        policyTypeRates[policyType] = rate;
    }

    /**
     * @dev Expire old policies
     * @param policyIds Array of policy IDs to expire
     */
    function expirePolicies(uint256[] calldata policyIds) external onlyOwner {
        for (uint256 i = 0; i < policyIds.length; i++) {
            uint256 policyId = policyIds[i];
            InsurancePolicy storage policy = policies[policyId];
            
            if (policy.isActive && block.timestamp > policy.endDate) {
                policy.isActive = false;
                emit PolicyExpired(policyId);
            }
        }
    }

    /**
     * @dev Deposit to insurance pool
     */
    function depositToPool() external payable onlyOwner {
        require(msg.value > 0, "Amount must be positive");
        insurancePool += msg.value;
    }

    /**
     * @dev Withdraw from insurance pool (emergency)
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= insurancePool, "Insufficient pool");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        insurancePool -= amount;
        payable(owner()).transfer(amount);
    }

    /**
     * @dev Get policy premium for given parameters
     * @param policyType The policy type
     * @param coverageAmount The coverage amount
     * @return The premium amount
     */
    function calculatePremium(string calldata policyType, uint256 coverageAmount) external view returns (uint256) {
        uint256 premiumRate = policyTypeRates[policyType];
        require(premiumRate > 0, "Invalid policy type");
        
        return (coverageAmount * premiumRate) / 10000;
    }
}
