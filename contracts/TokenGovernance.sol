// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title TokenGovernance - On-chain governance for ERC20Votes token
/// @author Kyle Tredway
/// @notice Allows token holders to propose, vote on, and execute on-chain governance actions
/// @dev Built on OpenZeppelin Governor framework with timelock, quorum, and configurable settings

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract TokenGovernance is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    // ===== EVENTS =====
    event ProposalCreatedWithDescription(uint256 proposalId, string description);
    event GovernorVoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight);
    event ProposalExecutedWithId(uint256 proposalId);
    event ProposalCanceledWithId(uint256 proposalId);

    // ===== CONSTRUCTOR =====

    /// @notice Deploy the governance contract
    /// @param _token The ERC20Votes token used for voting power
    /// @param _timelock The TimelockController that executes passed proposals
    constructor(
        IVotes _token,
        TimelockController _timelock
    )
        Governor("TokenGovernance")
        GovernorSettings(
            7200,   // votingDelay: 1 day in blocks
            50400,  // votingPeriod: 1 week in blocks
            1000e18 // proposalThreshold: 1,000 tokens
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
        GovernorTimelockControl(_timelock)
    {}

    // ===== VIEW FUNCTIONS =====

    /// @notice Returns the voting delay in blocks
    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    /// @notice Returns the voting period in blocks
    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    /// @notice Returns the quorum required at a specific block
    /// @param blockNumber The block number to check quorum at
    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    /// @notice Returns the proposal threshold — minimum tokens to create a proposal
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    /// @notice Returns the state of a proposal
    /// @param proposalId The ID of the proposal
    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    /// @notice Returns whether an account has voted on a proposal
    /// @param proposalId The ID of the proposal
    /// @param account The address to check
    function hasVoted(uint256 proposalId, address account)
        public
        view
        override(IGovernor, GovernorCountingSimple)
        returns (bool)
    {
        return super.hasVoted(proposalId, account);
    }

    // ===== PROPOSAL FUNCTIONS =====

    /// @notice Create a new governance proposal
    /// @param targets Contract addresses to call if proposal passes
    /// @param values ETH values to send with each call
    /// @param calldatas Encoded function calls to execute
    /// @param description Human readable description of the proposal
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    )
        public
        override(Governor, IGovernor)
        returns (uint256)
    {
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        emit ProposalCreatedWithDescription(proposalId, description);
        return proposalId;
    }

    /// @notice Cast a vote on a proposal
    /// @param proposalId The ID of the proposal
    /// @param support 0 = Against, 1 = For, 2 = Abstain
    function castVote(uint256 proposalId, uint8 support)
        public
        override(Governor, IGovernor)
        returns (uint256)
    {
        uint256 weight = super.castVote(proposalId, support);
        emit GovernorVoteCast(msg.sender, proposalId, support, weight);
        return weight;
    }

    /// @notice Cast a vote with a reason
    /// @param proposalId The ID of the proposal
    /// @param support 0 = Against, 1 = For, 2 = Abstain
    /// @param reason Text explanation of your vote
    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    )
        public
        override(Governor, IGovernor)
        returns (uint256)
    {
        uint256 weight = super.castVoteWithReason(proposalId, support, reason);
        emit GovernorVoteCast(msg.sender, proposalId, support, weight);
        return weight;
    }

    // ===== REQUIRED OVERRIDES =====

    /// @dev Override required by Solidity for Governor and GovernorTimelockControl
    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
        emit ProposalExecutedWithId(proposalId);
    }

    /// @dev Override required by Solidity for Governor and GovernorTimelockControl
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        uint256 proposalId = super._cancel(targets, values, calldatas, descriptionHash);
        emit ProposalCanceledWithId(proposalId);
        return proposalId;
    }

    /// @dev Override required by Solidity for Governor and GovernorTimelockControl
    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    /// @dev Override required by Solidity for Governor and GovernorTimelockControl
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}