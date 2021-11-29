const { findAccount } = require("./utils");
const { expect } = require("chai");

task("rinkeby-deploy-erc20-token-1", "").setAction(async() =>{
    const { RINKEBY_DEPLOYER_ACCOUNT: account } = process.env;
    const deployer = await findAccount(account);

    const ERC20TestContract = await ethers.getContractFactory("TestERC20");
    const name = "T1";
    const symbol = "S1";
    t1 = await ERC20TestContract.connect(deployer).deploy(name, symbol);
    await t1.deployed();

    const t1Address = t1.address;
    console.log({ t1Address });

    await run("verify", {
        address: t1Address,
        constructorArgsParams: [name, symbol], // arguments,
    });
});


task("rinkeby-deploy-erc20-token-2", "").setAction(async() =>{
    const { RINKEBY_DEPLOYER_ACCOUNT: account } = process.env;
    const deployer = await findAccount(account);

    const ERC20TestContract = await ethers.getContractFactory("TestERC20");
    const name = "T2";
    const symbol = "S2";
    t2 = await ERC20TestContract.connect(deployer).deploy(name, symbol);
    await t2.deployed();

    await run("verify", {
        address: t2Address,
        constructorArgsParams: [name, symbol], // arguments,
    });
});
