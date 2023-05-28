const { ethers, upgrades } = require("hardhat");

// To upgrade the implementation contract run the following:
// yarn hardhat run --network goerli scripts/upgrade.js

// To verify the implementation contract, run the following:
// yarn hardhat verify --network goerli <implementation contract address>
async function main() {
  [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const IOSpheres = await ethers.getContractFactory(
    "contracts/IOSpheres.sol:IOSpheres"
  );

  // IMPORTANT! Upgrade proxy with the proxy contract address
  const upgraded = await upgrades.upgradeProxy(
    "0x113D172a41E55615C2F222e75722a17eEABD6BCF",
    IOSpheres
  );

  console.log("Upgraded implementation contract to:", upgraded.address);
}

main();
