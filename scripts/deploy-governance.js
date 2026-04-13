const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // ===== DEPLOY SAMPLE TOKEN =====
  console.log("\nDeploying SampleToken...");
  const Token = await hre.ethers.getContractFactory("SampleToken");
  const token = await Token.deploy(
    "Sample Token",
    "STK",
    hre.ethers.utils.parseUnits("1000000", 18),
    hre.ethers.utils.parseUnits("100000", 18)
  );
  await token.deployed();
  console.log("SampleToken deployed to:", token.address);

  // ===== DEPLOY TIMELOCK =====
  console.log("\nDeploying TimelockController...");
  const Timelock = await hre.ethers.getContractFactory("TimelockController");
  const timelock = await Timelock.deploy(
    172800,
    [],
    [],
    deployer.address
  );
  await timelock.deployed();
  console.log("TimelockController deployed to:", timelock.address);

  // ===== DEPLOY GOVERNOR =====
  console.log("\nDeploying TokenGovernance...");
  const Governor = await hre.ethers.getContractFactory("TokenGovernance");
  const governor = await Governor.deploy(
    token.address,
    timelock.address
  );
  await governor.deployed();
  console.log("TokenGovernance deployed to:", governor.address);

  // ===== SET UP TIMELOCK ROLES =====
  console.log("\nSetting up Timelock roles...");
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const TIMELOCK_ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();

  await timelock.grantRole(PROPOSER_ROLE, governor.address);
  console.log("Granted PROPOSER_ROLE to Governor");

  await timelock.grantRole(EXECUTOR_ROLE, hre.ethers.constants.AddressZero);
  console.log("Granted EXECUTOR_ROLE to everyone");

  await timelock.revokeRole(TIMELOCK_ADMIN_ROLE, deployer.address);
  console.log("Revoked TIMELOCK_ADMIN_ROLE from deployer");

  // ===== GRANT MINTER ROLE TO TIMELOCK =====
  console.log("\nGranting MINTER_ROLE to Timelock...");
  const MINTER_ROLE = await token.MINTER_ROLE();
  await token.grantRole(MINTER_ROLE, timelock.address);
  console.log("Granted MINTER_ROLE to Timelock");

  // ===== WAIT FOR CONFIRMATIONS AND VERIFY =====
  const isLiveNetwork = hre.network.name !== "hardhat" && hre.network.name !== "localhost";

  if (isLiveNetwork) {
    console.log("\nWaiting for block confirmations...");
    await governor.deployTransaction.wait(5);

    // ===== VERIFY SAMPLETOKEN =====
    console.log("\nVerifying SampleToken on Etherscan...");
    await hre.run("verify:verify", {
      address: token.address,
      constructorArguments: [
        "Sample Token",
        "STK",
        hre.ethers.utils.parseUnits("1000000", 18),
        hre.ethers.utils.parseUnits("100000", 18)
      ],
    });
    console.log("SampleToken verified!");

    // ===== VERIFY TIMELOCK =====
    console.log("\nVerifying TimelockController on Etherscan...");
    await hre.run("verify:verify", {
      address: timelock.address,
      constructorArguments: [
        172800,
        [],
        [],
        deployer.address
      ],
    });
    console.log("TimelockController verified!");

    // ===== VERIFY GOVERNOR =====
    console.log("\nVerifying TokenGovernance on Etherscan...");
    await hre.run("verify:verify", {
      address: governor.address,
      constructorArguments: [
        token.address,
        timelock.address
      ],
    });
    console.log("TokenGovernance verified!");

  } else {
    console.log("\nLocal network detected — skipping Etherscan verification");
  }

  // ===== SUMMARY =====
  console.log("\n==================== DEPLOYMENT SUMMARY ====================");
  console.log("SampleToken:         ", token.address);
  console.log("TimelockController:  ", timelock.address);
  console.log("TokenGovernance:     ", governor.address);
  console.log("=============================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });