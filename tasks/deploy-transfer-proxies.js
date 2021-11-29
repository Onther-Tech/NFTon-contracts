const { findAccount } = require("./utils");
const { expect } = require("chai");

task("rinkeby-deploy-transfer-proxy", "").setAction(async() =>{
    const { RINKEBY_DEPLOYER_ACCOUNT: account } = process.env;
    const deployer = await findAccount(account);

    const TransferProxyContract = await ethers.getContractFactory("TransferProxyTest");
    transferProxy = await TransferProxyContract.connect(deployer).deploy();
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
