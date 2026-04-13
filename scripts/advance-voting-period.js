const hre = require("hardhat");

async function main() {
  console.log("Mining 50,401 blocks to end voting period...");
  await hre.network.provider.send("hardhat_mine", ["0xC511"]); // 50,449 in hex
  console.log("✅ Voting period ended — proposal should now be Succeeded or Defeated");

  const block = await hre.ethers.provider.getBlock("latest");
  console.log("Current block:", block.number);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });