// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MicroDAO
 * @dev Temporary multi-signature DAO for community funding
 * @notice Enables SMS-based community proposals and voting
 */
contract MicroDAO is Ownable, ReentrancyGuard {
    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 amount;
        address recipient;
        address proposer;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        uint256 createdAt;
        uint256 votingDeadline;
        bool executed;
        bool active;
    }

    struct Member {
        address wallet;
        uint256 votingPower;
        bool isActive;
        uint256 joinedAt;
    }

    struct Vote {
        address voter;
        uint8 voteType; // 0: abstain, 1: for, 2: against
        uint256 timestamp;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(address => Member) public members;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => Vote[]) public proposalVotes;
    
    uint256 public proposalCounter;
    uint256 public treasuryBalance;
    uint256 public votingThreshold; // Percentage required to pass (e.g., 60 for 60%)
    uint256 public votingDuration; // Duration in hours
    uint256 public minProposalAmount;
    uint256 public maxProposalAmount;
    uint256 public memberCount;
    
    address[] public memberList;
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 amount,
        uint256 votingDeadline
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 voteType,
        uint256 votingPower
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount
    );
    event MemberAdded(address indexed member, uint256 votingPower);
    event MemberRemoved(address indexed member);
    event TreasuryDeposited(address indexed depositor, uint256 amount);
    event TreasuryWithdrawn(address indexed recipient, uint256 amount);

    error ProposalNotFound();
    error ProposalNotActive();
    error VotingPeriodEnded();
    error AlreadyVoted();
    error InsufficientVotes();
    error ProposalNotExecutable();
    error InsufficientTreasury();
    error InvalidAmount();
    error UnauthorizedMember();
    error InvalidVotingPower();

    constructor(
        address[] memory initialMembers,
        uint256[] memory votingPowers,
        uint256 _votingThreshold,
        uint256 _votingDuration,
        uint256 _minProposalAmount,
        uint256 _maxProposalAmount
    ) Ownable(msg.sender) {
        require(initialMembers.length == votingPowers.length, "Arrays length mismatch");
        require(_votingThreshold <= 100, "Invalid threshold");
        
        votingThreshold = _votingThreshold;
        votingDuration = _votingDuration;
        minProposalAmount = _minProposalAmount;
        maxProposalAmount = _maxProposalAmount;
        
        for (uint256 i = 0; i < initialMembers.length; i++) {
            _addMember(initialMembers[i], votingPowers[i]);
        }
    }

    /**
     * @dev Create a new proposal
     * @param title The proposal title
     * @param description The proposal description
     * @param amount The amount to request
     * @param recipient The recipient address
     */
    function createProposal(
        string calldata title,
        string calldata description,
        uint256 amount,
        address recipient
    ) external onlyOwner returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(bytes(description).length > 0, "Description required");
        require(amount >= minProposalAmount, "Amount too low");
        require(amount <= maxProposalAmount, "Amount too high");
        require(amount <= treasuryBalance, "Insufficient treasury");
        require(recipient != address(0), "Invalid recipient");

        uint256 proposalId = ++proposalCounter;
        uint256 votingDeadline = block.timestamp + (votingDuration * 1 hours);

        proposals[proposalId] = Proposal({
            id: proposalId,
            title: title,
            description: description,
            amount: amount,
            recipient: recipient,
            proposer: msg.sender,
            votesFor: 0,
            votesAgainst: 0,
            votesAbstain: 0,
            createdAt: block.timestamp,
            votingDeadline: votingDeadline,
            executed: false,
            active: true
        });

        emit ProposalCreated(proposalId, msg.sender, title, amount, votingDeadline);
        return proposalId;
    }

    /**
     * @dev Cast a vote on a proposal
     * @param proposalId The proposal ID
     * @param voteType 0: abstain, 1: for, 2: against
     */
    function castVote(uint256 proposalId, uint8 voteType) external {
        Proposal storage proposal = proposals[proposalId];
        
        if (!proposal.active) revert ProposalNotFound();
        if (block.timestamp > proposal.votingDeadline) revert VotingPeriodEnded();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        if (voteType > 2) revert InvalidVotingPower();
        
        Member memory member = members[msg.sender];
        if (!member.isActive) revert UnauthorizedMember();

        hasVoted[proposalId][msg.sender] = true;
        
        Vote memory vote = Vote({
            voter: msg.sender,
            voteType: voteType,
            timestamp: block.timestamp
        });
        
        proposalVotes[proposalId].push(vote);

        if (voteType == 1) {
            proposal.votesFor += member.votingPower;
        } else if (voteType == 2) {
            proposal.votesAgainst += member.votingPower;
        } else {
            proposal.votesAbstain += member.votingPower;
        }

        emit VoteCast(proposalId, msg.sender, voteType, member.votingPower);
    }

    /**
     * @dev Execute a proposal if it passes
     * @param proposalId The proposal ID
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        if (!proposal.active) revert ProposalNotFound();
        if (proposal.executed) revert ProposalNotExecutable();
        if (block.timestamp <= proposal.votingDeadline) revert ProposalNotExecutable();
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
        uint256 totalVotingPower = _getTotalVotingPower();
        
        if (totalVotes < (totalVotingPower * votingThreshold / 100)) {
            revert InsufficientVotes();
        }
        
        if (proposal.votesFor <= proposal.votesAgainst) {
            revert InsufficientVotes();
        }
        
        if (treasuryBalance < proposal.amount) {
            revert InsufficientTreasury();
        }

        proposal.executed = true;
        proposal.active = false;
        treasuryBalance -= proposal.amount;

        payable(proposal.recipient).transfer(proposal.amount);

        emit ProposalExecuted(proposalId, proposal.recipient, proposal.amount);
    }

    /**
     * @dev Deposit funds to treasury
     */
    function depositToTreasury() external payable {
        require(msg.value > 0, "Amount must be positive");
        treasuryBalance += msg.value;
        emit TreasuryDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw from treasury (emergency function)
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= treasuryBalance, "Insufficient treasury");
        treasuryBalance -= amount;
        payable(owner()).transfer(amount);
        emit TreasuryWithdrawn(owner(), amount);
    }

    /**
     * @dev Add a new member
     * @param member The member address
     * @param votingPower The voting power
     */
    function addMember(address member, uint256 votingPower) external onlyOwner {
        require(member != address(0), "Invalid member");
        require(votingPower > 0, "Invalid voting power");
        require(!members[member].isActive, "Member already exists");
        
        _addMember(member, votingPower);
    }

    /**
     * @dev Remove a member
     * @param member The member address
     */
    function removeMember(address member) external onlyOwner {
        require(members[member].isActive, "Member not found");
        
        members[member].isActive = false;
        memberCount--;
        
        // Remove from member list
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] == member) {
                memberList[i] = memberList[memberList.length - 1];
                memberList.pop();
                break;
            }
        }
        
        emit MemberRemoved(member);
    }

    /**
     * @dev Get proposal details
     * @param proposalId The proposal ID
     * @return The proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        if (!proposals[proposalId].active && !proposals[proposalId].executed) {
            revert ProposalNotFound();
        }
        return proposals[proposalId];
    }

    /**
     * @dev Get proposal votes
     * @param proposalId The proposal ID
     * @return Array of votes
     */
    function getProposalVotes(uint256 proposalId) external view returns (Vote[] memory) {
        return proposalVotes[proposalId];
    }

    /**
     * @dev Get all members
     * @return Array of member addresses
     */
    function getAllMembers() external view returns (address[] memory) {
        return memberList;
    }

    /**
     * @dev Get member count
     * @return The number of active members
     */
    function getMemberCount() external view returns (uint256) {
        return memberCount;
    }

    /**
     * @dev Check if proposal can be executed
     * @param proposalId The proposal ID
     * @return True if proposal can be executed
     */
    function canExecuteProposal(uint256 proposalId) external view returns (bool) {
        Proposal memory proposal = proposals[proposalId];
        
        if (!proposal.active || proposal.executed) return false;
        if (block.timestamp <= proposal.votingDeadline) return false;
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
        uint256 totalVotingPower = _getTotalVotingPower();
        
        return totalVotes >= (totalVotingPower * votingThreshold / 100) && 
               proposal.votesFor > proposal.votesAgainst &&
               treasuryBalance >= proposal.amount;
    }

    /**
     * @dev Get total voting power
     * @return The total voting power
     */
    function _getTotalVotingPower() internal view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < memberList.length; i++) {
            if (members[memberList[i]].isActive) {
                total += members[memberList[i]].votingPower;
            }
        }
        return total;
    }

    /**
     * @dev Add member internally
     * @param member The member address
     * @param votingPower The voting power
     */
    function _addMember(address member, uint256 votingPower) internal {
        members[member] = Member({
            wallet: member,
            votingPower: votingPower,
            isActive: true,
            joinedAt: block.timestamp
        });
        
        memberList.push(member);
        memberCount++;
        
        emit MemberAdded(member, votingPower);
    }

    /**
     * @dev Get DAO statistics
     * @return treasury The treasury balance
     * @return activeProposals The number of active proposals
     * @return totalProposals The total number of proposals
     * @return members The number of members
     */
    function getDAOStats() external view returns (
        uint256 treasury,
        uint256 activeProposals,
        uint256 totalProposals,
        uint256 members
    ) {
        treasury = treasuryBalance;
        totalProposals = proposalCounter;
        members = memberCount;
        
        for (uint256 i = 1; i <= proposalCounter; i++) {
            if (proposals[i].active) {
                activeProposals++;
            }
        }
    }
}
