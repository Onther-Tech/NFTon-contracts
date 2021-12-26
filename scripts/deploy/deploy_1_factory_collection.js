const { ethers, upgrades } = require("hardhat");

const TransferProxy = "0xeE45c2A0b26Ac01179865ed8BbadAC5d246AeDC2";
const BaseURI = "https://gateway.ipfs.io/ipfs/";

/**
 let collectionLog = "0xffA7ABda0f442170e3C41748Ea57AB3bA1f7AcCd"
 let collectionLogic = "0x445cb27B813D625bE40Da24a995f81cAC0323300"
CollectionFactory = 0xd54Aa9bB16754ad8AA4621582cb6CFC6B7a4fa27
 */
async function deployCollectionLog() {
    const [admin, user1] = await ethers.getSigners();

    const CollectionLog = await ethers.getContractFactory("CollectionLog");

    collectionLog = await CollectionLog.deploy();
	  await collectionLog.deployed();
    console.log('CollectionLog ',collectionLog.address);

    return collectionLog.address;
}

async function deployERC721Collection() {
    const [admin, user1] = await ethers.getSigners();

    const ERC721Collection = await ethers.getContractFactory("ERC721Collection");

    erc721Collection = await ERC721Collection.deploy("Test","TST");
	  await erc721Collection.deployed();
    console.log('ERC721Collection Logic',erc721Collection.address);

    return erc721Collection.address;
}

async function deployCollectionFactory(collectionLogic, collectionLog) {
    const [admin, user1] = await ethers.getSigners();

    const CollectionFactory = await ethers.getContractFactory("CollectionFactory");

    collectionFactory = await CollectionFactory.deploy(collectionLogic);
	  let tx = await collectionFactory.deployed();
    console.log('CollectionFactory',collectionFactory.address);

    console.log('collectionFactory.deployed tx ',tx.deployTransaction.hash);
    //await tx.wait();


    tx = await collectionFactory.setLog(collectionLog);

    console.log('collectionFactory.setLog tx ',tx);
    await tx.wait();

    return collectionFactory.address;
}


async function main() {
  const [deployer, user1] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());


  //let collectionLog = await deployCollectionLog();
  let collectionLog = "0xffA7ABda0f442170e3C41748Ea57AB3bA1f7AcCd"

  //let collectionLogic = await deployERC721Collection();
  // 0x37eB3cf2DFED71d328104011B3b765e9085A0b56
  let collectionLogic = "0x445cb27B813D625bE40Da24a995f81cAC0323300"


  //let factory = await deployCollectionFactory(collectionLogic, collectionLog );
  //0x4Ff21ED730DEe38478264A4c64336eF3049644E7
  // console.log("factory:", factory);
  //0xd54Aa9bB16754ad8AA4621582cb6CFC6B7a4fa27

}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
