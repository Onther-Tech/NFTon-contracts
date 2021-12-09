const { findAccount } = require("./utils");
const { expect } = require("chai");

task("rinkeby-deploy-erc721", "").setAction(async() =>{
    const { RINKEBY_DEPLOYER_ACCOUNT: account } = process.env;
    const deployer = await findAccount(account);

    const ERC721NFTonContract = await ethers.getContractFactory("ERC721NFTon");
    const ERC721NFTonMinimalContract = await ethers.getContractFactory("ERC721NFTonMinimal");
    const transferProxy = "0x12ba18D747E4Edf7970c41D0bbBF4cF99b2a4C50";
    const erc721LazyMintTransferProxy = "0x8C43f7CDf0C69dBaB1deCee6F4FDad076b2fF595";
    expect(transferProxy.length).to.be.greaterThan(0);
    expect(erc721LazyMintTransferProxy.length).to.be.greaterThan(0);
    

    const arguments = [
        "NFTon",
        "NTN",
        "ipfs:/",
        "",
        transferProxy,
        erc721LazyMintTransferProxy
    ];

    const ERC721NFTon = await upgrades.deployProxy(
        ERC721NFTonContract, 
        arguments,
        { deployer, initializer: '__ERC721NFTon_init' }
    );
    await ERC721NFTon.connect(deployer).deployed();


    const ERC721NFTonAddress = ERC721NFTon.address;
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(ERC721NFTonAddress);

    console.log({ ERC721NFTonAddress, implementationAddress });

    await run("verify", {
        address: implementationAddress,
        constructorArgsParams: [], // arguments,
    });
    await run("verify", {
        address: ERC721NFTonAddress,
        constructorArgsParams: arguments, // arguments,
    });
});

