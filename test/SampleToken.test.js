const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SampleToken", function () {
  let Token,
      token,
      owner,
      addr1,
      addr2;

  // This runs before each test
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    Token = await ethers.getContractFactory("SampleToken");
    token = await Token.deploy(
      "Sample Token",
      "STK",
      ethers.utils.parseUnits("1000000", 18),
      ethers.utils.parseUnits("100000", 18)
    );
    await token.deployed();
  });

  it("should set the right name, symbol, cap, and initial supply", async function () {
    expect(await token.name()).to.equal("Sample Token");
    expect(await token.symbol()).to.equal("STK");

    expect((await token.cap()).toString()).to.equal(
      ethers.utils.parseUnits("1000000", 18).toString()
    );

    expect((await token.totalSupply()).toString()).to.equal(
      ethers.utils.parseUnits("100000", 18).toString()
    );

    expect((await token.balanceOf(owner.address)).toString()).to.equal(
      ethers.utils.parseUnits("100000", 18).toString()
    );
  });

  describe("Transfers", function () {
    it("Owner can transfer tokens to another account", async function () {
      const transferAmount = ethers.utils.parseUnits("1000", 18);

      await expect(token.connect(owner).transfer(addr1.address, transferAmount))
        .to.not.be.reverted;

      const ownerBalance = await token.balanceOf(owner.address);
      const addr1Balance = await token.balanceOf(addr1.address);

      expect(ownerBalance.toString()).to.equal(
        ethers.utils.parseUnits("99000", 18).toString()
      );
      expect(addr1Balance.toString()).to.equal(
        transferAmount.toString()
      );

      console.log(`Transferred ${ethers.utils.formatUnits(transferAmount, 18)} tokens from owner to addr1`);
    });
  });

  describe("Minting", function () {
    it("Owner with MINTER_ROLE can mint and emit TokensMinted", async function () {
      const mintAmount = ethers.utils.parseUnits("5000", 18);

      await expect(token.connect(owner).mint(addr1.address, mintAmount))
        .to.emit(token, "TokensMinted")
        .withArgs(addr1.address, mintAmount);

      console.log("Minted", ethers.utils.formatUnits(mintAmount, 18), "tokens to", addr1.address);

      const balance = await token.balanceOf(addr1.address);
      expect(balance.toString()).to.equal(mintAmount.toString());
    });

    it("Non-MINTER_ROLE cannot mint", async function () {
      const mintAmount = ethers.utils.parseUnits("5000", 18);
      const minterRole = await token.MINTER_ROLE();

      await expect(
        token.connect(addr1).mint(addr1.address, mintAmount)
      ).to.be.revertedWith(
        `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${minterRole}`
      );
    });

    it("Cannot mint to zero address", async function () {
      const mintAmount = ethers.utils.parseUnits("1000", 18);

      await expect(
        token.connect(owner).mint(ethers.constants.AddressZero, mintAmount)
      ).to.be.revertedWith("Cannot mint to zero address");
    });
  });

  describe("Pausing", function () {
    it("Owner with PAUSER_ROLE can pause and emit TokensPaused", async function () {
      await expect(token.connect(owner).pause())
        .to.emit(token, "TokenPaused")
        .withArgs(owner.address);

      console.log("Token paused by", owner.address);

      await expect(
        token.connect(owner).transfer(addr1.address, 1)
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");
    });

    it("Owner with PAUSER_ROLE can unpause", async function () {
      await token.connect(owner).pause();

      await expect(token.connect(owner).unpause())
        .to.emit(token, "TokenUnpaused")
        .withArgs(owner.address);

      console.log("Token unpaused by", owner.address);

      await expect(
        token.connect(owner).transfer(addr1.address, 1)
      ).to.not.be.reverted;
    });

    it("Non-PAUSER_ROLE cannot pause", async function () {
      await expect(token.connect(addr1).pause()).to.be.revertedWith(
        `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${await token.PAUSER_ROLE()}`
      );
    });

    it("Non-PAUSER_ROLE cannot unpause", async function () {
      await token.connect(owner).pause();
      await expect(token.connect(addr1).unpause()).to.be.revertedWith(
        `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${await token.PAUSER_ROLE()}`
      );
    });
  });

  describe("Burning", function () {
    it("Owner can burn tokens and emit TokensBurned", async function () {
      const burnAmount = ethers.utils.parseUnits("1000", 18);

      await expect(token.connect(owner).burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(owner.address, burnAmount);

      console.log("Tokens burned by", owner.address);

      const balance = await token.balanceOf(owner.address);
      expect(balance.toString()).to.equal(
        ethers.utils.parseUnits("99000", 18).toString()
      );
    });

    it("Other account can burn their tokens after receiving them", async function () {
      const transferAmount = ethers.utils.parseUnits("5000", 18);
      const burnAmount = ethers.utils.parseUnits("2000", 18);

      await token.connect(owner).transfer(addr1.address, transferAmount);

      await expect(token.connect(addr1).burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(addr1.address, burnAmount);

      const balance = await token.balanceOf(addr1.address);
      expect(balance.toString()).to.equal(
        ethers.utils.parseUnits("3000", 18).toString()
      );
    });

    it("Cannot burn more than your balance", async function () {
      const overBurnAmount = ethers.utils.parseUnits("5000", 18);

      await expect(token.connect(addr1).burn(overBurnAmount))
        .to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("burnFrom emits TokensBurned event", async function () {
      const transferAmount = ethers.utils.parseUnits("5000", 18);
      const burnAmount = ethers.utils.parseUnits("2000", 18);

      await token.connect(owner).transfer(addr1.address, transferAmount);
      await token.connect(addr1).approve(owner.address, burnAmount);

      await expect(token.connect(owner).burnFrom(addr1.address, burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(addr1.address, burnAmount);

      const balance = await token.balanceOf(addr1.address);
      expect(balance.toString()).to.equal(
        ethers.utils.parseUnits("3000", 18).toString()
      );
    });

    it("burnFrom fails without allowance", async function () {
      const burnAmount = ethers.utils.parseUnits("1000", 18);
      const transferAmount = ethers.utils.parseUnits("5000", 18);

      await token.connect(owner).transfer(addr1.address, transferAmount);

      await expect(
        token.connect(owner).burnFrom(addr1.address, burnAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Cap", function () {
    it("Cannot mint beyond the max cap", async function () {
      const cap = await token.cap();
      const currentSupply = await token.totalSupply();
      const remaining = cap.sub(currentSupply);

      await expect(token.connect(owner).mint(addr1.address, remaining))
        .to.emit(token, "TokensMinted")
        .withArgs(addr1.address, remaining);

      await expect(token.connect(owner).mint(addr1.address, 1))
        .to.be.revertedWith("ERC20Capped: cap exceeded");
    });
  });

  describe("Access Control", function () {
    it("Admin can grant MINTER_ROLE", async function () {
      const minterRole = await token.MINTER_ROLE();

      await token.connect(owner).grantRole(minterRole, addr2.address);

      expect(await token.hasRole(minterRole, addr2.address)).to.equal(true);

      console.log("Admin granted MINTER_ROLE to", addr2.address);
    });

    it("Non-admin cannot grant MINTER_ROLE", async function () {
      const minterRole = await token.MINTER_ROLE();

      await expect(
        token.connect(addr2).grantRole(minterRole, addr2.address)
      ).to.be.reverted;
    });
  });

  describe("renounceRole Protection", function () {
    it("Admin cannot renounce DEFAULT_ADMIN_ROLE", async function () {
      const adminRole = await token.DEFAULT_ADMIN_ROLE();

      await expect(
        token.connect(owner).renounceRole(adminRole, owner.address)
      ).to.be.revertedWith("Cannot renounce admin role");
    });

    it("MINTER_ROLE can still be renounced", async function () {
      const minterRole = await token.MINTER_ROLE();

      await expect(
        token.connect(owner).renounceRole(minterRole, owner.address)
      ).to.not.be.reverted;

      expect(await token.hasRole(minterRole, owner.address)).to.equal(false);
    });
  });

  // ===== NEW V2 VOTING TESTS =====

  describe("Delegation", function () {
    it("Owner can self delegate and activate voting power", async function () {
      await token.connect(owner).selfDelegate();

      const votes = await token.getVotes(owner.address);
      expect(votes.toString()).to.equal(
        ethers.utils.parseUnits("100000", 18).toString()
      );

      console.log("Owner self delegated, voting power:", ethers.utils.formatUnits(votes, 18));
    });

    it("Owner can delegate voting power to addr1", async function () {
      await token.connect(owner).delegate(addr1.address);

      const votes = await token.getVotes(addr1.address);
      expect(votes.toString()).to.equal(
        ethers.utils.parseUnits("100000", 18).toString()
      );

      console.log("Owner delegated voting power to addr1:", ethers.utils.formatUnits(votes, 18));
    });

    it("Voting power is zero before delegation", async function () {
      const votes = await token.getVotes(owner.address);
      expect(votes.toString()).to.equal("0");

      console.log("Voting power before delegation:", votes.toString());
    });

    it("Voting power updates after transfer when delegated", async function () {
      const transferAmount = ethers.utils.parseUnits("10000", 18);

      // Both delegate to themselves first
      await token.connect(owner).selfDelegate();
      await token.connect(addr1).selfDelegate();

      const ownerVotesBefore = await token.getVotes(owner.address);

      // Transfer tokens
      await token.connect(owner).transfer(addr1.address, transferAmount);

      const ownerVotesAfter = await token.getVotes(owner.address);
      const addr1Votes = await token.getVotes(addr1.address);

      expect(ownerVotesAfter.toString()).to.equal(
        ethers.utils.parseUnits("90000", 18).toString()
      );
      expect(addr1Votes.toString()).to.equal(
        ethers.utils.parseUnits("10000", 18).toString()
      );

      console.log("Owner votes after transfer:", ethers.utils.formatUnits(ownerVotesAfter, 18));
      console.log("addr1 votes after transfer:", ethers.utils.formatUnits(addr1Votes, 18));
    });

    it("Delegates address is tracked correctly", async function () {
      await token.connect(owner).delegate(addr1.address);

      expect(await token.delegates(owner.address)).to.equal(addr1.address);

      console.log("Owner delegated to:", await token.delegates(owner.address));
    });
  });
});