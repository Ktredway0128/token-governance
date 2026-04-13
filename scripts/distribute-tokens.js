// scripts/distribute-tokens.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const Token = await hre.ethers.getContractAt("SampleToken", TOKEN_ADDRESS);

  // Hardhat test accounts #1, #2, #3
  const recipients = [
    { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount: "10000" }, // Account #1
    { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", amount: "5000" },  // Account #2
    { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", amount: "500" },   // Account #3 — below threshold
  ];

  for (const recipient of recipients) {
    const tx = await Token.transfer(
      recipient.address,
      hre.ethers.utils.parseUnits(recipient.amount, 18)
    );
    await tx.wait();
    console.log(`✅ Sent ${recipient.amount} STK to ${recipient.address}`);
  }

  console.log("\nDistribution complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });