// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title SampleToken - A full-featured ERC20 governance token
/// @author Kyle Tredway
/// @notice Demonstrates a capped, burnable, pausable ERC20 token with voting power and role-based access control
/// @dev Uses OpenZeppelin libraries: ERC20, ERC20Burnable, ERC20Capped, ERC20Pausable, ERC20Votes, AccessControl

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SampleToken is
    ERC20,
    ERC20Capped,
    ERC20Burnable,
    ERC20Pausable,
    ERC20Permit,
    ERC20Votes,
    AccessControl
{
    // ===== ROLES =====
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ===== EVENTS =====
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event TokenPaused(address indexed account);
    event TokenUnpaused(address indexed account);

    /// @notice Constructor: sets token name, symbol, cap, and initial supply
    /// @param name Token name
    /// @param symbol Token symbol
    /// @param cap Maximum supply of tokens
    /// @param initialSupply Initial number of tokens minted to deployer
    constructor(
        string memory name,
        string memory symbol,
        uint256 cap,
        uint256 initialSupply
    )
        ERC20(name, symbol)
        ERC20Capped(cap)
        ERC20Permit(name)
    {
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        // Mint initial supply and emit event
        require(initialSupply <= cap, "Initial supply exceeds cap");
        _mint(msg.sender, initialSupply);
        emit TokensMinted(msg.sender, initialSupply);
    }

    // ===== PAUSE FUNCTIONS =====

    /// @notice Pause all token transfers
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
        emit TokenPaused(msg.sender);
    }

    /// @notice Resume all token transfers
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
        emit TokenUnpaused(msg.sender);
    }

    // ===== MINT FUNCTIONS =====

    /// @notice Mint new tokens to a given address
    /// @param to Recipient address
    /// @param amount Number of tokens to mint
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // ===== BURN FUNCTIONS =====

    /// @notice Burn tokens from your balance
    /// @param amount Number of tokens to burn
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    /// @notice Burn tokens from another account using allowance
    /// @param account The address to burn tokens from
    /// @param amount Number of tokens to burn
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }

    // ===== VOTING FUNCTIONS =====

    /// @notice Delegate voting power to yourself to activate voting
    /// @dev Must be called before participating in governance votes
    function selfDelegate() external {
        delegate(msg.sender);
    }

    // ===== ROLE PROTECTION =====

    /// @dev Prevents admin from renouncing DEFAULT_ADMIN_ROLE
    function renounceRole(bytes32 role, address account) public override {
        require(role != DEFAULT_ADMIN_ROLE, "Cannot renounce admin role");
        super.renounceRole(role, account);
    }

    // ===== REQUIRED OVERRIDES =====

    /// @dev Override required by Solidity for ERC20, ERC20Pausable
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }

    /// @dev Override required by Solidity for ERC20, ERC20Capped, ERC20Votes
    function _mint(address account, uint256 amount)
        internal
        override(ERC20, ERC20Capped, ERC20Votes)
    {
        super._mint(account, amount);
    }

    /// @dev Override required by Solidity for ERC20, ERC20Votes
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    /// @dev Override required by Solidity for ERC20, ERC20Votes
    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}