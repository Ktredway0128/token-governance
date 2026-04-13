const hre = require("hardhat");

async function main() {
  console.log("Fast forwarding 2 days for timelock delay...");
  await hre.network.provider.send("evm_increaseTime", [172801]); // 2 days + 1 second
  await hre.network.provider.send("evm_mine");
  console.log("✅ Timelock delay passed — proposal can now be executed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });