const hre = require("hardhat");

async function main() {
  console.log("deploying...");
  const FlashLoan = await hre.ethers.getContractFactory("FlashLoan");
  const flashLoan = await FlashLoan.deploy(
    //   PoolAddressesProvider-Aave https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses
    "0xC911B590248d127aD18546B186cC6B324e99F02c"
    );
  await flashLoan.deployed();

  console.log("Flash loan contract deployed: ", flashLoan.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
