const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const TOKEN_ADDRESS    = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const TIMELOCK_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const Token = await hre.ethers.getContractAt("SampleToken", TOKEN_ADDRESS);

  const tx = await Token.transfer(
    TIMELOCK_ADDRESS,
    hre.ethers.utils.parseUnits("100", 18)
  );
  await tx.wait();
  console.log("✅ Funded timelock with 100 STK");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });