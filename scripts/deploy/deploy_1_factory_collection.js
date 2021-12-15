const { ethers, upgrades } = require("hardhat");

const TransferProxy = "";
const BaseURI = "";


async function deployERC721Collection() {
    const [admin, user1] = await ethers.getSigners();

    const ERC721Collection = await ethers.getContractFactory("ERC721Collection");

    erc721Collection = await ERC721Collection.deploy("Test","TST");
	  await erc721Collection.deployed();
    console.log('ERC721Collection Logic',erc721Collection.address);

    return erc721Collection.address;
}

async function deployCollectionFactory(collectionLogic, transferProxy, baseURI) {
    const [admin, user1] = await ethers.getSigners();

    const CollectionFactory = await ethers.getContractFactory("CollectionFactory");

    collectionFactory = await CollectionFactory.deploy(collectionLogic);
	  await collectionFactory.deployed();
    console.log('CollectionFactory',collectionFactory.address);

    return collectionFactory.address;
}


async function main() {
  const [deployer, user1] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  let collectionLogic = await deployERC721Collection();
  let factory = await deployCollectionFactory(collectionLogic, TransferProxy, BaseURI);
  console.log("factory:", factory);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
