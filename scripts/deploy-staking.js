const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Replace with your deployed STK token address
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });