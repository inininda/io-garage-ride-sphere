const { ethers, upgrades } = require("hardhat");

// To deploy the proxy contract and implementation contract run the following:
// yarn hardhat run --network goerli scripts/deploy.js

// To verify the implementation contract, run the following:
// yarn hardhat verify --network goerli <implementation contract address>
async function main() {
  [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // =========== Non-Proxy Deployment
  const garage = await ethers.getContractFactory("IOGarage");
  const garageContract = await garage.deploy("IOGarage", "IOGarage");
  await garageContract.deployed();

  console.log("garageContract deployed to:", garageContract.address);

  const rides = await ethers.getContractFactory(
    "contracts/IORides.sol:IORides"
  );
  const ridesContract = await rides.deploy("IORides", "IORides");
  await ridesContract.deployed();

  console.log("ridesContract deployed to:", ridesContract.address);

  // =========== Proxy Deployment

  const spheres = await ethers.getContractFactory(
    "contracts/IOSpheres.sol:IOSpheres"
  );
  const spheresContract = await upgrades.deployProxy(
    spheres,
    ["IOSpheres", "IOSpheres"],
    { kind: "uups" }
  );
  await spheresContract.deployed();

  console.log("spheresContract deployed to:", spheresContract.address);

  // const MyToken = await ethers.getContractFactory("MyToken");
  // const Proxy = await upgrades.deployProxy(MyToken, { kind: "uups" });
  // await Proxy.deployed();
  // console.log("Proxy deployed to:", Proxy.address);
}

main();
