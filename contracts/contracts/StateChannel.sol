// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title StateChannel
 * @dev Implements payment channels for offline transactions on Hedera
 * @notice Allows users to open channels, make off-chain payments, and settle on-chain
 */
contract StateChannel {
    struct Channel {
        address participant1;
        address participant2;
        uint256 totalAmount;
        uint256 participant1Balance;
        uint256 participant2Balance;
        uint256 nonce;
        bool isOpen;
        uint256 createdAt;
        uint256 lastActivity;
    }

    struct OfflineTransaction {
        address from;
        address to;
        uint256 amount;
        uint256 nonce;
        bytes32 signature;
    }

    mapping(bytes32 => Channel) public channels;
    mapping(address => bytes32[]) public userChannels;
    
    event ChannelOpened(bytes32 indexed channelId, address indexed participant1, address indexed participant2, uint256 amount);
    event ChannelClosed(bytes32 indexed channelId, uint256 participant1FinalBalance, uint256 participant2FinalBalance);
    event OfflinePayment(bytes32 indexed channelId, address indexed from, address indexed to, uint256 amount, uint256 nonce);
    event ChannelSettled(bytes32 indexed channelId, bytes32 transactionHash);

    error ChannelNotFound();
    error ChannelNotOpen();
    error InsufficientBalance();
    error InvalidSignature();
    error InvalidNonce();
    error UnauthorizedParticipant();
    error ChannelAlreadyOpen();
    error InvalidAmount();

    /**
     * @dev Open a new payment channel between two participants
     * @param participant2 The other participant in the channel
     * @param amount The total amount to lock in the channel
     */
    function openChannel(address participant2, uint256 amount) external payable {
        require(participant2 != address(0), "Invalid participant");
        require(participant2 != msg.sender, "Cannot open channel with self");
        require(amount > 0, "Amount must be positive");
        require(msg.value >= amount, "Insufficient payment");

        bytes32 channelId = keccak256(abi.encodePacked(msg.sender, participant2, block.timestamp, block.number));
        
        // Check if channel already exists
        require(!channels[channelId].isOpen, "Channel already exists");

        channels[channelId] = Channel({
            participant1: msg.sender,
            participant2: participant2,
            totalAmount: amount,
            participant1Balance: amount,
            participant2Balance: 0,
            nonce: 0,
            isOpen: true,
            createdAt: block.timestamp,
            lastActivity: block.timestamp
        });

        userChannels[msg.sender].push(channelId);
        userChannels[participant2].push(channelId);

        emit ChannelOpened(channelId, msg.sender, participant2, amount);
    }

    /**
     * @dev Process an offline transaction within a channel
     * @param channelId The ID of the channel
     * @param from The sender of the offline transaction
     * @param to The recipient of the offline transaction
     * @param amount The amount to transfer
     * @param nonce The nonce for this transaction
     * @param signature The signature of the transaction
     */
    function processOfflineTransaction(
        bytes32 channelId,
        address from,
        address to,
        uint256 amount,
        uint256 nonce,
        bytes32 signature
    ) external {
        Channel storage channel = channels[channelId];
        
        if (!channel.isOpen) revert ChannelNotFound();
        if (nonce != channel.nonce + 1) revert InvalidNonce();
        if (from != channel.participant1 && from != channel.participant2) revert UnauthorizedParticipant();
        if (to != channel.participant1 && to != channel.participant2) revert UnauthorizedParticipant();
        if (amount == 0) revert InvalidAmount();

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(channelId, from, to, amount, nonce));
        address signer = recoverSigner(messageHash, signature);
        if (signer != from) revert InvalidSignature();

        // Check balance
        if (from == channel.participant1) {
            if (channel.participant1Balance < amount) revert InsufficientBalance();
            channel.participant1Balance -= amount;
            if (to == channel.participant2) {
                channel.participant2Balance += amount;
            }
        } else {
            if (channel.participant2Balance < amount) revert InsufficientBalance();
            channel.participant2Balance -= amount;
            if (to == channel.participant1) {
                channel.participant1Balance += amount;
            }
        }

        channel.nonce = nonce;
        channel.lastActivity = block.timestamp;

        emit OfflinePayment(channelId, from, to, amount, nonce);
    }

    /**
     * @dev Close a channel and settle final balances
     * @param channelId The ID of the channel to close
     * @param finalBalances Array of final balances [participant1Balance, participant2Balance]
     * @param signatures Array of signatures from both participants
     */
    function closeChannel(
        bytes32 channelId,
        uint256[2] calldata finalBalances,
        bytes32[2] calldata signatures
    ) external {
        Channel storage channel = channels[channelId];
        
        if (!channel.isOpen) revert ChannelNotFound();

        // Verify signatures from both participants
        bytes32 messageHash = keccak256(abi.encodePacked(channelId, finalBalances[0], finalBalances[1], "CLOSE"));
        
        address signer1 = recoverSigner(messageHash, signatures[0]);
        address signer2 = recoverSigner(messageHash, signatures[1]);
        
        if (signer1 != channel.participant1 || signer2 != channel.participant2) {
            revert InvalidSignature();
        }

        // Verify final balances don't exceed total amount
        require(finalBalances[0] + finalBalances[1] <= channel.totalAmount, "Invalid final balances");

        channel.isOpen = false;

        // Transfer final balances
        if (finalBalances[0] > 0) {
            payable(channel.participant1).transfer(finalBalances[0]);
        }
        if (finalBalances[1] > 0) {
            payable(channel.participant2).transfer(finalBalances[1]);
        }

        emit ChannelClosed(channelId, finalBalances[0], finalBalances[1]);
    }

    /**
     * @dev Emergency close channel (only if one participant is unresponsive)
     * @param channelId The ID of the channel to close
     * @param timeoutPeriod The timeout period in seconds
     */
    function emergencyClose(bytes32 channelId, uint256 timeoutPeriod) external {
        Channel storage channel = channels[channelId];
        
        if (!channel.isOpen) revert ChannelNotFound();
        if (msg.sender != channel.participant1 && msg.sender != channel.participant2) {
            revert UnauthorizedParticipant();
        }
        if (block.timestamp < channel.lastActivity + timeoutPeriod) {
            revert("Channel not timed out");
        }

        channel.isOpen = false;

        // Return balances to original participants
        payable(channel.participant1).transfer(channel.participant1Balance);
        payable(channel.participant2).transfer(channel.participant2Balance);

        emit ChannelClosed(channelId, channel.participant1Balance, channel.participant2Balance);
    }

    /**
     * @dev Get channel information
     * @param channelId The ID of the channel
     * @return Channel struct
     */
    function getChannel(bytes32 channelId) external view returns (Channel memory) {
        return channels[channelId];
    }

    /**
     * @dev Get user's channels
     * @param user The user address
     * @return Array of channel IDs
     */
    function getUserChannels(address user) external view returns (bytes32[] memory) {
        return userChannels[user];
    }

    /**
     * @dev Check if a channel is active
     * @param channelId The ID of the channel
     * @return True if channel is open and active
     */
    function isChannelActive(bytes32 channelId) external view returns (bool) {
        return channels[channelId].isOpen;
    }

    /**
     * @dev Recover signer from message hash and signature
     * @param messageHash The message hash
     * @param signature The signature
     * @return The recovered signer address
     */
    function recoverSigner(bytes32 messageHash, bytes32 signature) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := signature
            s := add(signature, 0x20)
            v := byte(0, add(signature, 0x40))
        }
        
        return ecrecover(messageHash, v, r, s);
    }

    /**
     * @dev Get channel balance for a participant
     * @param channelId The ID of the channel
     * @param participant The participant address
     * @return The participant's balance in the channel
     */
    function getParticipantBalance(bytes32 channelId, address participant) external view returns (uint256) {
        Channel memory channel = channels[channelId];
        
        if (participant == channel.participant1) {
            return channel.participant1Balance;
        } else if (participant == channel.participant2) {
            return channel.participant2Balance;
        }
        
        return 0;
    }

    /**
     * @dev Calculate channel ID for two participants
     * @param participant1 First participant
     * @param participant2 Second participant
     * @param timestamp Creation timestamp
     * @return The calculated channel ID
     */
    function calculateChannelId(
        address participant1,
        address participant2,
        uint256 timestamp
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(participant1, participant2, timestamp));
    }
}
