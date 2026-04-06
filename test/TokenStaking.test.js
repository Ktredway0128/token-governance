const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenStaking", function () {
  let staking;
  let stakingToken;
  let owner;
  let user1;
  let user2;

  const ONE_DAY = 86400;
  const THIRTY_DAYS = ONE_DAY * 30;
  const STAKE_AMOUNT = ethers.utils.parseUnits("1000", 18);
  const REWARD_AMOUNT = ethers.utils.parseUnits("10000", 18);

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy a mock ERC20 token to use as both staking and reward token
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    stakingToken = await ERC20Mock.deploy(
      "Sample Token",
      "STK",
      ethers.utils.parseUnits("1000000", 18)
    );
    await stakingToken.deployed();

    // Deploy staking contract
    const TokenStaking = await ethers.getContractFactory("TokenStaking");
    staking = await TokenStaking.deploy(
      stakingToken.address,
      stakingToken.address,
      owner.address
    );
    await staking.deployed();

    // Fund users with tokens
    await stakingToken.transfer(user1.address, ethers.utils.parseUnits("10000", 18));
    await stakingToken.transfer(user2.address, ethers.utils.parseUnits("10000", 18));

    // Approve staking contract for users
    await stakingToken.connect(user1).approve(staking.address, ethers.constants.MaxUint256);
    await stakingToken.connect(user2).approve(staking.address, ethers.constants.MaxUint256);

    // Approve staking contract for owner (for reward funding)
    await stakingToken.approve(staking.address, ethers.constants.MaxUint256);
  });

  // ===== DEPLOYMENT =====
  describe("Deployment", function () {
    it("Should set staking token correctly", async function () {
      expect(await staking.stakingToken()).to.equal(stakingToken.address);
    });

    it("Should set reward token correctly", async function () {
      expect(await staking.rewardToken()).to.equal(stakingToken.address);
    });

    it("Should grant admin role to deployer", async function () {
      const ADMIN_ROLE = await staking.ADMIN_ROLE();
      expect(await staking.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should start with zero total supply", async function () {
      expect(await staking.totalSupply()).to.equal(0);
    });

    it("Should start unpaused", async function () {
      expect(await staking.paused()).to.be.false;
    });
  });

  // ===== SET REWARD PERIOD =====
  describe("setRewardPeriod", function () {
    it("Should set reward period correctly", async function () {
      await staking.setRewardPeriod(THIRTY_DAYS);
      expect(await staking.rewardPeriod()).to.equal(THIRTY_DAYS);
    });

    it("Should emit RewardPeriodSet event", async function () {
      await expect(staking.setRewardPeriod(THIRTY_DAYS))
        .to.emit(staking, "RewardPeriodSet")
        .withArgs(THIRTY_DAYS);
    });

    it("Should revert if period is zero", async function () {
      await expect(staking.setRewardPeriod(0))
        .to.be.revertedWith("Period must be greater than 0");
    });

    it("Should revert if called by non admin", async function () {
      await expect(staking.connect(user1).setRewardPeriod(THIRTY_DAYS))
        .to.be.reverted;
    });

    it("Should revert if current period is still active", async function () {
      await staking.setRewardPeriod(THIRTY_DAYS);
      await staking.startRewardPeriod(REWARD_AMOUNT);
      await expect(staking.setRewardPeriod(THIRTY_DAYS))
        .to.be.revertedWith("Current period still active");
    });
  });

  // ===== START REWARD PERIOD =====
  describe("startRewardPeriod", function () {
    beforeEach(async function () {
      await staking.setRewardPeriod(THIRTY_DAYS);
    });

    it("Should start reward period correctly", async function () {
      await staking.startRewardPeriod(REWARD_AMOUNT);
      expect(await staking.rewardRate()).to.be.gt(0);
    });

    it("Should emit RewardPeriodStarted event", async function () {
      await expect(staking.startRewardPeriod(REWARD_AMOUNT))
        .to.emit(staking, "RewardPeriodStarted")
        .withArgs(REWARD_AMOUNT);
    });

    it("Should set periodFinish correctly", async function () {
      await staking.startRewardPeriod(REWARD_AMOUNT);
      const block = await ethers.provider.getBlock("latest");
      expect(await staking.periodFinish()).to.be.closeTo(
        block.timestamp + THIRTY_DAYS,
        5
      );
    });

    it("Should revert if reward period not set", async function () {
      const TokenStaking = await ethers.getContractFactory("TokenStaking");
      const newStaking = await TokenStaking.deploy(
        stakingToken.address,
        stakingToken.address,
        owner.address
      );
      await stakingToken.approve(newStaking.address, ethers.constants.MaxUint256);
      await expect(newStaking.startRewardPeriod(REWARD_AMOUNT))
        .to.be.revertedWith("Reward period not set");
    });

    it("Should revert if reward is zero", async function () {
      await expect(staking.startRewardPeriod(0))
        .to.be.revertedWith("Reward must be greater than 0");
    });

    it("Should revert if previous period not finished", async function () {
      await staking.startRewardPeriod(REWARD_AMOUNT);
      await expect(staking.startRewardPeriod(REWARD_AMOUNT))
        .to.be.revertedWith("Previous period not finished");
    });

    it("Should revert if called by non admin", async function () {
      await expect(staking.connect(user1).startRewardPeriod(REWARD_AMOUNT))
        .to.be.reverted;
    });
  });

  // ===== STAKE =====
  describe("stake", function () {
    beforeEach(async function () {
      await staking.setRewardPeriod(THIRTY_DAYS);
      await staking.startRewardPeriod(REWARD_AMOUNT);
    });

    it("Should stake tokens correctly", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      expect(await staking.balanceOf(user1.address)).to.equal(STAKE_AMOUNT);
      expect(await staking.totalSupply()).to.equal(STAKE_AMOUNT);
    });

    it("Should emit Staked event", async function () {
      await expect(staking.connect(user1).stake(STAKE_AMOUNT))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, STAKE_AMOUNT);
    });

    it("Should transfer tokens from user to contract", async function () {
      const balanceBefore = await stakingToken.balanceOf(user1.address);
      await staking.connect(user1).stake(STAKE_AMOUNT);
      const balanceAfter = await stakingToken.balanceOf(user1.address);
      expect(balanceBefore.sub(balanceAfter)).to.equal(STAKE_AMOUNT);
    });

    it("Should revert if amount is zero", async function () {
      await expect(staking.connect(user1).stake(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert if paused", async function () {
      await staking.pause();
      await expect(staking.connect(user1).stake(STAKE_AMOUNT))
        .to.be.revertedWith("Pausable: paused");
    });

    it("Should revert if insufficient allowance", async function () {
      const TokenStaking = await ethers.getContractFactory("TokenStaking");
      const newStaking = await TokenStaking.deploy(
        stakingToken.address,
        stakingToken.address,
        owner.address
      );
      await expect(newStaking.connect(user1).stake(STAKE_AMOUNT))
        .to.be.reverted;
    });

    it("Should revert if no active reward period", async function () {
      const TokenStaking = await ethers.getContractFactory("TokenStaking");
      const newStaking = await TokenStaking.deploy(
        stakingToken.address,
        stakingToken.address,
        owner.address
      );
      await stakingToken.connect(user1).approve(newStaking.address, ethers.constants.MaxUint256);
      await expect(newStaking.connect(user1).stake(STAKE_AMOUNT))
        .to.be.revertedWith("No active reward period");
    });
  });

  // ===== UNSTAKE =====
  describe("unstake", function () {
    beforeEach(async function () {
      await staking.setRewardPeriod(THIRTY_DAYS);
      await staking.startRewardPeriod(REWARD_AMOUNT);
      await staking.connect(user1).stake(STAKE_AMOUNT);
    });

    it("Should unstake tokens correctly", async function () {
      await staking.connect(user1).unstake(STAKE_AMOUNT);
      expect(await staking.balanceOf(user1.address)).to.equal(0);
      expect(await staking.totalSupply()).to.equal(0);
    });

    it("Should emit Unstaked event", async function () {
      await expect(staking.connect(user1).unstake(STAKE_AMOUNT))
        .to.emit(staking, "Unstaked")
        .withArgs(user1.address, STAKE_AMOUNT);
    });

    it("Should transfer tokens back to user", async function () {
      const balanceBefore = await stakingToken.balanceOf(user1.address);
      await staking.connect(user1).unstake(STAKE_AMOUNT);
      const balanceAfter = await stakingToken.balanceOf(user1.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(STAKE_AMOUNT);
    });

    it("Should revert if amount is zero", async function () {
      await expect(staking.connect(user1).unstake(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert if insufficient staked balance", async function () {
      await expect(staking.connect(user1).unstake(STAKE_AMOUNT.add(1)))
        .to.be.revertedWith("Insufficient staked balance");
    });

    it("Should allow unstake when paused", async function () {
      await staking.pause();
      await expect(staking.connect(user1).unstake(STAKE_AMOUNT))
        .to.not.be.reverted; // unstake works even when paused
    });

    it("Should allow partial unstake", async function () {
      const halfAmount = STAKE_AMOUNT.div(2);
      await staking.connect(user1).unstake(halfAmount);
      expect(await staking.balanceOf(user1.address)).to.equal(halfAmount);
    });
  });

  // ===== CLAIM REWARD =====
  describe("claimReward", function () {
    beforeEach(async function () {
      await staking.setRewardPeriod(THIRTY_DAYS);
      await staking.startRewardPeriod(REWARD_AMOUNT);
      await staking.connect(user1).stake(STAKE_AMOUNT);
    });

    it("Should claim rewards correctly", async function () {
      await ethers.provider.send("evm_increaseTime", [ONE_DAY]);
      await ethers.provider.send("evm_mine");
      const earnedBefore = await staking.earned(user1.address);
      expect(earnedBefore).to.be.gt(0);
      await staking.connect(user1).claimReward();
      expect(await staking.pendingRewards(user1.address)).to.equal(0);
    });

    it("Should emit RewardClaimed event", async function () {
      await ethers.provider.send("evm_increaseTime", [ONE_DAY]);
      await ethers.provider.send("evm_mine");
      await expect(staking.connect(user1).claimReward())
        .to.emit(staking, "RewardClaimed");
    });

    it("Should not revert if no rewards to claim", async function () {
      await expect(staking.connect(user1).claimReward()).to.not.be.reverted;
    });

    it("Should allow ClaimReward when paused", async function () {
      await staking.pause();
      await expect(staking.connect(user1).claimReward())
        .to.not.be.reverted; // claimReward works even when paused
    });

    it("Should stop accumulating rewards after period ends", async function () {
      await ethers.provider.send("evm_increaseTime", [THIRTY_DAYS + ONE_DAY]);
      await ethers.provider.send("evm_mine");
      const earned1 = await staking.earned(user1.address);
      await ethers.provider.send("evm_increaseTime", [ONE_DAY]);
      await ethers.provider.send("evm_mine");
      const earned2 = await staking.earned(user1.address);
      expect(earned1).to.equal(earned2);
    });
  });

  // ===== UNSTAKE AND CLAIM =====
  describe("unstakeAndClaim", function () {
    beforeEach(async function () {
      await staking.setRewardPeriod(THIRTY_DAYS);
      await staking.startRewardPeriod(REWARD_AMOUNT);
      await staking.connect(user1).stake(STAKE_AMOUNT);
      await ethers.provider.send("evm_increaseTime", [ONE_DAY]);
      await ethers.provider.send("evm_mine");
    });

    it("Should unstake and claim in one transaction", async function () {
      await staking.connect(user1).unstakeAndClaim();
      expect(await staking.balanceOf(user1.address)).to.equal(0);
      expect(await staking.pendingRewards(user1.address)).to.equal(0);
    });

    it("Should emit Unstaked and RewardClaimed events", async function () {
      await expect(staking.connect(user1).unstakeAndClaim())
        .to.emit(staking, "Unstaked")
        .to.emit(staking, "RewardClaimed");
    });

    it("Should allow unstakeAndClaim when paused", async function () {
      await staking.pause();
      await expect(staking.connect(user1).unstakeAndClaim())
        .to.not.be.reverted; // unstakeAndClaim works even when paused
    });

    it("Should work even if no rewards accumulated", async function () {
      const TokenStaking = await ethers.getContractFactory("TokenStaking");
      const newStaking = await TokenStaking.deploy(
        stakingToken.address,
        stakingToken.address,
        owner.address
      );
      await stakingToken.approve(newStaking.address, ethers.constants.MaxUint256);
      await stakingToken.connect(user1).approve(newStaking.address, ethers.constants.MaxUint256);
      await newStaking.setRewardPeriod(THIRTY_DAYS);
      await newStaking.startRewardPeriod(REWARD_AMOUNT);
      await newStaking.connect(user1).stake(STAKE_AMOUNT);
      await expect(newStaking.connect(user1).unstakeAndClaim()).to.not.be.reverted;
    });
  });

  // ===== REWARD MATH =====
  describe("Reward Math", function () {
    beforeEach(async function () {
      await staking.setRewardPeriod(THIRTY_DAYS);
      await staking.startRewardPeriod(REWARD_AMOUNT);
    });

    it("Should calculate earned rewards correctly for single staker", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      await ethers.provider.send("evm_increaseTime", [THIRTY_DAYS]);
      await ethers.provider.send("evm_mine");
      const earned = await staking.earned(user1.address);
      expect(earned).to.be.closeTo(
        REWARD_AMOUNT,
        ethers.utils.parseUnits("1", 18)
      );
    });

    it("Should split rewards proportionally between two stakers", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      await staking.connect(user2).stake(STAKE_AMOUNT);
      await ethers.provider.send("evm_increaseTime", [THIRTY_DAYS]);
      await ethers.provider.send("evm_mine");
      const earned1 = await staking.earned(user1.address);
      const earned2 = await staking.earned(user2.address);
      expect(earned1).to.be.closeTo(earned2, ethers.utils.parseUnits("1", 18));
    });

    it("Should return zero earned if nothing staked", async function () {
      expect(await staking.earned(user1.address)).to.equal(0);
    });

    it("Should return zero rewardPerToken if totalSupply is zero", async function () {
      expect(await staking.rewardPerToken()).to.equal(0);
    });

    it("Should calculate totalRewardForPeriod correctly", async function () {
      const total = await staking.totalRewardForPeriod();
      expect(total).to.be.closeTo(
        REWARD_AMOUNT,
        ethers.utils.parseUnits("1", 18)
      );
    });

    it("Should return correct contract balance", async function () {
      const balance = await staking.getContractBalance();
      expect(balance).to.equal(REWARD_AMOUNT);
    });
  });

  // ===== PAUSE / UNPAUSE =====
  describe("Pause and Unpause", function () {
    it("Should pause correctly", async function () {
      await staking.pause();
      expect(await staking.paused()).to.be.true;
    });

    it("Should unpause correctly", async function () {
      await staking.pause();
      await staking.unpause();
      expect(await staking.paused()).to.be.false;
    });

    it("Should revert pause if called by non admin", async function () {
      await expect(staking.connect(user1).pause()).to.be.reverted;
    });

    it("Should revert unpause if called by non admin", async function () {
      await staking.pause();
      await expect(staking.connect(user1).unpause()).to.be.reverted;
    });
  });

  // ===== RECOVER TOKENS =====
  describe("recoverTokens", function () {
    it("Should recover accidentally sent tokens", async function () {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const randomToken = await ERC20Mock.deploy(
        "Random Token",
        "RND",
        ethers.utils.parseUnits("1000", 18)
      );
      await randomToken.transfer(staking.address, ethers.utils.parseUnits("100", 18));
      await staking.recoverTokens(randomToken.address, ethers.utils.parseUnits("100", 18));
      expect(await randomToken.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("1000", 18)
      );
    });

    it("Should revert if trying to recover staking token", async function () {
      await expect(
        staking.recoverTokens(stakingToken.address, ethers.utils.parseUnits("100", 18))
      ).to.be.revertedWith("Cannot recover staking token");
    });

    it("Should revert if trying to recover reward token", async function () {
      await expect(
        staking.recoverTokens(stakingToken.address, ethers.utils.parseUnits("100", 18))
      ).to.be.revertedWith("Cannot recover staking token");
    });

    it("Should revert if called by non admin", async function () {
      await expect(
        staking.connect(user1).recoverTokens(
          stakingToken.address,
          ethers.utils.parseUnits("100", 18)
        )
      ).to.be.reverted;
    });

    it("Should emit TokensRecovered event", async function () {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const randomToken = await ERC20Mock.deploy(
        "Random Token",
        "RND",
        ethers.utils.parseUnits("1000", 18)
      );
      await randomToken.transfer(staking.address, ethers.utils.parseUnits("100", 18));
      await expect(
        staking.recoverTokens(randomToken.address, ethers.utils.parseUnits("100", 18))
      ).to.emit(staking, "TokensRecovered");
    });
  
  });
});