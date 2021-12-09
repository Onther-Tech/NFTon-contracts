const { findAccount } = require("./utils");
const { expect } = require("chai");
/*
Rinkeby:
LazyMint er721 transfer proxy: 0x8C43f7CDf0C69dBaB1deCee6F4FDad076b2fF595
Transfer proxy 0x12ba18D747E4Edf7970c41D0bbBF4cF99b2a4C50
*/
task("rinkeby-deploy-lazy-mint-erc721-transfer-proxy", "").setAction(async() =>{
    const { RINKEBY_DEPLOYER_ACCOUNT: account } = process.env;
    const deployer = await findAccount(account);

    const TransferProxyContract = await ethers.getContractFactory("ERC721LazyMintTransferProxy");
    transferProxy = await TransferProxyContract.connect(deployer).deploy();
    await transferProxy.deployed();
    await (await transferProxy.connect(deployer).__OperatorRole_init()).wait();
    
    const lazyMintTransferProxyAddress = transferProxy.address;
    console.log({ lazyMintTransferProxyAddress });
    await run("verify", {
        address: lazyMintTransferProxyAddress,
        constructorArgsParams: [],
    });
})

task("rinkeby-deploy-transfer-proxy", "").setAction(async() =>{
    const { RINKEBY_DEPLOYER_ACCOUNT: account } = process.env;
    const deployer = await findAccount(account);

    const TransferProxyContract = await ethers.getContractFactory("TransferProxyTest");
    transferProxy = await TransferProxyContract.connect(deployer).deploy();
    // await (await transferProxy.connect(deployer).__TransferProxy_init()).wait();
    await transferProxy.deployed();
    const transferProxyAddress = transferProxy.address;
    console.log({ transferProxyAddress });
    await run("verify", {
        address: transferProxyAddress,
        constructorArgsParams: [],
    });
})

task("rinkeby-deploy-erc20-transfer-proxy", "").setAction(async() =>{
    const { RINKEBY_DEPLOYER_ACCOUNT: account } = process.env;
    const deployer = await findAccount(account);

    const ERC20TransferProxyContract = await ethers.getContractFactory("ERC20TransferProxyTest");
    erc20TransferProxy = await ERC20TransferProxyContract.connect(deployer).deploy();
    await erc20TransferProxy.deployed();
    const erc20TransferProxyAddress = erc20TransferProxy.address;
    console.log({ erc20TransferProxyAddress });
    await run("verify", {
        address: erc20TransferProxyAddress,
        constructorArgsParams: [],
    });
});
