# TOKEN STAKING CONTRACT

[![Verified on Etherscan](https://img.shields.io/badge/Etherscan-Verified-brightgreen)](https://sepolia.etherscan.io/address/0x0823D964ECC9ed0975761F0D08Ac34F21B936D04#code)

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)
![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)

Built by [Tredway Development](https://kyle-tredway-portfolio.netlify.app/) — professional Solidity smart contract packages for Web3 companies.

A secure and production-ready ERC-20 token staking contract built with Solidity, OpenZeppelin, and Hardhat.

> ⚠️ This contract has not been professionally audited. A full security audit is strongly recommended before any mainnet deployment.


This project demonstrates a complete staking rewards system including:

Smart contract development
Automated testing
Deployment scripting
Fixed duration reward periods
Real-time reward accumulation
Role-based administrative permissions
Security best practices

This repository represents the fourth package in a Web3 infrastructure suite, building on top of the ERC-20 Token Launch, Token Vesting, and Merkle Airdrop contracts to complete a full token ecosystem.


## PROJECT GOALS

The purpose of this project is to demonstrate how a modern staking rewards system should be designed for real-world use.

The system includes common features required by token staking protocols:

Fixed duration reward periods with a configurable duration
Per-second reward rate calculation based on total pool funding
Real-time reward accumulation using the Synthetix rewards model
Free unstaking at any time regardless of reward period status
Role-based administrative permissions
Emergency pause capability
Event logging for transparency

These patterns are widely used in production DeFi applications.


## SMART CONTRACT FEATURES

### TOKEN STAKING

SAME TOKEN FOR STAKING AND REWARDS

The contract supports using the same ERC-20 token for both staking and reward distribution.
This is a deliberate design choice that simplifies token economics for projects with a single token.

FIXED DURATION REWARD PERIODS

Admins configure a reward period duration in seconds using setRewardPeriod.
Admins then fund the reward pool and start distribution using startRewardPeriod.
The reward rate is calculated as total reward divided by period duration.
A new period cannot be started until the current one has finished.
The period duration cannot be changed while a period is active.

REAL-TIME REWARD ACCUMULATION

Rewards accumulate on a per-second basis using the rewardPerToken model.
Each staker earns proportionally to their share of the total staked supply.
Rewards accumulate indefinitely after the period ends and never expire.
Precision loss of approximately 2-3 tokens per 10,000 is permanently locked by design.

STAKING

Users can stake tokens at any time during an active reward period.
Staking is blocked before a reward period starts and when the contract is paused.
Every stake emits a Staked event.

FREE UNSTAKING

Users can unstake any amount at any time regardless of reward period status.
Unstaking is never blocked — only staking is affected by pause and period state.
Every unstake emits an Unstaked event.

CLAIM REWARDS

Users can claim accumulated rewards at any time using claimReward.
Every claim emits a RewardClaimed event and updates the totalClaimed tracker.

UNSTAKE AND CLAIM

Users can exit their full position in a single transaction using unstakeAndClaim.
This unstakes the full balance and claims all pending rewards atomically.

ROLE-BASED PERMISSIONS

Administrative actions are protected using OpenZeppelin's AccessControl.
Roles include:

ROLE                DESCRIPTION

DEFAULT_ADMIN_ROLE  Can manage roles
ADMIN_ROLE          Can manage reward periods, pause, and recover tokens

EMERGENCY PAUSE

Authorized accounts with the ADMIN_ROLE can pause all staking activity.
Unstaking and reward claiming remain available while paused.
Staking resumes when the contract is unpaused.

TOKEN RECOVERY

Admins can recover accidentally sent tokens using recoverTokens.
The staking token and reward token cannot be recovered by design.
Every recovery emits a TokensRecovered event.

ADMIN ROLE PROTECTION

The contract prevents the admin from accidentally renouncing the DEFAULT_ADMIN_ROLE.
This ensures the contract can never be permanently locked without an administrator.

EVENT TRACKING

The contract emits events for all important actions:

Staked, Unstaked, RewardClaimed, RewardPeriodStarted, RewardPeriodSet, TokensRecovered


## TECHNOLOGY STACK

This project was built using the following tools:

Solidity – Smart contract programming language

Hardhat – Ethereum development environment

Ethers.js – Contract interaction library

OpenZeppelin Contracts – Secure smart contract libraries

Mocha & Chai – JavaScript testing framework

Alchemy – Ethereum RPC provider

Sepolia Test Network – Deployment environment


## PROJECT STRUCTURE

contracts/
    TokenStaking.sol

scripts/
    deploy-staking.js

test/
    TokenStaking.test.js

hardhat.config.js
.env

CONTRACTS

Contains the staking contract implementation.

SCRIPTS

Contains the deployment script for the staking contract.

TESTS

Contains 74 automated tests verifying all major contract behaviors.


## SMART CONTRACT ARCHITECTURE

The TokenStaking contract extends the following OpenZeppelin modules:

ReentrancyGuard, AccessControl, Pausable, SafeERC20, IERC20

This modular architecture provides strong security and reusable functionality while keeping the contract easy to audit.

Key state variables:

rewardRate             – Tokens distributed per second across all stakers
rewardPeriod           – Configured duration of each reward period in seconds
periodFinish           – Timestamp when the current reward period ends
lastUpdateTime         – Last time the reward state was updated
rewardPerTokenStored   – Accumulated reward per token up to lastUpdateTime
totalSupply            – Total tokens currently staked in the contract
totalClaimed           – Cumulative rewards claimed across all users
balanceOf              – Staked balance per address
userRewardPerTokenPaid – Snapshot of rewardPerToken at last user update
pendingRewards         – Unclaimed reward balance per address


## INSTALLATION

### CLONE THE REPOSITORY:

git clone https://github.com/Ktredway0128/token-staking

cd token-staking

### INSTALL DEPENDENCIES:

npm install

### COMPILE THE CONTRACTS:

npx hardhat compile

### RUN THE TEST SUITE:

npx hardhat test

### THE TESTS VALIDATE:

Staking, unstaking, and reward accumulation
Reward period configuration and lifecycle
Pause and unpause behavior
Admin role protection and access control
Token recovery functionality
Edge cases including zero balances and period boundaries


## ENVIRONMENT SETUP

Create a .env file in the root directory.

ALCHEMY_API_URL=YOUR_SEPOLIA_RPC_URL

DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY

ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

These values allow Hardhat to:

Connect to the Sepolia network
Sign transactions using the deployer's wallet


## DEPLOYMENT

### STEP 1 - Deploy the staking contract:

npx hardhat run scripts/deploy-staking.js --network sepolia

The deployment script requires the staking token address, reward token address, and admin address.
These can be the same token address if using a single token for both staking and rewards.

### STEP 2 - Set the reward period duration via the admin panel or script:

Call setRewardPeriod with the duration in seconds. Example for 30 days:

30 * 86400 = 2,592,000 seconds

### STEP 3 - Fund the reward pool and start the period:

Call startRewardPeriod with the total reward amount.
The contract will pull tokens from the admin wallet automatically.
Approve the contract to spend the reward tokens before calling this function.

### SEPOLIA TESTNET DEPLOYMENT

| Contract | Address | Etherscan |
|----------|---------|-----------|
| SampleToken | `0x036150039c33b1645080a9c913f96D4c65ccca48` | [View on Etherscan](https://sepolia.etherscan.io/address/0x036150039c33b1645080a9c913f96D4c65ccca48#code) |

| TokenStaking | `0x0823D964ECC9ed0975761F0D08Ac34F21B936D04` | [View on Etherscan](https://sepolia.etherscan.io/address/0x0823D964ECC9ed0975761F0D08Ac34F21B936D04#code) |

Deployed: 2026-04-06


## EXAMPLE TOKEN CONFIGURATION

Token Name: Sample Token
Token Symbol: STK
Reward Period: 30 days
Total Period Rewards: 10,000 STK

Example reward distribution:

Reward Rate:     0.00386 STK per second
Total Stakers:   Variable — rewards split proportionally by stake size
Unclaimed Rewards accumulate indefinitely and never expire


## DESIGN DECISIONS

SAME TOKEN ARCHITECTURE

When the staking and reward token are the same, raw contract balance includes both
staked principal and the reward pool. Reward tracking is handled entirely through
rewardRate, rewardPerTokenStored, and totalClaimed rather than relying on
token.balanceOf(address(this)). This is an intentional design choice.

PRECISION LOSS

Due to integer division in Solidity, approximately 2-3 tokens per 10,000 are permanently
locked in the contract at the end of each reward period. This is a known and accepted
tradeoff of the Synthetix rewards model. No recoverLeftoverRewards function is included
by design — these tokens are intentionally burned.

FREE UNSTAKING

Unstaking is never blocked regardless of pause state or reward period status.
This protects stakers and ensures they always maintain access to their principal.


## SECURITY PRACTICES

The contract uses well-established patterns from OpenZeppelin including:

Role-based permissions
Emergency pause mechanism
ReentrancyGuard on all staking, unstaking, and claiming functions
SafeERC20 for safe token transfers
Protected admin role renunciation
Audited contract libraries

These are common practices used in production smart contracts.


## EXAMPLE USE CASES

This staking contract can support many types of projects:

Protocol token staking with fixed reward periods
Liquidity mining programs
Community incentive distributions
DAO participation rewards
Game economy staking mechanics
DeFi yield programs


## FUTURE ENHANCEMENTS

This project serves as the fourth layer in a larger Web3 infrastructure package.

Possible upgrades include:

Governance DAO voting contract
Treasury management contract
Upgradeable proxy contracts
Multiple reward token support
Variable reward rate adjustment


## AUTHOR

Kyle Tredway

Smart Contract Developer / Token Launch Specialist

License

MIT License