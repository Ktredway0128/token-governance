const hre = require("hardhat");

async function main() {
  console.log("Mining 7,201 blocks to pass voting delay...");
  await hre.network.provider.send("hardhat_mine", ["0x1C21"]); // 7201 in hex
  console.log("✅ Voting delay passed — proposal should now be Active");

  const block = await hre.ethers.provider.getBlock("latest");
  console.log("Current block:", block.number);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });