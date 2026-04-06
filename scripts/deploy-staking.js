const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const STAKING_TOKEN = "0x036150039c33b1645080a9c913f96D4c65ccca48";
  const REWARD_TOKEN  = "0x036150039c33b1645080a9c913f96D4c65ccca48";
  const ADMIN         = deployer.address;

  const TokenStaking = await hre.ethers.getContractFactory("TokenStaking");
  const staking = await TokenStaking.deploy(
    STAKING_TOKEN,
    REWARD_TOKEN,
    ADMIN
  );

  await staking.deployed();
  console.log("TokenStaking deployed to:", staking.address);

  // Wait for block confirmations before verifying
  console.log("Waiting for block confirmations...");
  await staking.deployTransaction.wait(5);

  // Verify on Etherscan
  console.log("Verifying contract on Etherscan...");
  await hre.run("verify:verify", {
    address: staking.address,
    constructorArguments: [
      STAKING_TOKEN,
      REWARD_TOKEN,
      ADMIN
    ],
  });

  console.log("Contract verified!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


// const hre = require("hardhat");

// async function main() {
//   const [deployer] = await hre.ethers.getSigners();
//   console.log("Deploying with account:", deployer.address);

//   // Deploy mock token
//   const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
//   const mockToken = await ERC20Mock.deploy(
//     "Sample Token",
//     "STK",
//     hre.ethers.utils.parseUnits("1000000", 18)
//   );
//   await mockToken.deployed();
//   console.log("MockToken deployed to:", mockToken.address);

//   // Deploy staking contract
//   const TokenStaking = await hre.ethers.getContractFactory("TokenStaking");
//   const staking = await TokenStaking.deploy(
//     mockToken.address,
//     mockToken.address,
//     deployer.address
//   );
//   await staking.deployed();
//   console.log("TokenStaking deployed to:", staking.address);
//   console.log("MockToken address for dashboard testing:", mockToken.address);
// }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });