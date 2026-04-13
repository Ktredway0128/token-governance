# TOKEN GOVERNANCE CONTRACT

[![Verified on Etherscan](https://img.shields.io/badge/Etherscan-Verified-brightgreen)](https://sepolia.etherscan.io/address/TO_BE_UPDATED#code)

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)
![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)

Built by [Tredway Development](https://kyle-tredway-portfolio.netlify.app/) — professional Solidity smart contract packages for Web3 companies.

A secure and production-ready on-chain governance system built with Solidity, OpenZeppelin Governor framework, and Hardhat.

> ⚠️ This contract has not been professionally audited. A full security audit is strongly recommended before any mainnet deployment.


This project demonstrates a complete token governance system including:

Smart contract development
Automated testing
Deployment scripting
Proposal creation and lifecycle management
Token-weighted voting with delegation
Timelock-controlled execution
Role-based administrative permissions
Security best practices

This repository represents the sixth and final package in a Web3 infrastructure suite, building on top of the ERC-20 Token Launch, Token Vesting, Merkle Airdrop, Token Staking, and Token Crowdsale contracts to complete a full token ecosystem.


## PROJECT GOALS

The purpose of this project is to demonstrate how a modern on-chain governance system should be designed for real-world use.

The system includes common features required by token governance protocols:

Proposal creation with configurable thresholds
Token-weighted voting with For, Against, and Abstain options
Configurable voting delay and voting period
Quorum enforcement as a percentage of total token supply
Timelock-controlled execution with a mandatory delay
Role-based administrative permissions
Full proposal lifecycle from Pending to Executed

These patterns are widely used in production DeFi governance applications.


## SMART CONTRACT FEATURES

### TOKEN GOVERNANCE

OPENZEPPELIN GOVERNOR FRAMEWORK

The contract is built on the OpenZeppelin Governor framework — the industry standard
for on-chain governance used by Uniswap, Compound, and Aave.
This provides a battle-tested foundation with well-audited security properties.

PROPOSAL CREATION

Any token holder meeting the proposal threshold can create a governance proposal.
Proposals specify target contracts, values, calldata, and a human-readable description.
Each proposal receives a unique ID derived from its contents.
Every proposal emits a ProposalCreatedWithDescription event for off-chain indexing.

VOTING DELAY

After a proposal is created it enters a Pending state for the configured voting delay.
The voting delay is set to 1 day (7,200 blocks) by default.
This gives token holders time to review proposals before voting begins.

VOTING PERIOD

Once the voting delay passes the proposal becomes Active and voting opens.
The voting period is set to 1 week (50,400 blocks) by default.
Token holders can cast For, Against, or Abstain votes.
Voting power is based on token balance at the block the proposal was created.
Every vote emits a GovernorVoteCast event.

VOTE WITH REASON

Token holders can cast votes with an optional text reason explaining their position.
This promotes transparent and accountable governance participation.

QUORUM ENFORCEMENT

A minimum of 4% of the total token supply must participate for a proposal to pass.
If quorum is not reached the proposal moves to Defeated regardless of vote outcome.

PROPOSAL THRESHOLD

A minimum of 1,000 tokens is required to create a governance proposal.
This prevents spam proposals from accounts with negligible token holdings.

TIMELOCK EXECUTION

Passed proposals are queued in a TimelockController before execution.
The timelock enforces a mandatory 2 day delay between queue and execution.
This gives the community time to react to passed proposals before they take effect.
The TimelockController is the ultimate executor of all governance actions.

TOKEN DELEGATION

Token holders must delegate their voting power before participating in governance.
Holders can delegate to themselves using selfDelegate or to any other address.
Voting power is tracked using ERC20Votes checkpointing for snapshot accuracy.

PROPOSAL STATES

Proposals move through the following states during their lifecycle:

STATE        DESCRIPTION

Pending      Proposal created, waiting for voting delay to pass
Active       Voting is open
Canceled     Proposal was canceled by the proposer
Defeated     Quorum not reached or Against votes won
Succeeded    Quorum reached and For votes won
Queued       Proposal queued in the timelock
Expired      Timelock window passed without execution
Executed     Proposal successfully executed on-chain

ROLE-BASED PERMISSIONS

The TimelockController uses OpenZeppelin's AccessControl for role management.
Roles include:

ROLE                DESCRIPTION

PROPOSER_ROLE       Granted to the Governor contract — only Governor can queue
EXECUTOR_ROLE       Open to everyone — anyone can trigger execution
TIMELOCK_ADMIN_ROLE Revoked from deployer after setup for full decentralization

EVENT TRACKING

The contract emits events for all important actions:

ProposalCreatedWithDescription, GovernorVoteCast, ProposalExecutedWithId, ProposalCanceledWithId


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
    SampleToken.sol
    TokenGovernance.sol

scripts/
    deploy-governance.js

test/
    SampleToken.test.js
    TokenGovernance.test.js

hardhat.config.js
.env

CONTRACTS

Contains the ERC20Votes governance token and the TokenGovernance governor implementation.

SCRIPTS

Contains the deployment script for all three governance contracts — SampleToken, TimelockController, and TokenGovernance.

TESTS

Contains 68 automated tests verifying all major contract behaviors across both contracts.


## SMART CONTRACT ARCHITECTURE

The TokenGovernance contract extends the following OpenZeppelin Governor modules:

Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl

The SampleToken contract extends the following OpenZeppelin modules:

ERC20, ERC20Capped, ERC20Burnable, ERC20Pausable, ERC20Permit, ERC20Votes, AccessControl

This modular architecture provides strong security and reusable functionality while keeping the contracts easy to audit.

Key governance parameters:

votingDelay          – 7,200 blocks (~1 day) before voting opens after proposal creation
votingPeriod         – 50,400 blocks (~1 week) that voting remains open
proposalThreshold    – 1,000 tokens minimum to create a proposal
quorumFraction       – 4% of total supply must participate for a proposal to pass
timelockDelay        – 172,800 seconds (2 days) between queue and execution


## INSTALLATION

### CLONE THE REPOSITORY:

git clone https://github.com/Ktredway0128/token-governance

cd token-governance

### INSTALL DEPENDENCIES:

npm install

### COMPILE THE CONTRACTS:

npx hardhat compile

### RUN THE TEST SUITE:

npx hardhat test

### THE TESTS VALIDATE:

Proposal creation and lifecycle management
Voting delay and voting period enforcement
For, Against, and Abstain vote casting
Quorum enforcement and proposal outcomes
Timelock queue and execution flow
Full end-to-end governance lifecycle
Edge cases including insufficient tokens and duplicate votes


## ENVIRONMENT SETUP

Create a .env file in the root directory.

ALCHEMY_API_URL=YOUR_SEPOLIA_RPC_URL

DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY

ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

These values allow Hardhat to:

Connect to the Sepolia network
Sign transactions using the deployer's wallet


## DEPLOYMENT

### STEP 1 - Deploy all three contracts:

npx hardhat run scripts/deploy-governance.js --network sepolia

The deployment script deploys SampleToken, TimelockController, and TokenGovernance
in the correct order and automatically configures all required roles.

### STEP 2 - Delegate voting power:

Token holders must call delegate or selfDelegate before their tokens count as voting power.
This is required by the ERC20Votes standard and must be done before any proposal is created.

### STEP 3 - Create a proposal:

Call propose with target contracts, values, calldata, and a description.
The caller must hold at least 1,000 tokens to meet the proposal threshold.

### STEP 4 - Vote on the proposal:

After the 1 day voting delay the proposal becomes Active.
Token holders call castVote with 0 (Against), 1 (For), or 2 (Abstain).

### STEP 5 - Queue the proposal:

After the 1 week voting period if the proposal Succeeded call queue.
This submits the proposal to the TimelockController.

### STEP 6 - Execute the proposal:

After the 2 day timelock delay call execute.
The proposal actions are executed on-chain automatically.

### SEPOLIA TESTNET DEPLOYMENT

| Contract | Address | Etherscan |
|----------|---------|-----------|
| SampleToken | `TO_BE_UPDATED` | [View on Etherscan](https://sepolia.etherscan.io/address/TO_BE_UPDATED#code) |
| TimelockController | `TO_BE_UPDATED` | [View on Etherscan](https://sepolia.etherscan.io/address/TO_BE_UPDATED#code) |
| TokenGovernance | `TO_BE_UPDATED` | [View on Etherscan](https://sepolia.etherscan.io/address/TO_BE_UPDATED#code) |

Deployed: TO_BE_UPDATED


## EXAMPLE TOKEN CONFIGURATION

Token Name: Sample Token
Token Symbol: STK
Token Cap: 1,000,000 STK
Initial Supply: 100,000 STK
Proposal Threshold: 1,000 STK
Quorum: 4% of total supply
Voting Delay: 1 day
Voting Period: 1 week
Timelock Delay: 2 days


## DESIGN DECISIONS

ERC20VOTES TOKEN

Standard ERC20 tokens cannot be used for governance because they lack voting power
checkpointing. SampleToken extends ERC20Votes which snapshots balances at specific
blocks. This prevents voting power manipulation between proposal creation and vote casting.

DELEGATION REQUIREMENT

Token holders must explicitly delegate their voting power before voting.
This is a deliberate design choice from the ERC20Votes standard — it prevents
accidental governance participation and allows holders to delegate to representatives.

TIMELOCK DECENTRALIZATION

After deployment the TIMELOCK_ADMIN_ROLE is revoked from the deployer.
This ensures no single account can bypass the governance process.
All changes to the system must go through a successful governance vote.

OPEN EXECUTION

The EXECUTOR_ROLE is granted to address(0) meaning anyone can trigger execution
of a passed and queued proposal after the timelock delay. This ensures proposals
cannot be censored or blocked by a single executor.


## SECURITY PRACTICES

The contract uses well-established patterns from OpenZeppelin including:

Battle-tested Governor framework used by major DeFi protocols
TimelockController for mandatory execution delay
ERC20Votes checkpointing to prevent flash loan voting attacks
Role-based permissions with full decentralization after deployment
Audited contract libraries

These are common practices used in production smart contracts.


## EXAMPLE USE CASES

This governance contract can support many types of projects:

Protocol parameter updates via token holder vote
Treasury fund allocation and spending proposals
Smart contract upgrade approvals
Community grant programs
DAO operational decisions
Fee structure changes


## FUTURE ENHANCEMENTS

This project serves as the sixth and final layer in a larger Web3 infrastructure package.

Possible upgrades include:

Upgradeable proxy contracts for post-deployment improvements
Multi-sig guardian for emergency proposal cancellation
On-chain treasury management integration
Cross-chain governance bridging
Gasless voting via EIP-712 signatures


## AUTHOR

Kyle Tredway

Smart Contract Developer / Token Launch Specialist

License

MIT License