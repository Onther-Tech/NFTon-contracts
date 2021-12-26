const { ethers, upgrades } = require("hardhat");

const TransferProxy = "0xeE45c2A0b26Ac01179865ed8BbadAC5d246AeDC2";
const BaseURI = "https://gateway.ipfs.io/ipfs/";


/**
 let collectionLog = "0xffA7ABda0f442170e3C41748Ea57AB3bA1f7AcCd"

 NFTonMarketNFT_Logic = "0x94a12F7e13BD73A0aC771cD8c6bbE19017Ba4057"

 NFTonMarketNFT = "0xa3c45C6e110b4d127a2D7000ba5EB3B30290EDB7"
 */

async function deployPublicCollection() {
    const [admin, user1] = await ethers.getSigners();

    const ERC721Public = await ethers.getContractFactory("ERC721Public");

    erc721Public = await ERC721Public.deploy("NFTon Market","NOM");
	  await erc721Public.deployed();
    console.log('ERC721Public', erc721Public.address);

    return erc721Public.address;
}


async function deployERC721Proxy() {
    const [admin, user1] = await ethers.getSigners();

    const ERC721Proxy = await ethers.getContractFactory("ERC721Proxy");

    erc721Proxy = await ERC721Proxy.deploy("NFTon Market","NOM");
	  await erc721Proxy.deployed();
    console.log('ERC721Proxy', erc721Proxy.address);

    return erc721Proxy.address;
}

async function main() {
  const [deployer, user1] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // let NFTonMarketNFT_Logic = await deployPublicCollection();

  // console.log("NFTonMarketNFT_Logic:", NFTonMarketNFT_Logic);

  let NFTonMarketNFT = await deployERC721Proxy();

  console.log("NFTonMarketNFT:", NFTonMarketNFT);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
