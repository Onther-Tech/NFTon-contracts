const { findAccount } = require("./utils");
const { expect } = require("chai");

task("rinkeby-deploy-exchange", "").setAction(async() =>{
    const { RINKEBY_DEPLOYER_ACCOUNT: account } = process.env;
    const deployer = await findAccount(account);

    const transferProxyAddress = "0xCEd6e1030358B3b9d66C87Fa7344Cf3D0B68321c";
    const erc20TransferProxyAddress = "0xBDb8E474a3261c72F132DcAd151853FB676CA5c5";
    const fee = "300";
    const communityAddress = "0xc3191873368e7E81a8E2B90BeD627F93810607d4";
    const royaltiesRegistryAddress = "0xc3191873368e7E81a8E2B90BeD627F93810607d4";

    expect(transferProxyAddress.length).greaterThan(0);
    expect(erc20TransferProxyAddress.length).greaterThan(0);
    expect(communityAddress.length).greaterThan(0);
    expect(royaltiesRegistryAddress.length).greaterThan(0);

    const arguments = [
        transferProxyAddress,
        erc20TransferProxyAddress,
        fee,
        communityAddress,
        royaltiesRegistryAddress
    ];

    const ExchangeContract = await ethers.getContractFactory("Exchange");
    const exchange = await upgrades.deployProxy(ExchangeContract,
        arguments,
        { initializer: "__ExchangeV2_init" }
    );
    await exchange.connect(deployer).deployed();


    const exchangeAddress = exchange.address;
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(exchangeAddress);

    console.log({ exchangeAddress, implementationAddress });

    await run("verify", {
        address: implementationAddress,
        constructorArgsParams: [], // arguments,
    });
})


task("rinkeby-verify-exchange", "").setAction(async() =>{
    const transferProxyAddress = "0xCEd6e1030358B3b9d66C87Fa7344Cf3D0B68321c";
    const erc20TransferProxyAddress = "0xBDb8E474a3261c72F132DcAd151853FB676CA5c5";
    const fee = "300";
    const communityAddress = "0xc3191873368e7E81a8E2B90BeD627F93810607d4";
    const royaltiesRegistryAddress = "0xc3191873368e7E81a8E2B90BeD627F93810607d4";

    const arguments = [
        transferProxyAddress,
        erc20TransferProxyAddress,
        fee,
        communityAddress,
        royaltiesRegistryAddress
    ];
    const exchangeAddress = "0x98180a1c6E739465441e8F8986D68978F1a42F8d";
    await run("verify", {
        address: exchangeAddress,
        constructorArgsParams: arguments,
    });
});
