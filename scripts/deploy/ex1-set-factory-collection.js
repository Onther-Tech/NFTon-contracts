const { ethers, upgrades } = require("hardhat");

const TransferProxy = "0xeE45c2A0b26Ac01179865ed8BbadAC5d246AeDC2";
const BaseURI = "https://gateway.ipfs.io/ipfs/";

const ERC721CollectionAddress = "0x37eB3cf2DFED71d328104011B3b765e9085A0b56";
const CollectionFactoryAddress = "0x4Ff21ED730DEe38478264A4c64336eF3049644E7";

async function setCollectionFactory() {
    const [admin, user1] = await ethers.getSigners();

    const CollectionFactory = await ethers.getContractAt("CollectionFactory", CollectionFactoryAddress);

	// let tx = await CollectionFactory.setImplementation(ERC721CollectionAddress);
    // console.log('tx',tx);

    let _imp  = await CollectionFactory._implementation();
    console.log('_imp',_imp);


    return null;
}


async function main() {
  const [deployer, user1] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

    await setCollectionFactory();

}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });