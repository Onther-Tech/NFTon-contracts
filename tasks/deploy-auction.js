const { findAccount } = require("./utils");
const { expect } = require("chai");

task("rinkeby-deploy-auction-house", "").setAction(async() =>{
    const { RINKEBY_DEPLOYER_ACCOUNT: account } = process.env;
    const deployer = await findAccount(account);

    const transferProxyAddress = "0xCEd6e1030358B3b9d66C87Fa7344Cf3D0B68321c";
    const erc20TransferProxyAddress = "0xBDb8E474a3261c72F132DcAd151853FB676CA5c5";
    const fee = "0";
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

    const AuctionHouseContract = await ethers.getContractFactory("AuctionHouse");
    const auctionHouse = await upgrades.deployProxy(AuctionHouseContract,
        arguments,
        { initializer: "__AuctionHouse_init" }
    );
    await auctionHouse.connect(deployer).deployed();


    const auctionHouseAddress = auctionHouse.address;
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(auctionHouseAddress);

    console.log({ auctionHouseAddress, implementationAddress });
    
    await run("verify", {
        address: implementationAddress,
        constructorArgsParams: [], // arguments,
    });

    await run("verify", {
        address: auctionHouseAddress,
        constructorArgsParams: arguments, // arguments,
    });
})
