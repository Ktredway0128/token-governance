const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenGovernance", function () {
  let token;
  let timelock;
  let governor;
  let owner;
  let proposer;
  let voter1;
  let voter2;
  let executor;

  // ===== TIME CONSTANTS =====
  const ONE_DAY_SECONDS = 86400;
  const TWO_DAYS_SECONDS = ONE_DAY_SECONDS * 2;
  const ONE_WEEK_SECONDS = ONE_DAY_SECONDS * 7;

  // ===== BLOCK CONSTANTS =====
  const VOTING_DELAY_BLOCKS = 7200;   // 1 day
  const VOTING_PERIOD_BLOCKS = 50400; // 1 week

  // ===== GOVERNANCE CONSTANTS =====
  const PROPOSAL_THRESHOLD = ethers.utils.parseUnits("1000", 18);
  const TIMELOCK_DELAY = TWO_DAYS_SECONDS;
  const MIN_DELAY = TWO_DAYS_SECONDS;

  // ===== TOKEN AMOUNTS =====
  const INITIAL_SUPPLY = ethers.utils.parseUnits("100000", 18);
  const CAP = ethers.utils.parseUnits("1000000", 18);
  const VOTER1_AMOUNT = ethers.utils.parseUnits("50000", 18);
  const VOTER2_AMOUNT = ethers.utils.parseUnits("30000", 18);
  const PROPOSER_AMOUNT = ethers.utils.parseUnits("5000", 18);

  // ===== HELPER: MINE BLOCKS =====
  async function mineBlocks(count) {
    await ethers.provider.send("hardhat_mine", [
      ethers.utils.hexValue(count)
    ]);
  }

  // ===== HELPER: INCREASE TIME AND MINE =====
  async function increaseTimeAndMine(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }

  // ===== HELPER: CREATE A BASIC PROPOSAL =====
  async function createProposal(description = "Proposal #1: Test Proposal") {
    const targets = [token.address];
    const values = [0];
    const calldatas = [
      token.interface.encodeFunctionData("transfer", [
        voter1.address,
        ethers.utils.parseUnits("100", 18)
      ])
    ];
    const tx = await governor.connect(proposer).propose(
      targets,
      values,
      calldatas,
      description
    );
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "ProposalCreated");
    return { proposalId: event.args.proposalId, targets, values, calldatas, description };
  }

  beforeEach(async function () {
    [owner, proposer, voter1, voter2, executor] = await ethers.getSigners();

    // ===== DEPLOY TOKEN =====
    const Token = await ethers.getContractFactory("SampleToken");
    token = await Token.deploy(
      "Sample Token",
      "STK",
      CAP,
      INITIAL_SUPPLY
    );
    await token.deployed();

    // ===== DISTRIBUTE TOKENS =====
    await token.connect(owner).transfer(voter1.address, VOTER1_AMOUNT);
    await token.connect(owner).transfer(voter2.address, VOTER2_AMOUNT);
    await token.connect(owner).transfer(proposer.address, PROPOSER_AMOUNT);

    // ===== DELEGATE VOTING POWER =====
    await token.connect(owner).selfDelegate();
    await token.connect(voter1).selfDelegate();
    await token.connect(voter2).selfDelegate();
    await token.connect(proposer).selfDelegate();

    // ===== DEPLOY TIMELOCK =====
    const Timelock = await ethers.getContractFactory("TimelockController");
    timelock = await Timelock.deploy(
      MIN_DELAY,
      [],  // proposers — will be set after governor deploys
      [],  // executors — will be set after governor deploys
      owner.address
    );
    await timelock.deployed();

    // ===== DEPLOY GOVERNOR =====
    const Governor = await ethers.getContractFactory("TokenGovernance");
    governor = await Governor.deploy(
      token.address,
      timelock.address
    );
    await governor.deployed();

    // ===== SET UP TIMELOCK ROLES =====
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const TIMELOCK_ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();

    // Governor gets proposer role
    await timelock.connect(owner).grantRole(PROPOSER_ROLE, governor.address);
    // Anyone can execute (address(0) means open execution)
    await timelock.connect(owner).grantRole(EXECUTOR_ROLE, ethers.constants.AddressZero);
    // Revoke owner admin role for full decentralization
    await timelock.connect(owner).revokeRole(TIMELOCK_ADMIN_ROLE, owner.address);

    // ===== GRANT TOKEN MINTER ROLE TO TIMELOCK =====
    // So governance can execute token operations
    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.connect(owner).grantRole(MINTER_ROLE, timelock.address);
  });

  // ===== DEPLOYMENT =====
  describe("Deployment", function () {
    it("Should set the correct token", async function () {
      expect(await governor.token()).to.equal(token.address);
    });

    it("Should set the correct timelock", async function () {
      expect(await governor.timelock()).to.equal(timelock.address);
    });

    it("Should set the correct voting delay", async function () {
      expect(await governor.votingDelay()).to.equal(VOTING_DELAY_BLOCKS);
    });

    it("Should set the correct voting period", async function () {
      expect(await governor.votingPeriod()).to.equal(VOTING_PERIOD_BLOCKS);
    });

    it("Should set the correct proposal threshold", async function () {
      expect(await governor.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
    });

    it("Should set the correct quorum fraction", async function () {
        expect(await governor.quorumDenominator()).to.not.equal(0);
        const numerator = await governor["quorumNumerator()"]();
        expect(numerator).to.equal(4);
    });

    it("Should set the correct timelock delay", async function () {
      expect(await timelock.getMinDelay()).to.equal(TIMELOCK_DELAY);
    });

    it("Governor should have proposer role on timelock", async function () {
      const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
      expect(await timelock.hasRole(PROPOSER_ROLE, governor.address)).to.be.true;
    });
  });

  // ===== VOTING POWER =====
  describe("Voting Power", function () {
    it("Voter1 should have correct voting power after delegation", async function () {
      expect(await token.getVotes(voter1.address)).to.equal(VOTER1_AMOUNT);
    });

    it("Voter2 should have correct voting power after delegation", async function () {
      expect(await token.getVotes(voter2.address)).to.equal(VOTER2_AMOUNT);
    });

    it("Proposer should have correct voting power after delegation", async function () {
      expect(await token.getVotes(proposer.address)).to.equal(PROPOSER_AMOUNT);
    });

    it("Should have zero voting power without delegation", async function () {
      const Token = await ethers.getContractFactory("SampleToken");
      const newToken = await Token.deploy("T", "T", CAP, INITIAL_SUPPLY);
      await newToken.deployed();
      expect(await newToken.getVotes(owner.address)).to.equal(0);
    });
  });

  // ===== PROPOSE =====
  describe("propose", function () {
    it("Should create a proposal successfully", async function () {
      const { proposalId } = await createProposal();
      expect(proposalId).to.not.be.undefined;
    });

    it("Should emit ProposalCreated event", async function () {
      const targets = [token.address];
      const values = [0];
      const calldatas = [
        token.interface.encodeFunctionData("transfer", [
          voter1.address,
          ethers.utils.parseUnits("100", 18)
        ])
      ];
      await expect(
        governor.connect(proposer).propose(targets, values, calldatas, "Test Proposal")
      ).to.emit(governor, "ProposalCreated");
    });

    it("Should emit ProposalCreatedWithDescription event", async function () {
      const targets = [token.address];
      const values = [0];
      const calldatas = [
        token.interface.encodeFunctionData("transfer", [
          voter1.address,
          ethers.utils.parseUnits("100", 18)
        ])
      ];
      await expect(
        governor.connect(proposer).propose(targets, values, calldatas, "Test Proposal")
      ).to.emit(governor, "ProposalCreatedWithDescription");
    });

    it("Should start in Pending state", async function () {
      const { proposalId } = await createProposal();
      expect(await governor.state(proposalId)).to.equal(0); // 0 = Pending
    });

    it("Should revert if proposer has insufficient tokens", async function () {
      const targets = [token.address];
      const values = [0];
      const calldatas = ["0x"];
      await expect(
        governor.connect(executor).propose(targets, values, calldatas, "Test")
      ).to.be.revertedWith("Governor: proposer votes below proposal threshold");
    });

    it("Should revert if arrays length mismatch", async function () {
      await expect(
        governor.connect(proposer).propose(
          [token.address],
          [0, 0],
          ["0x"],
          "Test"
        )
      ).to.be.revertedWith("Governor: invalid proposal length");
    });
  });

  // ===== VOTING =====
  describe("castVote", function () {
    let proposalId;

    beforeEach(async function () {
      const proposal = await createProposal();
      proposalId = proposal.proposalId;
      // Mine past voting delay
      await mineBlocks(VOTING_DELAY_BLOCKS + 1);
    });

    it("Should be in Active state after voting delay", async function () {
      expect(await governor.state(proposalId)).to.equal(1); // 1 = Active
    });

    it("Should cast a For vote successfully", async function () {
      await expect(governor.connect(voter1).castVote(proposalId, 1))
        .to.emit(governor, "VoteCast");
    });

    it("Should cast an Against vote successfully", async function () {
      await expect(governor.connect(voter1).castVote(proposalId, 0))
        .to.emit(governor, "VoteCast");
    });

    it("Should cast an Abstain vote successfully", async function () {
      await expect(governor.connect(voter1).castVote(proposalId, 2))
        .to.emit(governor, "VoteCast");
    });

    it("Should emit GovernorVoteCast event", async function () {
      await expect(governor.connect(voter1).castVote(proposalId, 1))
        .to.emit(governor, "GovernorVoteCast")
        .withArgs(voter1.address, proposalId, 1, VOTER1_AMOUNT);
    });

    it("Should track hasVoted correctly", async function () {
      expect(await governor.hasVoted(proposalId, voter1.address)).to.be.false;
      await governor.connect(voter1).castVote(proposalId, 1);
      expect(await governor.hasVoted(proposalId, voter1.address)).to.be.true;
    });

    it("Should revert if voting twice", async function () {
      await governor.connect(voter1).castVote(proposalId, 1);
      await expect(
        governor.connect(voter1).castVote(proposalId, 1)
      ).to.be.revertedWith("GovernorVotingSimple: vote already cast");
    });

    it("Should revert if voting before delay", async function () {
      const proposal = await createProposal("Fresh Proposal");
      await expect(
        governor.connect(voter1).castVote(proposal.proposalId, 1)
      ).to.be.revertedWith("Governor: vote not currently active");
    });

    it("Should cast vote with reason", async function () {
        await expect(
            governor.connect(voter1).castVoteWithReason(proposalId, 1, "I support this")
        ).to.emit(governor, "VoteCast");
    });
  });

  // ===== PROPOSAL STATES =====
  describe("Proposal States", function () {
    it("Should move from Pending to Active after voting delay", async function () {
      const { proposalId } = await createProposal();
      expect(await governor.state(proposalId)).to.equal(0); // Pending
      await mineBlocks(VOTING_DELAY_BLOCKS + 1);
      expect(await governor.state(proposalId)).to.equal(1); // Active
    });

    it("Should move to Defeated if quorum not reached", async function () {
        const { proposalId } = await createProposal();
        await mineBlocks(VOTING_DELAY_BLOCKS + 1);
        // Nobody votes — quorum not reached
        await mineBlocks(VOTING_PERIOD_BLOCKS + 1);
        expect(await governor.state(proposalId)).to.equal(3); // Defeated
    });

    it("Should move to Defeated if against votes win", async function () {
      const { proposalId } = await createProposal();
      await mineBlocks(VOTING_DELAY_BLOCKS + 1);
      await governor.connect(voter1).castVote(proposalId, 0); // Against
      await governor.connect(voter2).castVote(proposalId, 1); // For — less votes
      await mineBlocks(VOTING_PERIOD_BLOCKS + 1);
      expect(await governor.state(proposalId)).to.equal(3); // Defeated
    });

    it("Should move to Succeeded if quorum reached and for votes win", async function () {
      const { proposalId } = await createProposal();
      await mineBlocks(VOTING_DELAY_BLOCKS + 1);
      await governor.connect(voter1).castVote(proposalId, 1); // For — 50k tokens
      await mineBlocks(VOTING_PERIOD_BLOCKS + 1);
      expect(await governor.state(proposalId)).to.equal(4); // Succeeded
    });
  });

  // ===== QUEUE AND EXECUTE =====
  describe("Queue and Execute", function () {
    let proposalId;
    let targets;
    let values;
    let calldatas;
    let description;
    let descriptionHash;

    beforeEach(async function () {
      description = "Proposal #1: Queue and Execute Test";
      descriptionHash = ethers.utils.id(description);

      // Mint tokens to timelock so it can transfer
      const MINTER_ROLE = await token.MINTER_ROLE();
      await token.connect(owner).grantRole(MINTER_ROLE, owner.address);
      await token.connect(owner).mint(
        timelock.address,
        ethers.utils.parseUnits("1000", 18)
      );

      targets = [token.address];
      values = [0];
      calldatas = [
        token.interface.encodeFunctionData("transfer", [
          voter2.address,
          ethers.utils.parseUnits("100", 18)
        ])
      ];

      // Propose
      const tx = await governor.connect(proposer).propose(
        targets, values, calldatas, description
      );
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "ProposalCreated");
      proposalId = event.args.proposalId;

      // Wait for voting delay
      await mineBlocks(VOTING_DELAY_BLOCKS + 1);

      // Vote — voter1 has 50k tokens, well above 4% quorum
      await governor.connect(voter1).castVote(proposalId, 1);

      // Wait for voting period to end
      await mineBlocks(VOTING_PERIOD_BLOCKS + 1);
    });

    it("Should be in Succeeded state before queue", async function () {
      expect(await governor.state(proposalId)).to.equal(4); // Succeeded
    });

    it("Should queue a successful proposal", async function () {
      await expect(
        governor.queue(targets, values, calldatas, descriptionHash)
      ).to.emit(governor, "ProposalQueued");
    });

    it("Should be in Queued state after queue", async function () {
      await governor.queue(targets, values, calldatas, descriptionHash);
      expect(await governor.state(proposalId)).to.equal(5); // Queued
    });

    it("Should revert queue if proposal not succeeded", async function () {
      const { proposalId: newId, targets: t, values: v, calldatas: c } = await createProposal("Fresh");
      const hash = ethers.utils.id("Fresh");
      await expect(
        governor.queue(t, v, c, hash)
      ).to.be.revertedWith("Governor: proposal not successful");
    });

    it("Should execute after timelock delay", async function () {
      await governor.queue(targets, values, calldatas, descriptionHash);
      await increaseTimeAndMine(TIMELOCK_DELAY + 1);
      await expect(
        governor.execute(targets, values, calldatas, descriptionHash)
      ).to.emit(governor, "ProposalExecuted");
    });

    it("Should emit ProposalExecutedWithId event", async function () {
      await governor.queue(targets, values, calldatas, descriptionHash);
      await increaseTimeAndMine(TIMELOCK_DELAY + 1);
      await expect(
        governor.execute(targets, values, calldatas, descriptionHash)
      ).to.emit(governor, "ProposalExecutedWithId");
    });

    it("Should be in Executed state after execution", async function () {
      await governor.queue(targets, values, calldatas, descriptionHash);
      await increaseTimeAndMine(TIMELOCK_DELAY + 1);
      await governor.execute(targets, values, calldatas, descriptionHash);
      expect(await governor.state(proposalId)).to.equal(7); // Executed
    });

    it("Should revert execute before timelock delay", async function () {
      await governor.queue(targets, values, calldatas, descriptionHash);
      await expect(
        governor.execute(targets, values, calldatas, descriptionHash)
      ).to.be.revertedWith("TimelockController: operation is not ready");
    });

    it("Should actually transfer tokens on execution", async function () {
      const balanceBefore = await token.balanceOf(voter2.address);
      await governor.queue(targets, values, calldatas, descriptionHash);
      await increaseTimeAndMine(TIMELOCK_DELAY + 1);
      await governor.execute(targets, values, calldatas, descriptionHash);
      const balanceAfter = await token.balanceOf(voter2.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(
        ethers.utils.parseUnits("100", 18)
      );
    });
  });

  // ===== CANCEL =====
  describe("cancel", function () {
    it("Should cancel a pending proposal", async function () {
      const { proposalId, targets, values, calldatas, description } = await createProposal();
      const descriptionHash = ethers.utils.id(description);
      await expect(
        governor.connect(proposer).cancel(targets, values, calldatas, descriptionHash)
      ).to.emit(governor, "ProposalCanceled");
    });

    it("Should emit ProposalCanceledWithId event", async function () {
      const { proposalId, targets, values, calldatas, description } = await createProposal();
      const descriptionHash = ethers.utils.id(description);
      await expect(
        governor.connect(proposer).cancel(targets, values, calldatas, descriptionHash)
      ).to.emit(governor, "ProposalCanceledWithId");
    });

    it("Should be in Canceled state after cancel", async function () {
      const { proposalId, targets, values, calldatas, description } = await createProposal();
      const descriptionHash = ethers.utils.id(description);
      await governor.connect(proposer).cancel(targets, values, calldatas, descriptionHash);
      expect(await governor.state(proposalId)).to.equal(2); // Canceled
    });
  });

  // ===== FULL LIFECYCLE =====
  describe("Full Governance Lifecycle", function () {
    it("Should complete the full propose → vote → queue → execute lifecycle", async function () {
      // Mint tokens to timelock for execution
      await token.connect(owner).mint(
        timelock.address,
        ethers.utils.parseUnits("1000", 18)
      );

      const description = "Full Lifecycle Test Proposal";
      const descriptionHash = ethers.utils.id(description);
      const targets = [token.address];
      const values = [0];
      const calldatas = [
        token.interface.encodeFunctionData("transfer", [
          voter2.address,
          ethers.utils.parseUnits("100", 18)
        ])
      ];

      // 1. Propose
      const tx = await governor.connect(proposer).propose(
        targets, values, calldatas, description
      );
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "ProposalCreated");
      const proposalId = event.args.proposalId;
      expect(await governor.state(proposalId)).to.equal(0); // Pending
      console.log("✅ Proposal created:", proposalId.toString());

      // 2. Wait for voting delay
      await mineBlocks(VOTING_DELAY_BLOCKS + 1);
      expect(await governor.state(proposalId)).to.equal(1); // Active
      console.log("✅ Voting is now Active");

      // 3. Vote
      await governor.connect(voter1).castVote(proposalId, 1); // For
      await governor.connect(voter2).castVote(proposalId, 1); // For
      console.log("✅ Votes cast");

      // 4. Wait for voting period to end
      await mineBlocks(VOTING_PERIOD_BLOCKS + 1);
      expect(await governor.state(proposalId)).to.equal(4); // Succeeded
      console.log("✅ Proposal Succeeded");

      // 5. Queue
      await governor.queue(targets, values, calldatas, descriptionHash);
      expect(await governor.state(proposalId)).to.equal(5); // Queued
      console.log("✅ Proposal Queued in Timelock");

      // 6. Wait for timelock delay
      await increaseTimeAndMine(TIMELOCK_DELAY + 1);

      // 7. Execute
      await governor.execute(targets, values, calldatas, descriptionHash);
      expect(await governor.state(proposalId)).to.equal(7); // Executed
      console.log("✅ Proposal Executed");
    });
  });
});