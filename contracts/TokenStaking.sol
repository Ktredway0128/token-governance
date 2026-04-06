// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract TokenStaking is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    // ===== ROLES =====
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ===== TOKENS =====
    IERC20 public stakingToken;
    IERC20 public rewardToken;

    // ===== REWARD PERIOD =====
    uint256 public rewardRate;
    uint256 public rewardPeriod;
    uint256 public periodFinish;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    // ===== STAKING TRACKING =====
    uint256 public totalSupply;
    uint256 public totalClaimed;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public pendingRewards;

    // ===== EVENTS =====
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardPeriodStarted(uint256 reward);
    event RewardPeriodSet(uint256 newPeriod);
    event TokensRecovered(address indexed token, uint256 amount);

    // ===== CONSTRUCTOR =====
    constructor(
        address _stakingToken,
        address _rewardToken,
        address _admin
    ) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken != address(0), "Invalid reward token");
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    // ===== MODIFIERS =====

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            pendingRewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // ===== VIEW FUNCTIONS =====

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + (
            (lastTimeRewardApplicable() - lastUpdateTime)
            * rewardRate
            * 1e18
            / totalSupply
        );
    }

    function earned(address account) public view returns (uint256) {
        return (
            balanceOf[account]
            * (rewardPerToken() - userRewardPerTokenPaid[account])
            / 1e18
        ) + pendingRewards[account];
    }

    function totalRewardForPeriod() external view returns (uint256) {
        return rewardRate * rewardPeriod;
    }

    function getContractBalance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }

    // ===== USER FUNCTIONS =====

    function stake(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        require(amount > 0, "Amount must be greater than 0");
        require(block.timestamp < periodFinish, "No active reward period");
        totalSupply += amount;
        balanceOf[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount)
        external
        nonReentrant
        updateReward(msg.sender)
    {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient staked balance");
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function claimReward()
        external
        nonReentrant
        updateReward(msg.sender)
    
    {
        uint256 reward = pendingRewards[msg.sender];
        if (reward > 0) {
            pendingRewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            totalClaimed += reward;
            emit RewardClaimed(msg.sender, reward);
        }
    }

    function unstakeAndClaim()
        external
        nonReentrant
        updateReward(msg.sender)
    {
        uint256 amount = balanceOf[msg.sender];
        uint256 reward = pendingRewards[msg.sender];

        if (amount > 0) {
            totalSupply -= amount;
            balanceOf[msg.sender] = 0;
            stakingToken.safeTransfer(msg.sender, amount);
            emit Unstaked(msg.sender, amount);
        }

        if (reward > 0) {
            pendingRewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            totalClaimed += reward;
            emit RewardClaimed(msg.sender, reward);
        }
    }

    // ===== ADMIN FUNCTIONS =====

    function startRewardPeriod(uint256 reward)
        external
        onlyRole(ADMIN_ROLE)
        updateReward(address(0))
    {
        require(block.timestamp >= periodFinish, "Previous period not finished");
        require(rewardPeriod > 0, "Reward period not set");
        require(reward > 0, "Reward must be greater than 0");
        rewardRate = reward / rewardPeriod;
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardPeriod;
        rewardToken.safeTransferFrom(msg.sender, address(this), reward);
        emit RewardPeriodStarted(reward);
    }

    function setRewardPeriod(uint256 period)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(block.timestamp >= periodFinish, "Current period still active");
        require(period > 0, "Period must be greater than 0");
        rewardPeriod = period;
        emit RewardPeriodSet(period);
    }

    function recoverTokens(address tokenAddress, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(tokenAddress != address(stakingToken), "Cannot recover staking token");
        require(tokenAddress != address(rewardToken), "Cannot recover reward token");
        IERC20(tokenAddress).safeTransfer(msg.sender, amount);
        emit TokensRecovered(tokenAddress, amount);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}